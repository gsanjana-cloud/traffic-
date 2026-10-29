from typing import Dict, List, Tuple, Optional
from ..models.schemas import (
    Direction, RoadState, SignalDecision, SimulationSettings,
    RoadFactorBreakdown, RoadFactorContribution
)

class TrafficDecisionEngine:
    """
    Explainable Multi-Factor Adaptive Traffic Signal Decision Engine.
    
    Evaluates demand across four intersection approaches (North, South, East, West)
    using 4 normalized factors:
      1. Vehicle Count (W1)
      2. Queue Length in meters (W2)
      3. Accumulated / Maximum Waiting Time (W3)
      4. Vehicle-Type Passenger Car Units (PCU) (W4)
      
    Features an explicit Starvation Prevention Safeguard:
      If any road's waiting time exceeds starvation_threshold_sec, that road
      is guaranteed priority to prevent indefinite blockage by busier approaches.
    """

    # Reference scaling constants for normalization to [0, 100]
    REF_MAX_VEHICLES = 30.0
    REF_MAX_QUEUE_M = 160.0
    REF_MAX_PCU = 40.0

    @classmethod
    def compute_pcu(cls, counts, pcu_weights) -> float:
        return (
            counts.cars * pcu_weights.car +
            counts.buses * pcu_weights.bus +
            counts.trucks * pcu_weights.truck +
            counts.motorcycles * pcu_weights.motorcycle
        )

    @classmethod
    def estimate_queue_length_meters(cls, counts) -> float:
        # Standard average vehicle lengths with safety gap (meters)
        # Car: 5m + 1.2m gap = 6.2m
        # Bus: 11.5m + 1.5m gap = 13.0m
        # Truck: 12.0m + 2.0m gap = 14.0m
        # Motorcycle: 2.2m + 0.6m gap = 2.8m (can lane split 2 across)
        return (
            counts.cars * 6.2 +
            counts.buses * 13.0 +
            counts.trucks * 14.0 +
            (counts.motorcycles * 2.8) * 0.5
        )

    @classmethod
    def calculate_road_score(
        cls,
        road: RoadState,
        settings: SimulationSettings
    ) -> Tuple[float, RoadFactorBreakdown]:
        counts = road.counts
        v_count = float(counts.total)
        q_len = road.queue_length_meters
        wait_time = max(road.max_vehicle_wait_sec, road.accumulated_wait_sec / max(1.0, v_count))
        pcu_val = road.pcu_total

        # Weights normalization to guarantee sum == 1.0
        w_cfg = settings.weights
        total_w = (w_cfg.w1_vehicle_count + w_cfg.w2_queue_length +
                   w_cfg.w3_waiting_time + w_cfg.w4_vehicle_type)
        if total_w <= 0:
            total_w = 1.0

        w1 = w_cfg.w1_vehicle_count / total_w
        w2 = w_cfg.w2_queue_length / total_w
        w3 = w_cfg.w3_waiting_time / total_w
        w4 = w_cfg.w4_vehicle_type / total_w

        # Normalization to [0, 100]
        v_norm = min(100.0, (v_count / cls.REF_MAX_VEHICLES) * 100.0)
        q_norm = min(100.0, (q_len / cls.REF_MAX_QUEUE_M) * 100.0)
        w_thresh = max(10.0, settings.starvation_threshold_sec)
        w_norm = min(100.0, (wait_time / w_thresh) * 100.0)
        pcu_norm = min(100.0, (pcu_val / cls.REF_MAX_PCU) * 100.0)

        # Factor contributions
        fc_v = RoadFactorContribution(
            raw_value=v_count,
            normalized_value=round(v_norm, 2),
            weight=round(w1, 3),
            weighted_score=round(v_norm * w1, 2)
        )
        fc_q = RoadFactorContribution(
            raw_value=round(q_len, 1),
            normalized_value=round(q_norm, 2),
            weight=round(w2, 3),
            weighted_score=round(q_norm * w2, 2)
        )
        fc_w = RoadFactorContribution(
            raw_value=round(wait_time, 1),
            normalized_value=round(w_norm, 2),
            weight=round(w3, 3),
            weighted_score=round(w_norm * w3, 2)
        )
        fc_pcu = RoadFactorContribution(
            raw_value=round(pcu_val, 1),
            normalized_value=round(pcu_norm, 2),
            weight=round(w4, 3),
            weighted_score=round(pcu_norm * w4, 2)
        )

        composite = fc_v.weighted_score + fc_q.weighted_score + fc_w.weighted_score + fc_pcu.weighted_score
        breakdown = RoadFactorBreakdown(
            vehicle_count=fc_v,
            queue_length=fc_q,
            waiting_time=fc_w,
            pcu_weight=fc_pcu,
            composite_score=round(composite, 2)
        )
        return composite, breakdown

    @classmethod
    def evaluate_all(
        cls,
        roads: Dict[str, RoadState],
        settings: SimulationSettings,
        cycle_id: int,
        timestamp: float,
        last_direction: Optional[Direction] = None
    ) -> SignalDecision:
        scores: Dict[str, float] = {}
        breakdowns: Dict[str, RoadFactorBreakdown] = {}

        # 1. Compute scores and breakdowns for all directions
        for d_str, road in roads.items():
            score, bd = cls.calculate_road_score(road, settings)
            scores[d_str] = round(score, 2)
            breakdowns[d_str] = bd

        # 2. Check for Starvation Safeguard
        starving_approaches = []
        for d_str, road in roads.items():
            if road.counts.total > 0 and road.max_vehicle_wait_sec >= settings.starvation_threshold_sec:
                starving_approaches.append((d_str, road.max_vehicle_wait_sec, road.counts.total))

        starvation_triggered = len(starving_approaches) > 0
        starvation_dir = None
        selected_dir_str = None
        reason = ""
        dominant_factor = "composite_traffic_score"

        if starvation_triggered:
            # Sort by longest wait time first
            starving_approaches.sort(key=lambda x: x[1], reverse=True)
            chosen = starving_approaches[0]
            selected_dir_str = chosen[0]
            starvation_dir = Direction(selected_dir_str)
            chosen_wait = chosen[1]
            chosen_v = chosen[2]

            # Find what the busiest approach was to explain why starvation override occurred
            busiest_d = max(roads.keys(), key=lambda k: roads[k].counts.total)
            busiest_v = roads[busiest_d].counts.total

            if busiest_d != selected_dir_str and busiest_v > chosen_v:
                reason = (
                    f"{selected_dir_str} received priority via Starvation Safeguard: "
                    f"Vehicles waited {chosen_wait:.1f}s (exceeding {settings.starvation_threshold_sec:.1f}s limit). "
                    f"Prioritized over busier {busiest_d} ({busiest_v} vehicles) to ensure fairness and prevent infinite queuing."
                )
            else:
                reason = (
                    f"{selected_dir_str} received priority: Starvation threshold exceeded "
                    f"with {chosen_wait:.1f}s maximum waiting time across {chosen_v} queued vehicles."
                )
            dominant_factor = "waiting_time_starvation"

        else:
            # Check if all roads are empty
            total_active_all = sum(r.counts.total for r in roads.values())
            if total_active_all == 0:
                # Round-robin next approach
                directions_order = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST]
                if last_direction in directions_order:
                    idx = (directions_order.index(last_direction) + 1) % 4
                    selected_dir_str = directions_order[idx].value
                else:
                    selected_dir_str = Direction.NORTH.value
                reason = f"All intersection approaches are clear. Defaulting to {selected_dir_str} on minimum standby phase."
                dominant_factor = "idle_standby"
            else:
                # Rank roads by composite score
                sorted_by_score = sorted(scores.items(), key=lambda x: x[1], reverse=True)
                selected_dir_str = sorted_by_score[0][0]
                best_score = sorted_by_score[0][1]

                chosen_bd = breakdowns[selected_dir_str]
                contribs = [
                    ("vehicle_count", chosen_bd.vehicle_count.weighted_score, f"{chosen_bd.vehicle_count.raw_value:.0f} vehicles"),
                    ("queue_length", chosen_bd.queue_length.weighted_score, f"{chosen_bd.queue_length.raw_value:.1f}m queue"),
                    ("waiting_time", chosen_bd.waiting_time.weighted_score, f"{chosen_bd.waiting_time.raw_value:.1f}s wait"),
                    ("pcu_weight", chosen_bd.pcu_weight.weighted_score, f"{chosen_bd.pcu_weight.raw_value:.1f} PCU")
                ]
                contribs.sort(key=lambda x: x[1], reverse=True)
                dominant_name, _, dominant_detail = contribs[0]
                dominant_factor = dominant_name

                reason = (
                    f"{selected_dir_str} awarded green phase with highest traffic score of {best_score:.1f}/100. "
                    f"Primary factor: {dominant_name.replace('_', ' ').title()} ({dominant_detail})."
                )

        selected_direction = Direction(selected_dir_str)

        # 3. Calculate recommended green duration
        # Based on demand and score within [min_green, max_green]
        chosen_road = roads[selected_dir_str]
        selected_score = scores[selected_dir_str]
        green_duration = cls.compute_green_duration(
            score=selected_score,
            road=chosen_road,
            settings=settings
        )

        # 4. Generate rankings list
        rankings = []
        for d_str, sc in sorted(scores.items(), key=lambda x: x[1], reverse=True):
            rankings.append({
                "direction": d_str,
                "score": sc,
                "vehicles": roads[d_str].counts.total,
                "wait_sec": round(roads[d_str].max_vehicle_wait_sec, 1),
                "is_starving": roads[d_str].starvation_risk
            })

        return SignalDecision(
            cycle_id=cycle_id,
            timestamp=timestamp,
            selected_direction=selected_direction,
            green_duration_sec=green_duration,
            starvation_triggered=starvation_triggered,
            starvation_direction=starvation_dir,
            scores=scores,
            rankings=rankings,
            reason=reason,
            dominant_factor=dominant_factor,
            factor_breakdowns=breakdowns
        )

    @classmethod
    def compute_green_duration(
        cls,
        score: float,
        road: RoadState,
        settings: SimulationSettings
    ) -> float:
        min_g = settings.min_green_sec
        max_g = settings.max_green_sec

        if road.counts.total == 0:
            return float(min_g)

        # 1. Score-based interpolation
        score_ratio = max(0.0, min(1.0, score / 100.0))
        score_green = min_g + (max_g - min_g) * score_ratio

        # 2. Demand-based clearing time estimation
        # t_clear = startup_lost_time (2s) + (total_vehicles / discharge_rate)
        discharge_rate = max(0.1, settings.discharge_rate_veh_per_sec)
        # Account for heavy vehicle PCU impact on discharge speed
        pcu_effective = max(float(road.counts.total), road.pcu_total)
        demand_green = 2.0 + (pcu_effective / discharge_rate)

        # Allocate sufficient time to clear queue, bounded by [min_green, max_green]
        combined = max(score_green, demand_green)
        clamped = max(float(min_g), min(float(max_g), combined))
        return float(round(clamped, 1))
