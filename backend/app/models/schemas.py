from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field

class Direction(str, Enum):
    NORTH = "NORTH"
    SOUTH = "SOUTH"
    EAST = "EAST"
    WEST = "WEST"

class SignalState(str, Enum):
    RED = "RED"
    AMBER = "AMBER"
    GREEN = "GREEN"
    ALL_RED = "ALL_RED"

class OperatingMode(str, Enum):
    ADAPTIVE_AI = "ADAPTIVE_AI"
    FIXED_TIME = "FIXED_TIME"

class ScenarioType(str, Enum):
    LIGHT_BALANCED = "LIGHT_BALANCED"
    MODERATE_BALANCED = "MODERATE_BALANCED"
    HEAVY_CONGESTION = "HEAVY_CONGESTION"
    HIGHLY_UNBALANCED = "HIGHLY_UNBALANCED"
    STARVATION_EDGE_CASE = "STARVATION_EDGE_CASE"
    ZERO_TRAFFIC = "ZERO_TRAFFIC"
    RAPID_FLUCTUATION = "RAPID_FLUCTUATION"

class VehicleCounts(BaseModel):
    cars: int = 0
    buses: int = 0
    trucks: int = 0
    motorcycles: int = 0
    total: int = 0

class RoadFactorContribution(BaseModel):
    raw_value: float
    normalized_value: float
    weight: float
    weighted_score: float

class RoadFactorBreakdown(BaseModel):
    vehicle_count: RoadFactorContribution
    queue_length: RoadFactorContribution
    waiting_time: RoadFactorContribution
    pcu_weight: RoadFactorContribution
    composite_score: float

class RoadState(BaseModel):
    direction: Direction
    counts: VehicleCounts = Field(default_factory=VehicleCounts)
    queue_length_meters: float = 0.0
    accumulated_wait_sec: float = 0.0
    max_vehicle_wait_sec: float = 0.0
    traffic_score: float = 0.0
    signal_state: SignalState = SignalState.RED
    starvation_risk: bool = False
    pcu_total: float = 0.0
    vehicles_processed: int = 0
    factors: Optional[RoadFactorBreakdown] = None

class SignalDecision(BaseModel):
    cycle_id: int
    timestamp: float
    selected_direction: Direction
    green_duration_sec: float
    starvation_triggered: bool
    starvation_direction: Optional[Direction] = None
    scores: Dict[str, float]
    rankings: List[Dict[str, str | float]]
    reason: str
    dominant_factor: str
    factor_breakdowns: Dict[str, RoadFactorBreakdown]

class TrafficWeights(BaseModel):
    w1_vehicle_count: float = 0.35
    w2_queue_length: float = 0.20
    w3_waiting_time: float = 0.30
    w4_vehicle_type: float = 0.15

class VehiclePCU(BaseModel):
    car: float = 1.0
    bus: float = 2.5
    truck: float = 2.2
    motorcycle: float = 0.5

class SimulationSettings(BaseModel):
    min_green_sec: float = 10.0
    max_green_sec: float = 60.0
    amber_sec: float = 3.0
    all_red_sec: float = 1.0
    starvation_threshold_sec: float = 60.0
    fixed_time_green_sec: float = 25.0
    discharge_rate_veh_per_sec: float = 0.5
    weights: TrafficWeights = Field(default_factory=TrafficWeights)
    pcu: VehiclePCU = Field(default_factory=VehiclePCU)
    speed_multiplier: float = 1.0
    detection_confidence_threshold: float = 0.45

class SimulationStateResponse(BaseModel):
    is_running: bool
    speed_multiplier: float
    mode: OperatingMode
    active_scenario: ScenarioType
    current_green_direction: Optional[Direction]
    current_phase: SignalState
    phase_time_remaining: float
    current_phase_duration: float
    elapsed_time_sec: float
    cycle_count: int
    roads: Dict[str, RoadState]
    last_decision: Optional[SignalDecision] = None
    next_scheduled_direction: Optional[Direction] = None
    total_vehicles_active: int = 0
    total_vehicles_processed: int = 0
    average_system_wait_sec: float = 0.0
    longest_waiting_road: Optional[str] = None

class DirectionMetric(BaseModel):
    avg_wait_sec: float = 0.0
    max_wait_sec: float = 0.0
    total_processed: int = 0
    max_queue_m: float = 0.0

class EvaluationComparison(BaseModel):
    scenario: ScenarioType
    simulation_duration_sec: float
    adaptive_metrics: Dict[str, Any]
    fixed_metrics: Dict[str, Any]
    improvements: Dict[str, Optional[float]]
    summary: str

class DetectedBox(BaseModel):
    box: List[int] # [x1, y1, x2, y2]
    class_name: str
    confidence: float
    direction_assigned: Optional[Direction] = None

class DetectionResult(BaseModel):
    is_demo_mode: bool
    source_name: str
    direction: Direction
    cars: int
    buses: int
    trucks: int
    motorcycles: int
    total_detected: int
    estimated_pcu: float
    boxes: List[DetectedBox]
    processing_time_ms: float
    limitations_notes: List[str]
    annotated_image_base64: Optional[str] = None
