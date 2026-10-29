import {
  SimulationState, SimulationSettings, DetectionResult,
  EvaluationComparison, SessionSummary, ScenarioType, OperatingMode
} from '../types/traffic';

const API_BASE = '/api';

export async function fetchHealth(): Promise<{ status: string; yolo_loaded: boolean; mode: string }> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchSimulationState(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/state`);
  if (!res.ok) throw new Error('Failed to fetch simulation state');
  return res.json();
}

export async function startSimulation(): Promise<void> {
  const res = await fetch(`${API_BASE}/simulation/start`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to start simulation');
}

export async function pauseSimulation(): Promise<void> {
  const res = await fetch(`${API_BASE}/simulation/pause`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to pause simulation');
}

export async function resetSimulation(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/reset`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to reset simulation');
  const data = await res.json();
  return data.state;
}

export async function stepSimulation(): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/step`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to advance decision cycle');
  const data = await res.json();
  return data.state;
}

export async function setScenario(scenario: ScenarioType): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scenario }),
  });
  if (!res.ok) throw new Error('Failed to set scenario');
  const data = await res.json();
  return data.state;
}

export async function setOperatingMode(mode: OperatingMode): Promise<SimulationState> {
  const res = await fetch(`${API_BASE}/simulation/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode }),
  });
  if (!res.ok) throw new Error('Failed to set operating mode');
  const data = await res.json();
  return data.state;
}

export async function setSimulationSpeed(speed: number): Promise<void> {
  const res = await fetch(`${API_BASE}/simulation/speed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ speed }),
  });
  if (!res.ok) throw new Error('Failed to set simulation speed');
}

export async function uploadMediaForDetection(
  file: File,
  direction: string = 'NORTH',
  confidence: number = 0.40,
  forceDemo: boolean = false
): Promise<DetectionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('direction', direction);
  formData.append('confidence', confidence.toString());
  formData.append('force_demo', forceDemo.toString());

  const res = await fetch(`${API_BASE}/detection/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to process image detection');
  return res.json();
}

export async function runDemoDetection(direction: string = 'NORTH', confidence: number = 0.40): Promise<DetectionResult> {
  const res = await fetch(`${API_BASE}/detection/demo`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ direction, confidence }),
  });
  if (!res.ok) throw new Error('Failed to run demo detection');
  return res.json();
}

export async function injectDetectionToSimulation(payload: {
  direction: string;
  cars: number;
  buses: number;
  trucks: number;
  motorcycles: number;
}): Promise<void> {
  const res = await fetch(`${API_BASE}/detection/inject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to inject vehicles into intersection');
}

export async function fetchAnalytics(): Promise<any> {
  const res = await fetch(`${API_BASE}/analytics`);
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

export async function fetchEvaluation(): Promise<EvaluationComparison> {
  const res = await fetch(`${API_BASE}/evaluation`);
  if (!res.ok) throw new Error('Failed to fetch evaluation comparison');
  return res.json();
}

export async function saveCurrentSession(): Promise<{ session_id: string }> {
  const res = await fetch(`${API_BASE}/history/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) throw new Error('Failed to save session');
  return res.json();
}

export async function fetchHistory(): Promise<SessionSummary[]> {
  const res = await fetch(`${API_BASE}/history`);
  if (!res.ok) throw new Error('Failed to fetch history');
  return res.json();
}

export async function fetchSessionDetail(id: string): Promise<any> {
  const res = await fetch(`${API_BASE}/history/${id}`);
  if (!res.ok) throw new Error('Failed to fetch session detail');
  return res.json();
}

export async function fetchSettings(): Promise<SimulationSettings> {
  const res = await fetch(`${API_BASE}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(settings: SimulationSettings): Promise<SimulationSettings> {
  const res = await fetch(`${API_BASE}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}

export function getExportCsvUrl(): string {
  return `${API_BASE}/history/export/csv`;
}
