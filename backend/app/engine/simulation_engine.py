import time
import random
import uuid
from typing import Dict, List, Optional, Tuple, Any
from ..models.schemas import (
    Direction, SignalState, OperatingMode, ScenarioType,
    VehicleCounts, RoadState, SignalDecision, SimulationSettings,
    SimulationStateResponse, DirectionMetric, EvaluationComparison
)
from .decision_engine import TrafficDecisionEngine

class SimulatedVehicle:
    def __init__(self, v_type: str, arrival_time: float, pcu: float):
        self.id = str(uuid.uuid4())[:8]
        self.v_type = v_type # "car", "bus", "truck", "motorcycle"
        self.arrival_time = arrival_time
        self.wait_time = 0.0
        self.pcu = pcu
        self.processed = False

class IntersectionSimulation:
    def __init__(self, settings: Optional[SimulationSettings] = None):
        self.settings = settings or SimulationSettings()
        self.is_running: bool = False
        self.mode: OperatingMode = OperatingMode.ADAPTIVE_AI
        self.scenario: ScenarioType = ScenarioType.MODERATE_BALANCED
        self.speed_multiplier: float = 1.0

        # Simulation clock
        self.sim_time: float = 0.0
        self.cycle_count: int = 0
        self.last_wall_time: float = time.time()

        # Signal state machine
        self.current_direction: Optional[Direction] = Direction.NORTH
        self.current_phase: SignalState = SignalState.GREEN
        self.phase_time_remaining: float = self.settings.min_green_sec
        self.current_phase_duration: float = self.settings.min_green_sec
        self.next_direction: Optional[Direction] = None

        # Road queues: Direction -> List[SimulatedVehicle]
        self.queues: Dict[Direction, List[SimulatedVehicle]] = {
            Direction.NORTH: [],
            Direction.SOUTH: [],
            Direction.EAST: [],
            Direction.WEST: []
        }

        # Fixed time round-robin tracker
        self.fixed_order = [Direction.NORTH, Direction.EAST, Direction.SOUTH, Direction.WEST]
        self.fixed_idx = 0

        # Discharge accumulation tracker
        self.discharge_accumulator: float = 0.0

        # Metrics collection
        self.total_vehicles_arrived: int = 0
        self.total_vehicles_processed: int = 0
        self.processed_wait_times: List[float] = []
        self.direction_wait_times: Dict[Direction, List[float]] = {d: [] for d in Direction}
        self.direction_processed_count: Dict[Direction, int] = {d: 0 for d in Direction}
        self.max_queue_recorded: Dict[Direction, float] = {d: 0.0 for d in Direction}

        # Efficiency metrics
        self.green_active_discharge_seconds: float = 0.0
        self.total_green_seconds: float = 0.0
        self.unnecessary_stops: int = 0

        # History of decisions and snapshots
        self.last_decision: Optional[SignalDecision] = None
        self.decision_history: List[SignalDecision] = []

        # Scenario arrival rates (vehicles/sec per direction)
        self.scenario_rates = self._get_scenario_rates(self.scenario)

        # Initialize road queues with initial vehicles based on scenario
        self.load_scenario(self.scenario)

    def _get_scenario_rates(self, scenario: ScenarioType) -> Dict[Direction, float]:
        if scenario == ScenarioType.LIGHT_BALANCED:
            return {d: 0.08 for d in Direction} # ~5 veh/min
        elif scenario == ScenarioType.MODERATE_BALANCED:
            return {d: 0.20 for d in Direction} # ~12 veh/min
        elif scenario == ScenarioType.HEAVY_CONGESTION:
            return {d: 0.45 for d in Direction} # ~27 veh/min
        elif scenario == ScenarioType.HIGHLY_UNBALANCED:
            return {
                Direction.NORTH: 0.60, # ~36 veh/min (congested)
                Direction.SOUTH: 0.06,
                Direction.EAST: 0.08,
                Direction.WEST: 0.05
            }
        elif scenario == ScenarioType.STARVATION_EDGE_CASE:
            return {
                Direction.NORTH: 0.55,
                Direction.SOUTH: 0.05,
                Direction.EAST: 0.05,
                Direction.WEST: 0.02
            }
        elif scenario == ScenarioType.ZERO_TRAFFIC:
            return {d: 0.0 for d in Direction}
        elif scenario == ScenarioType.RAPID_FLUCTUATION:
            # Alternates dynamically in step
            return {Direction.NORTH: 0.4, Direction.SOUTH: 0.4, Direction.EAST: 0.05, Direction.WEST: 0.05}
        return {d: 0.15 for d in Direction}

    def load_scenario(self, scenario: ScenarioType):
        self.scenario = scenario
        self.scenario_rates = self._get_scenario_rates(scenario)
        # Clear queues
        for d in Direction:
            self.queues[d] = []

        now = self.sim_time

        # Pre-populate queues to demonstrate the scenario immediately
        if scenario == ScenarioType.LIGHT_BALANCED:
            counts = {d: (2, 0, 0, 1) for d in Direction} # (car, bus, truck, moto)
            self._populate_initial_vehicles(counts, wait_base=5.0)

        elif scenario == ScenarioType.MODERATE_BALANCED:
            counts = {d: (5, 1, 1, 3) for d in Direction}
            self._populate_initial_vehicles(counts, wait_base=15.0)

        elif scenario == ScenarioType.HEAVY_CONGESTION:
            counts = {d: (12, 3, 2, 6) for d in Direction}
            self._populate_initial_vehicles(counts, wait_base=30.0)

        elif scenario == ScenarioType.HIGHLY_UNBALANCED:
            counts = {
                Direction.NORTH: (18, 4, 3, 8), # Heavy!
                Direction.SOUTH: (2, 0, 0, 1),
                Direction.EAST: (3, 0, 1, 0),
                Direction.WEST: (1, 0, 0, 1)
            }
            self._populate_initial_vehicles(counts, wait_base=12.0)

        elif scenario == ScenarioType.STARVATION_EDGE_CASE:
            # Scenario: NORTH has high vehicles (16) with recent arrival (10s wait)
            # WEST has few vehicles (3), but waiting for 72s (exceeding 60s starvation limit)!
            counts = {
                Direction.NORTH: (14, 2, 2, 4),
                Direction.SOUTH: (4, 1, 0, 2),
                Direction.EAST: (3, 0, 1, 1),
                Direction.WEST: (2, 1, 0, 0)
            }
            # Custom waiting times to explicitly showcase starvation safeguard
            self._populate_initial_vehicles(counts, wait_base=10.0)
            # Artificially set WEST vehicles' wait time to 72 seconds
            for v in self.queues[Direction.WEST]:
                v.arrival_time = now - 72.0
                v.wait_time = 72.0

        elif scenario == ScenarioType.ZERO_TRAFFIC:
            # Zero vehicles
            pass

        elif scenario == ScenarioType.RAPID_FLUCTUATION:
            counts = {
                Direction.NORTH: (8, 2, 1, 3),
                Direction.SOUTH: (7, 1, 1, 2),
                Direction.EAST: (2, 0, 0, 1),
                Direction.WEST: (1, 0, 0, 0)
            }
            self._populate_initial_vehicles(counts, wait_base=15.0)

        self._recalculate_road_states()

    def _populate_initial_vehicles(self, counts_by_dir: Dict[Direction, Tuple[int, int, int, int]], wait_base: float):
        for direction, (cars, buses, trucks, motos) in counts_by_dir.items():
            for _ in range(cars):
                self._add_vehicle(direction, "car", wait_sec=random.uniform(wait_base * 0.5, wait_base * 1.5))
            for _ in range(buses):
                self._add_vehicle(direction, "bus", wait_sec=random.uniform(wait_base * 0.5, wait_base * 1.5))
            for _ in range(trucks):
                self._add_vehicle(direction, "truck", wait_sec=random.uniform(wait_base * 0.5, wait_base * 1.5))
            for _ in range(motos):
                self._add_vehicle(direction, "motorcycle", wait_sec=random.uniform(wait_base * 0.5, wait_base * 1.5))

    def _add_vehicle(self, direction: Direction, v_type: str, wait_sec: float = 0.0):
        pcu_map = {
            "car": self.settings.pcu.car,
            "bus": self.settings.pcu.bus,
            "truck": self.settings.pcu.truck,
            "motorcycle": self.settings.pcu.motorcycle
        }
        pcu = pcu_map.get(v_type, 1.0)
        arrival = max(0.0, self.sim_time - wait_sec)
        veh = SimulatedVehicle(v_type=v_type, arrival_time=arrival, pcu=pcu)
        veh.wait_time = wait_sec
        self.queues[direction].append(veh)
        self.total_vehicles_arrived += 1

    def _recalculate_road_states(self) -> Dict[str, RoadState]:
        road_states: Dict[str, RoadState] = {}
        for d in Direction:
            q = self.queues[d]
            cars = sum(1 for v in q if v.v_type == "car")
            buses = sum(1 for v in q if v.v_type == "bus")
            trucks = sum(1 for v in q if v.v_type == "truck")
            motos = sum(1 for v in q if v.v_type == "motorcycle")
            total = len(q)

            counts = VehicleCounts(cars=cars, buses=buses, trucks=trucks, motorcycles=motos, total=total)
            pcu_total = TrafficDecisionEngine.compute_pcu(counts, self.settings.pcu)
            q_len = TrafficDecisionEngine.estimate_queue_length_meters(counts)

            # Max wait time & accumulated wait
            if total > 0:
                max_w = max(v.wait_time for v in q)
                acc_w = sum(v.wait_time for v in q)
            else:
                max_w = 0.0
                acc_w = 0.0

            # Track peak queue length
            if q_len > self.max_queue_recorded[d]:
                self.max_queue_recorded[d] = q_len

            # Check starvation risk
            starve = (total > 0 and max_w >= self.settings.starvation_threshold_sec)

            # Signal state
            if self.current_phase == SignalState.ALL_RED:
                s_state = SignalState.RED
            elif self.current_direction == d:
                s_state = self.current_phase
            else:
                s_state = SignalState.RED

            road = RoadState(
                direction=d,
                counts=counts,
                queue_length_meters=round(q_len, 1),
                accumulated_wait_sec=round(acc_w, 1),
                max_vehicle_wait_sec=round(max_w, 1),
                traffic_score=0.0,
                signal_state=s_state,
                starvation_risk=starve,
                pcu_total=round(pcu_total, 1),
                vehicles_processed=self.direction_processed_count[d]
            )

            # Calculate factor breakdown & score
            score, bd = TrafficDecisionEngine.calculate_road_score(road, self.settings)
            road.traffic_score = round(score, 1)
            road.factors = bd

            road_states[d.value] = road

        return road_states

    def step(self, delta_time: float):
        """Advance simulation by delta_time seconds."""
        dt = delta_time * self.speed_multiplier
        self.sim_time += dt

        # 1. Update waiting times of all queued vehicles on RED / AMBER approaches
        for d in Direction:
            # If road is not currently GREEN, all vehicles in queue accumulate waiting time
            is_serviced = (self.current_direction == d and self.current_phase == SignalState.GREEN)
            for v in self.queues[d]:
                if not is_serviced:
                    v.wait_time += dt

        # 2. Vehicle arrivals according to scenario rates
        for d, rate in self.scenario_rates.items():
            if rate > 0:
                expected_arrivals = rate * dt
                # Poisson approximation
                num_arrivals = int(expected_arrivals)
                if random.random() < (expected_arrivals - num_arrivals):
                    num_arrivals += 1

                for _ in range(num_arrivals):
                    # Vehicle class distribution: 65% cars, 15% motorcycles, 12% buses, 8% trucks
                    rnd = random.random()
                    if rnd < 0.65:
                        v_type = "car"
                    elif rnd < 0.80:
                        v_type = "motorcycle"
                    elif rnd < 0.92:
                        v_type = "bus"
                    else:
                        v_type = "truck"
                    self._add_vehicle(d, v_type, wait_sec=0.0)

                    # In fixed-time mode, check unnecessary stop
                    if self.mode == OperatingMode.FIXED_TIME:
                        if self.current_direction != d and len(self.queues[self.current_direction]) == 0:
                            self.unnecessary_stops += 1

        # 3. Discharge vehicles on GREEN approach
        if self.current_phase == SignalState.GREEN and self.current_direction:
            self.total_green_seconds += dt
            active_queue = self.queues[self.current_direction]

            if len(active_queue) > 0:
                self.green_active_discharge_seconds += dt
                # Discharge rate in vehicles per second
                self.discharge_accumulator += self.settings.discharge_rate_veh_per_sec * dt
                while self.discharge_accumulator >= 1.0 and len(active_queue) > 0:
                    discharged_veh = active_queue.pop(0)
                    self.discharge_accumulator -= 1.0
                    self.total_vehicles_processed += 1
                    self.direction_processed_count[self.current_direction] += 1
                    self.processed_wait_times.append(discharged_veh.wait_time)
                    self.direction_wait_times[self.current_direction].append(discharged_veh.wait_time)
            else:
                self.discharge_accumulator = 0.0

        # 4. Phase countdown & Transitions
        self.phase_time_remaining -= dt

        if self.phase_time_remaining <= 0:
            self._transition_phase()

    def _transition_phase(self):
        """State machine for safe traffic light transitions: GREEN -> AMBER -> ALL_RED -> GREEN."""
        if self.current_phase == SignalState.GREEN:
            # Transition to Amber
            self.current_phase = SignalState.AMBER
            self.phase_time_remaining = self.settings.amber_sec
            self.current_phase_duration = self.settings.amber_sec

        elif self.current_phase == SignalState.AMBER:
            # Transition to All-Red clearance
            self.current_phase = SignalState.ALL_RED
            self.phase_time_remaining = self.settings.all_red_sec
            self.current_phase_duration = self.settings.all_red_sec

            # Determine the next scheduled approach while in clearance
            road_states = self._recalculate_road_states()

            if self.mode == OperatingMode.ADAPTIVE_AI:
                # Use Explainable Decision Engine
                decision = TrafficDecisionEngine.evaluate_all(
                    roads=road_states,
                    settings=self.settings,
                    cycle_id=self.cycle_count + 1,
                    timestamp=self.sim_time,
                    last_direction=self.current_direction
                )
                self.last_decision = decision
                self.decision_history.append(decision)
                self.next_direction = decision.selected_direction
                self.next_green_duration = decision.green_duration_sec
            else:
                # FIXED_TIME Mode: Sequential Round-Robin
                self.fixed_idx = (self.fixed_idx + 1) % len(self.fixed_order)
                self.next_direction = self.fixed_order[self.fixed_idx]
                self.next_green_duration = self.settings.fixed_time_green_sec

                # Record decision-like record for fixed mode
                fixed_decision = SignalDecision(
                    cycle_id=self.cycle_count + 1,
                    timestamp=self.sim_time,
                    selected_direction=self.next_direction,
                    green_duration_sec=self.next_green_duration,
                    starvation_triggered=False,
                    scores={d.value: 0.0 for d in Direction},
                    rankings=[],
                    reason=f"Conventional Fixed-Time round-robin: Switched to {self.next_direction.value} for predetermined {self.next_green_duration:.0f}s green interval.",
                    dominant_factor="fixed_timer_schedule",
                    factor_breakdowns={}
                )
                self.last_decision = fixed_decision
                self.decision_history.append(fixed_decision)

        elif self.current_phase == SignalState.ALL_RED:
            # Transition to Green on Next Scheduled Approach
            self.cycle_count += 1
            self.current_direction = self.next_direction or Direction.NORTH
            self.current_phase = SignalState.GREEN
            duration = getattr(self, "next_green_duration", self.settings.min_green_sec)
            self.phase_time_remaining = duration
            self.current_phase_duration = duration

    def run_one_cycle(self):
        """Advance one full signal phase decision immediately."""
        # Force phase to end
        self.phase_time_remaining = 0.0
        self._transition_phase()

    def get_state(self) -> SimulationStateResponse:
        road_states = self._recalculate_road_states()

        active_vehicles = sum(r.counts.total for r in road_states.values())
        avg_sys_wait = 0.0
        if len(self.processed_wait_times) > 0:
            avg_sys_wait = sum(self.processed_wait_times) / len(self.processed_wait_times)
        elif active_vehicles > 0:
            avg_sys_wait = sum(r.accumulated_wait_sec for r in road_states.values()) / active_vehicles

        # Longest waiting road
        longest_road = max(road_states.keys(), key=lambda k: road_states[k].max_vehicle_wait_sec)

        return SimulationStateResponse(
            is_running=self.is_running,
            speed_multiplier=self.speed_multiplier,
            mode=self.mode,
            active_scenario=self.scenario,
            current_green_direction=self.current_direction if self.current_phase in (SignalState.GREEN, SignalState.AMBER) else None,
            current_phase=self.current_phase,
            phase_time_remaining=round(max(0.0, self.phase_time_remaining), 1),
            current_phase_duration=round(self.current_phase_duration, 1),
            elapsed_time_sec=round(self.sim_time, 1),
            cycle_count=self.cycle_count,
            roads=road_states,
            last_decision=self.last_decision,
            next_scheduled_direction=self.next_direction,
            total_vehicles_active=active_vehicles,
            total_vehicles_processed=self.total_vehicles_processed,
            average_system_wait_sec=round(avg_sys_wait, 1),
            longest_waiting_road=longest_road
        )

    def get_evaluation_metrics(self) -> Dict[str, Any]:
        avg_wait = sum(self.processed_wait_times) / len(self.processed_wait_times) if self.processed_wait_times else 0.0
        max_wait = max(self.processed_wait_times) if self.processed_wait_times else 0.0

        # Current remaining queue wait times
        for q in self.queues.values():
            for v in q:
                if v.wait_time > max_wait:
                    max_wait = v.wait_time

        green_util_pct = (
            (self.green_active_discharge_seconds / max(1.0, self.total_green_seconds)) * 100.0
            if self.total_green_seconds > 0 else 0.0
        )

        dir_metrics: Dict[str, DirectionMetric] = {}
        for d in Direction:
            w_list = self.direction_wait_times[d]
            avg_d = sum(w_list) / len(w_list) if w_list else 0.0
            max_d = max(w_list) if w_list else 0.0
            # Also check existing queue
            for v in self.queues[d]:
                if v.wait_time > max_d:
                    max_d = v.wait_time
            dir_metrics[d.value] = DirectionMetric(
                avg_wait_sec=round(avg_d, 1),
                max_wait_sec=round(max_d, 1),
                total_processed=self.direction_processed_count[d],
                max_queue_m=round(self.max_queue_recorded[d], 1)
            )

        avg_queue_all = sum(self.max_queue_recorded.values()) / 4.0
        max_queue_all = max(self.max_queue_recorded.values()) if self.max_queue_recorded else 0.0

        return {
            "mode": self.mode.value,
            "scenario": self.scenario.value,
            "duration_sec": round(self.sim_time, 1),
            "cycles": self.cycle_count,
            "total_arrived": self.total_vehicles_arrived,
            "total_processed": self.total_vehicles_processed,
            "avg_waiting_time_sec": round(avg_wait, 1),
            "max_waiting_time_sec": round(max_wait, 1),
            "avg_queue_length_m": round(avg_queue_all, 1),
            "max_queue_length_m": round(max_queue_all, 1),
            "green_utilization_pct": round(min(100.0, green_util_pct), 1),
            "unnecessary_stops": self.unnecessary_stops,
            "direction_metrics": dir_metrics
        }

    def reset(self):
        """Reset simulation to initial state."""
        self.sim_time = 0.0
        self.cycle_count = 0
        self.total_vehicles_arrived = 0
        self.total_vehicles_processed = 0
        self.processed_wait_times = []
        self.direction_wait_times = {d: [] for d in Direction}
        self.direction_processed_count = {d: 0 for d in Direction}
        self.max_queue_recorded = {d: 0.0 for d in Direction}
        self.green_active_discharge_seconds = 0.0
        self.total_green_seconds = 0.0
        self.unnecessary_stops = 0
        self.current_direction = Direction.NORTH
        self.current_phase = SignalState.GREEN
        self.phase_time_remaining = self.settings.min_green_sec
        self.current_phase_duration = self.settings.min_green_sec
        self.next_direction = None
        self.last_decision = None
        self.decision_history = []
        self.load_scenario(self.scenario)
