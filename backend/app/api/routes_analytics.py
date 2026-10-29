from fastapi import APIRouter, Response, HTTPException, Body
from typing import Dict, Any, List, Optional
import io
import csv
import copy
from ..models.schemas import (
    ScenarioType, OperatingMode, EvaluationComparison, DirectionMetric
)
from ..core.database import (
    save_simulation_session, list_simulation_sessions,
    get_simulation_session_detail, save_evaluation_run, list_evaluation_runs
)

def create_analytics_router(sim_engine):
    router = APIRouter(prefix="/api", tags=["Analytics & Evaluation"])

    @router.get("/analytics")
    def get_analytics():
        metrics = sim_engine.get_evaluation_metrics()
        state = sim_engine.get_state()

        # Vehicle class distribution
        veh_distribution = {"car": 0, "bus": 0, "truck": 0, "motorcycle": 0}
        for q in sim_engine.queues.values():
            for v in q:
                if v.v_type in veh_distribution:
                    veh_distribution[v.v_type] += 1

        # Decisions history summary
        recent_decisions = []
        for d in sim_engine.decision_history[-15:]:
            recent_decisions.append({
                "cycle_id": d.cycle_id,
                "timestamp": round(d.timestamp, 1),
                "selected_direction": d.selected_direction.value,
                "green_duration_sec": d.green_duration_sec,
                "starvation_triggered": d.starvation_triggered,
                "dominant_factor": d.dominant_factor,
                "reason": d.reason
            })

        # Direction wait distribution
        dir_breakdown = {}
        for d_str, d_metric in metrics["direction_metrics"].items():
            dir_breakdown[d_str] = {
                "avg_wait": d_metric.avg_wait_sec,
                "max_wait": d_metric.max_wait_sec,
                "processed": d_metric.total_processed,
                "max_queue": d_metric.max_queue_m
            }

        return {
            "metrics": metrics,
            "vehicle_distribution": veh_distribution,
            "recent_decisions": recent_decisions,
            "direction_breakdown": dir_breakdown,
            "elapsed_time_sec": state.elapsed_time_sec,
            "cycles": state.cycle_count
        }

    @router.get("/evaluation", response_model=EvaluationComparison)
    def get_evaluation_comparison():
        """Computes side-by-side performance comparison between Adaptive AI and Fixed-Time baseline."""
        current_metrics = sim_engine.get_evaluation_metrics()

        # Generate a synchronized comparison using identical scenario parameters
        from ..engine.simulation_engine import IntersectionSimulation
        from ..models.schemas import SimulationSettings

        # Run a cloned fixed-time simulation with identical scenario
        fixed_sim = IntersectionSimulation(settings=sim_engine.settings)
        fixed_sim.mode = OperatingMode.FIXED_TIME
        fixed_sim.load_scenario(sim_engine.scenario)

        # Simulate matching elapsed time
        sim_target_time = max(60.0, sim_engine.sim_time)
        dt = 0.5
        steps = int(sim_target_time / dt)
        for _ in range(steps):
            fixed_sim.step(dt)

        fixed_metrics = fixed_sim.get_evaluation_metrics()

        # If current engine was also running in adaptive mode, use current metrics;
        # otherwise run an adaptive twin for fair side-by-side
        if sim_engine.mode == OperatingMode.ADAPTIVE_AI and sim_engine.sim_time >= 30.0:
            adaptive_metrics = current_metrics
        else:
            adapt_sim = IntersectionSimulation(settings=sim_engine.settings)
            adapt_sim.mode = OperatingMode.ADAPTIVE_AI
            adapt_sim.load_scenario(sim_engine.scenario)
            for _ in range(steps):
                adapt_sim.step(dt)
            adaptive_metrics = adapt_sim.get_evaluation_metrics()

        # Calculate percentage improvements with zero-division safety
        improvements: Dict[str, Optional[float]] = {}

        def calc_reduction(base: float, adapt: float) -> Optional[float]:
            if base <= 0:
                return None
            return round(((base - adapt) / base) * 100.0, 1)

        def calc_gain(base: float, adapt: float) -> Optional[float]:
            if base <= 0:
                return None
            return round(((adapt - base) / base) * 100.0, 1)

        improvements["avg_waiting_time"] = calc_reduction(
            fixed_metrics["avg_waiting_time_sec"], adaptive_metrics["avg_waiting_time_sec"]
        )
        improvements["max_waiting_time"] = calc_reduction(
            fixed_metrics["max_waiting_time_sec"], adaptive_metrics["max_waiting_time_sec"]
        )
        improvements["avg_queue_length"] = calc_reduction(
            fixed_metrics["avg_queue_length_m"], adaptive_metrics["avg_queue_length_m"]
        )
        improvements["green_utilization"] = calc_gain(
            fixed_metrics["green_utilization_pct"], adaptive_metrics["green_utilization_pct"]
        )
        improvements["unnecessary_stops"] = calc_reduction(
            fixed_metrics["unnecessary_stops"], adaptive_metrics["unnecessary_stops"]
        )

        wait_imp = improvements["avg_waiting_time"]
        if wait_imp is not None:
            if wait_imp > 0:
                summary = (
                    f"Adaptive AI reduced average vehicle delay by {wait_imp}% compared to Fixed-Time baseline "
                    f"by dynamically allocating green phases to higher-density approaches and eliminating empty green intervals."
                )
            elif wait_imp < 0:
                summary = (
                    f"In this scenario, Fixed-Time performed with {abs(wait_imp)}% lower average wait, demonstrating "
                    f"that under specific uniform traffic conditions, standard cyclic timing can be competitive."
                )
            else:
                summary = "Both Adaptive AI and Fixed-Time achieved comparable waiting times in this scenario."
        else:
            summary = "Baseline traffic was zero or near-zero, resulting in zero-delay baseline."

        return EvaluationComparison(
            scenario=sim_engine.scenario,
            simulation_duration_sec=sim_target_time,
            adaptive_metrics=adaptive_metrics,
            fixed_metrics=fixed_metrics,
            improvements=improvements,
            summary=summary
        )

    @router.post("/history/save")
    def save_current_session(payload: Dict[str, Any] = Body(default={})):
        metrics = sim_engine.get_evaluation_metrics()
        clean_metrics = dict(metrics)
        if "direction_metrics" in clean_metrics:
            clean_metrics["direction_metrics"] = {
                k: (v.dict() if hasattr(v, "dict") else dict(v))
                for k, v in clean_metrics["direction_metrics"].items()
            }
        session_data = {
            "mode": sim_engine.mode.value,
            "scenario": sim_engine.scenario.value,
            "duration_sec": sim_engine.sim_time,
            "total_cycles": sim_engine.cycle_count,
            "total_vehicles_processed": sim_engine.total_vehicles_processed,
            "avg_wait_sec": metrics["avg_waiting_time_sec"],
            "max_wait_sec": metrics["max_waiting_time_sec"],
            "avg_queue_m": metrics["avg_queue_length_m"],
            "max_queue_m": metrics["max_queue_length_m"],
            "green_utilization_pct": metrics["green_utilization_pct"],
            "unnecessary_stops": metrics["unnecessary_stops"],
            "metrics": clean_metrics,
            "decisions": [d.dict() if hasattr(d, "dict") else dict(d) for d in sim_engine.decision_history[-50:]]
        }
        session_id = save_simulation_session(session_data)
        return {"status": "saved", "session_id": session_id}

    @router.get("/history")
    def list_sessions():
        return list_simulation_sessions(limit=50)

    @router.get("/history/{session_id}")
    def get_session(session_id: str):
        detail = get_simulation_session_detail(session_id)
        if not detail:
            raise HTTPException(status_code=404, detail="Session not found")
        return detail

    @router.get("/history/export/csv")
    def export_csv():
        sessions = list_simulation_sessions(limit=200)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Session ID", "Created At", "Mode", "Scenario", "Duration (s)",
            "Cycles", "Vehicles Processed", "Avg Wait (s)", "Max Wait (s)",
            "Green Utilization (%)", "Unnecessary Stops"
        ])
        for s in sessions:
            writer.writerow([
                s.get("id"), s.get("created_at"), s.get("mode"), s.get("scenario"),
                s.get("duration_sec"), s.get("total_cycles"), s.get("total_vehicles_processed"),
                s.get("avg_wait_sec"), s.get("max_wait_sec"), s.get("green_utilization_pct"),
                s.get("unnecessary_stops")
            ])

        response = Response(content=output.getvalue(), media_type="text/csv")
        response.headers["Content-Disposition"] = "attachment; filename=traffic_simulation_evaluation.csv"
        return response

    return router
