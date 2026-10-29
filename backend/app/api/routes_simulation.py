from fastapi import APIRouter, Body, HTTPException
from typing import Dict, Any
from ..models.schemas import (
    SimulationStateResponse, ScenarioType, OperatingMode, Direction
)

def create_simulation_router(sim_engine):
    router = APIRouter(prefix="/api/simulation", tags=["Simulation"])

    @router.get("/state", response_model=SimulationStateResponse)
    def get_simulation_state():
        return sim_engine.get_state()

    @router.post("/start")
    def start_simulation():
        sim_engine.is_running = True
        return {"status": "started", "is_running": True}

    @router.post("/pause")
    def pause_simulation():
        sim_engine.is_running = False
        return {"status": "paused", "is_running": False}

    @router.post("/reset")
    def reset_simulation():
        sim_engine.reset()
        return {"status": "reset", "state": sim_engine.get_state()}

    @router.post("/step")
    def step_simulation():
        sim_engine.run_one_cycle()
        return {"status": "stepped", "state": sim_engine.get_state()}

    @router.post("/scenario")
    def set_scenario(payload: Dict[str, str] = Body(...)):
        scenario_name = payload.get("scenario")
        try:
            scenario = ScenarioType(scenario_name)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid scenario: {scenario_name}")
        sim_engine.load_scenario(scenario)
        return {"status": "scenario_loaded", "scenario": scenario.value, "state": sim_engine.get_state()}

    @router.post("/mode")
    def set_mode(payload: Dict[str, str] = Body(...)):
        mode_name = payload.get("mode")
        try:
            mode = OperatingMode(mode_name)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid mode: {mode_name}")
        sim_engine.mode = mode
        return {"status": "mode_updated", "mode": mode.value, "state": sim_engine.get_state()}

    @router.post("/speed")
    def set_speed(payload: Dict[str, float] = Body(...)):
        speed = payload.get("speed", 1.0)
        speed = max(0.2, min(5.0, speed))
        sim_engine.speed_multiplier = speed
        return {"status": "speed_updated", "speed": speed}

    return router
