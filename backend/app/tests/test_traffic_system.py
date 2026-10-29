import pytest
from app.models.schemas import (
    Direction, SignalState, SimulationSettings, RoadState,
    VehicleCounts, ScenarioType, OperatingMode
)
from app.engine.decision_engine import TrafficDecisionEngine
from app.engine.simulation_engine import IntersectionSimulation

@pytest.fixture
def default_settings():
    return SimulationSettings(
        min_green_sec=10.0,
        max_green_sec=60.0,
        amber_sec=3.0,
        all_red_sec=1.0,
        starvation_threshold_sec=60.0
    )

def make_road(direction: Direction, cars: int, buses: int = 0, trucks: int = 0, motos: int = 0, wait_sec: float = 0.0, settings: SimulationSettings = None):
    settings = settings or SimulationSettings()
    counts = VehicleCounts(cars=cars, buses=buses, trucks=trucks, motorcycles=motos, total=cars+buses+trucks+motos)
    pcu = TrafficDecisionEngine.compute_pcu(counts, settings.pcu)
    q_len = TrafficDecisionEngine.estimate_queue_length_meters(counts)
    road = RoadState(
        direction=direction,
        counts=counts,
        queue_length_meters=q_len,
        accumulated_wait_sec=wait_sec * counts.total,
        max_vehicle_wait_sec=wait_sec,
        traffic_score=0.0,
        signal_state=SignalState.RED,
        starvation_risk=(counts.total > 0 and wait_sec >= settings.starvation_threshold_sec),
        pcu_total=pcu
    )
    score, bd = TrafficDecisionEngine.calculate_road_score(road, settings)
    road.traffic_score = score
    road.factors = bd
    return road

# Test 1: Four roads with equal traffic
def test_equal_traffic(default_settings):
    roads = {
        Direction.NORTH.value: make_road(Direction.NORTH, 8, 1, 0, 2, wait_sec=10.0, settings=default_settings),
        Direction.SOUTH.value: make_road(Direction.SOUTH, 8, 1, 0, 2, wait_sec=10.0, settings=default_settings),
        Direction.EAST.value: make_road(Direction.EAST, 8, 1, 0, 2, wait_sec=10.0, settings=default_settings),
        Direction.WEST.value: make_road(Direction.WEST, 8, 1, 0, 2, wait_sec=10.0, settings=default_settings),
    }
    decision = TrafficDecisionEngine.evaluate_all(roads, default_settings, cycle_id=1, timestamp=0.0)
    assert decision.selected_direction in [Direction.NORTH, Direction.SOUTH, Direction.EAST, Direction.WEST]
    assert not decision.starvation_triggered
    assert default_settings.min_green_sec <= decision.green_duration_sec <= default_settings.max_green_sec

# Test 2: One heavily congested road and three lightly congested roads
def test_heavily_congested_road(default_settings):
    roads = {
        Direction.NORTH.value: make_road(Direction.NORTH, 25, 4, 3, 6, wait_sec=15.0, settings=default_settings), # Heavy
        Direction.SOUTH.value: make_road(Direction.SOUTH, 2, 0, 0, 1, wait_sec=10.0, settings=default_settings),
        Direction.EAST.value: make_road(Direction.EAST, 1, 0, 0, 0, wait_sec=8.0, settings=default_settings),
        Direction.WEST.value: make_road(Direction.WEST, 2, 0, 0, 0, wait_sec=12.0, settings=default_settings),
    }
    decision = TrafficDecisionEngine.evaluate_all(roads, default_settings, cycle_id=1, timestamp=0.0)
    assert decision.selected_direction == Direction.NORTH
    assert decision.green_duration_sec > default_settings.min_green_sec
    assert "NORTH" in decision.reason

