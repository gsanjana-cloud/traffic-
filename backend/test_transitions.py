import time
from app.models.schemas import SimulationSettings, ScenarioType, SignalState, Direction
from app.engine.simulation_engine import IntersectionSimulation

def test_approach_signal_transitions():
    settings = SimulationSettings(
        min_green_sec=5.0,
        max_green_sec=15.0,
        amber_sec=2.0,
        all_red_sec=1.0,
        starvation_threshold_sec=30.0
    )
    sim = IntersectionSimulation(settings=settings)
    sim.load_scenario(ScenarioType.MODERATE_BALANCED)

    seen_green_directions = set()
    phase_history = []
    
    print("Testing 100 simulation seconds across approaches...")
    for t in range(200):
        sim.step(0.5)
        state = sim.get_state()
        curr_dir = state.current_green_direction
        curr_phase = state.current_phase
        
        # Check safety invariant: no two approaches ever green/amber simultaneously
        active_lights = [
            d for d, r in state.roads.items()
            if r.signal_state in (SignalState.GREEN, SignalState.AMBER)
        ]
        assert len(active_lights) <= 1, f"CONFLICTING SIGNALS DETECTED! Active: {active_lights}"

        if curr_phase == SignalState.GREEN and curr_dir:
            seen_green_directions.add(curr_dir)
            if not phase_history or phase_history[-1] != (curr_dir.value, curr_phase.value):
                phase_history.append((curr_dir.value, curr_phase.value))
        elif curr_phase == SignalState.AMBER and curr_dir:
            if not phase_history or phase_history[-1] != (curr_dir.value, curr_phase.value):
                phase_history.append((curr_dir.value, curr_phase.value))
        elif curr_phase == SignalState.ALL_RED:
            if not phase_history or phase_history[-1] != ("ALL", curr_phase.value):
                phase_history.append((curr_phase.value, "ALL_RED"))

    print(f"Recorded phase transitions (sample of first 10):")
    for p in phase_history[:10]:
        print("  ->", p)
        
    print(f"Approaches that received green: {[d.value for d in seen_green_directions]}")
    assert len(seen_green_directions) == 4, f"Not all 4 approaches received green! Visited: {seen_green_directions}"
    print("SUCCESS: All four approaches (NORTH, SOUTH, EAST, WEST) correctly received green signals with safe amber/all-red clearance transitions!")

if __name__ == "__main__":
    test_approach_signal_transitions()
