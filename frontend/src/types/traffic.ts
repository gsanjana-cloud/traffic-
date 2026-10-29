export type Direction = 'NORTH' | 'SOUTH' | 'EAST' | 'WEST';
export type SignalState = 'RED' | 'AMBER' | 'GREEN' | 'ALL_RED';
export type OperatingMode = 'ADAPTIVE_AI' | 'FIXED_TIME';

export type ScenarioType =
  | 'LIGHT_BALANCED'
  | 'MODERATE_BALANCED'
  | 'HEAVY_CONGESTION'
  | 'HIGHLY_UNBALANCED'
  | 'STARVATION_EDGE_CASE'
  | 'ZERO_TRAFFIC'
  | 'RAPID_FLUCTUATION';

export interface VehicleCounts {
  cars: number;
  buses: number;
  trucks: number;
  motorcycles: number;
  total: number;
}

export interface FactorContribution {
  raw_value: number;
  normalized_value: number;
  weight: number;
  weighted_score: number;
}

export interface FactorBreakdown {
  vehicle_count: FactorContribution;
  queue_length: FactorContribution;
  waiting_time: FactorContribution;
  pcu_weight: FactorContribution;
  composite_score: number;
}

export interface RoadState {
  direction: Direction;
  counts: VehicleCounts;
  queue_length_meters: number;
  accumulated_wait_sec: number;
  max_vehicle_wait_sec: number;
  traffic_score: number;
  signal_state: SignalState;
  starvation_risk: boolean;
  pcu_total: number;
  vehicles_processed: number;
  factors?: FactorBreakdown;
}

export interface RankingItem {
  direction: string;
  score: number;
  vehicles: number;
  wait_sec: number;
  is_starving: boolean;
}

export interface SignalDecision {
  cycle_id: number;
  timestamp: number;
  selected_direction: Direction;
  green_duration_sec: number;
  starvation_triggered: boolean;
  starvation_direction?: Direction;
  scores: Record<string, number>;
  rankings: RankingItem[];
  reason: string;
  dominant_factor: string;
  factor_breakdowns: Record<string, FactorBreakdown>;
}

export interface SimulationState {
  is_running: boolean;
  speed_multiplier: number;
  mode: OperatingMode;
  active_scenario: ScenarioType;
  current_green_direction: Direction | null;
  current_phase: SignalState;
  phase_time_remaining: number;
  current_phase_duration: number;
  elapsed_time_sec: number;
  cycle_count: number;
  roads: Record<Direction, RoadState>;
  last_decision: SignalDecision | null;
  next_scheduled_direction: Direction | null;
  total_vehicles_active: number;
  total_vehicles_processed: number;
  average_system_wait_sec: number;
  longest_waiting_road: string | null;
}

export interface TrafficWeights {
  w1_vehicle_count: number;
  w2_queue_length: number;
  w3_waiting_time: number;
  w4_vehicle_type: number;
}

export interface VehiclePCU {
  car: number;
  bus: number;
  truck: number;
  motorcycle: number;
}

export interface SimulationSettings {
  min_green_sec: number;
  max_green_sec: number;
  amber_sec: number;
  all_red_sec: number;
  starvation_threshold_sec: number;
  fixed_time_green_sec: number;
  discharge_rate_veh_per_sec: number;
  weights: TrafficWeights;
  pcu: VehiclePCU;
  speed_multiplier: number;
  detection_confidence_threshold: number;
}

export interface DetectedBox {
  box: [number, number, number, number];
  class_name: string;
  confidence: number;
  direction_assigned?: Direction;
}

export interface DetectionResult {
  is_demo_mode: boolean;
  source_name: string;
  direction: Direction;
  cars: number;
  buses: number;
  trucks: number;
  motorcycles: number;
  total_detected: number;
  estimated_pcu: number;
  boxes: DetectedBox[];
  processing_time_ms: number;
  limitations_notes: string[];
  annotated_image_base64?: string;
}

export interface DirectionMetric {
  avg_wait_sec: number;
  max_wait_sec: number;
  total_processed: number;
  max_queue_m: number;
}

export interface EvaluationComparison {
  scenario: ScenarioType;
  simulation_duration_sec: number;
  adaptive_metrics: {
    mode: string;
    scenario: string;
    duration_sec: number;
    cycles: number;
    total_arrived: number;
    total_processed: number;
    avg_waiting_time_sec: number;
    max_waiting_time_sec: number;
    avg_queue_length_m: number;
    max_queue_length_m: number;
    green_utilization_pct: number;
    unnecessary_stops: number;
    direction_metrics: Record<string, DirectionMetric>;
  };
  fixed_metrics: {
    mode: string;
    scenario: string;
    duration_sec: number;
    cycles: number;
    total_arrived: number;
    total_processed: number;
    avg_waiting_time_sec: number;
    max_waiting_time_sec: number;
    avg_queue_length_m: number;
    max_queue_length_m: number;
    green_utilization_pct: number;
    unnecessary_stops: number;
    direction_metrics: Record<string, DirectionMetric>;
  };
  improvements: {
    avg_waiting_time: number | null;
    max_waiting_time: number | null;
    avg_queue_length: number | null;
    green_utilization: number | null;
    unnecessary_stops: number | null;
  };
  summary: string;
}

export interface SessionSummary {
  id: string;
  created_at: number;
  mode: OperatingMode;
  scenario: ScenarioType;
  duration_sec: number;
  total_cycles: number;
  total_vehicles_processed: number;
  avg_wait_sec: number;
  max_wait_sec: number;
  green_utilization_pct: number;
  unnecessary_stops: number;
}