# Test 3: Starvation Prevention Safeguard (One road with high wait time but low vehicle count)
def test_starvation_prevention_safeguard(default_settings):
    roads = {
        Direction.NORTH.value: make_road(Direction.NORTH, 20, 3, 2, 5, wait_sec=10.0, settings=default_settings), # High volume, low wait
        Direction.SOUTH.value: make_road(Direction.SOUTH, 5, 1, 0, 2, wait_sec=15.0, settings=default_settings),
        Direction.EAST.value: make_road(Direction.EAST, 4, 0, 0, 1, wait_sec=20.0, settings=default_settings),
        Direction.WEST.value: make_road(Direction.WEST, 2, 0, 0, 0, wait_sec=75.0, settings=default_settings), # Low volume (2), but wait = 75s > 60s!
    }
    decision = TrafficDecisionEngine.evaluate_all(roads, default_settings, cycle_id=1, timestamp=0.0)
    # WEST MUST WIN despite having only 2 vehicles vs NORTH's 30!
    assert decision.selected_direction == Direction.WEST
    assert decision.starvation_triggered is True
    assert decision.starvation_direction == Direction.WEST
    assert "Starvation Safeguard" in decision.reason or "starvation" in decision.reason.lower()

# Test 4: Zero traffic on all approaches
def test_zero_traffic_safety(default_settings):
    roads = {
        Direction.NORTH.value: make_road(Direction.NORTH, 0, 0, 0, 0, wait_sec=0.0, settings=default_settings),
        Direction.SOUTH.value: make_road(Direction.SOUTH, 0, 0, 0, 0, wait_sec=0.0, settings=default_settings),
        Direction.EAST.value: make_road(Direction.EAST, 0, 0, 0, 0, wait_sec=0.0, settings=default_settings),
        Direction.WEST.value: make_road(Direction.WEST, 0, 0, 0, 0, wait_sec=0.0, settings=default_settings),
    }
    decision = TrafficDecisionEngine.evaluate_all(roads, default_settings, cycle_id=1, timestamp=0.0, last_direction=Direction.NORTH)
    assert decision.selected_direction in [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST]
    assert decision.green_duration_sec == default_settings.min_green_sec
    assert not decision.starvation_triggered

# Test 5: Signal safety rules - No conflicting green signals in simulation
def test_signal_safety_invariants(default_settings):
    sim = IntersectionSimulation(settings=default_settings)
    sim.load_scenario(ScenarioType.HEAVY_CONGESTION)

    # Step through 50 intervals and verify that never more than 1 road has GREEN or AMBER
    for _ in range(50):
        sim.step(1.0)
        state = sim.get_state()
        green_or_amber_count = sum(
            1 for r in state.roads.values() if r.signal_state in (SignalState.GREEN, SignalState.AMBER)
        )
        assert green_or_amber_count <= 1, f"Signal safety violation: {green_or_amber_count} roads are green/amber simultaneously!"

# Test 6: Every direction eventually receives a turn under sustained demand (no permanent lockout)
def test_fairness_under_sustained_demand(default_settings):
    sim = IntersectionSimulation(settings=default_settings)
    sim.load_scenario(ScenarioType.HIGHLY_UNBALANCED)

    visited_directions = set()
    # Run through sufficient time (e.g. 300 seconds) so all 4 directions have enough time to clear cycles
    for _ in range(300):
        sim.step(1.0)
        if sim.current_phase == SignalState.GREEN and sim.current_direction:
            visited_directions.add(sim.current_direction)

    assert len(visited_directions) == 4, f"Only visited {visited_directions}, starved some directions!"

# Test 7: Green duration limits enforced
def test_green_duration_bounds(default_settings):
    sim = IntersectionSimulation(settings=default_settings)
    road_heavy = make_road(Direction.NORTH, 50, 10, 10, 10, wait_sec=50.0, settings=default_settings)
    green_heavy = TrafficDecisionEngine.compute_green_duration(100.0, road_heavy, default_settings)
    assert green_heavy <= default_settings.max_green_sec

    road_empty = make_road(Direction.SOUTH, 0, 0, 0, 0, wait_sec=0.0, settings=default_settings)
    green_empty = TrafficDecisionEngine.compute_green_duration(0.0, road_empty, default_settings)
    assert green_empty >= default_settings.min_green_sec
