import React, { useState, useEffect } from 'react';
import { SimulationState, SimulationSettings, TrafficWeights } from '../types/traffic';
import { ExplainabilityPanel } from '../components/ExplainabilityPanel';
import { fetchSettings, updateSettings } from '../services/api';
import {
  BrainCircuit, Sliders, ShieldAlert, Award, Calculator,
  TrendingUp, CheckCircle, Info, Sparkles, RefreshCw
} from 'lucide-react';

interface DecisionEnginePageProps {
  state: SimulationState | null;
  onSettingsUpdated?: () => void;
}

export const DecisionEnginePage: React.FC<DecisionEnginePageProps> = ({ state, onSettingsUpdated }) => {
  const [settings, setSettings] = useState<SimulationSettings | null>(null);
  const [weights, setWeights] = useState<TrafficWeights>({
    w1_vehicle_count: 0.35,
    w2_queue_length: 0.20,
    w3_waiting_time: 0.30,
    w4_vehicle_type: 0.15,
  });
  const [starvationThreshold, setStarvationThreshold] = useState<number>(60);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setWeights(s.weights);
        setStarvationThreshold(s.starvation_threshold_sec);
      })
      .catch(console.error);
  }, []);

  const handleWeightChange = (key: keyof TrafficWeights, val: number) => {
    setWeights((prev) => ({ ...prev, [key]: val }));
  };

  const handleSaveWeights = async () => {
    if (!settings) return;
    try {
      const updated: SimulationSettings = {
        ...settings,
        weights,
        starvation_threshold_sec: starvationThreshold,
      };
      await updateSettings(updated);
      setSettings(updated);
      setSaveStatus('Weights and starvation threshold saved successfully!');
      onSettingsUpdated?.();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(e.message || 'Failed to save settings');
    }
  };

  const decision = state?.last_decision ?? null;
  const roads = state?.roads ?? null;

  // Normalized sum of weights for display
  const weightSum = (
    weights.w1_vehicle_count +
    weights.w2_queue_length +
    weights.w3_waiting_time +
    weights.w4_vehicle_type
  );

  return (
    <div className="space-y-6">
      {/* Top Title Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Explainable Multi-Factor Traffic Decision Engine</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Core Module
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Transparent mathematical allocation combining vehicle counts, queue lengths, passenger car units (PCU), and wait times with starvation safeguards.
          </p>
        </div>
      </div>

      {/* Mathematical Formulation Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Calculator className="w-4 h-4 text-emerald-400" />
          <span>Composite Traffic Score Formula & Normalization Principle</span>
        </div>
        <div className="p-3.5 rounded-lg bg-slate-950 font-mono text-xs text-emerald-300 border border-slate-800 leading-relaxed overflow-x-auto">
          Score_i = [V_norm × W1] + [Q_norm × W2] + [W_norm × W3] + [PCU_norm × W4]
          <br />
          Where:
          <br />
          • V_norm = min(100, (Vehicle_Count / 30) × 100)
          <br />
          • Q_norm = min(100, (Queue_Length_Meters / 160) × 100)
          <br />
          • W_norm = min(100, (Max_Waiting_Time / Starvation_Threshold) × 100)
          <br />
          • PCU_norm = min(100, (PCU_Demand / 40) × 100)
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          <strong>Normalization Rationale:</strong> Raw physical units (e.g. 15 vehicles vs 120 seconds of wait vs 85 meters of queue) cannot be summed directly. By normalizing each factor into a unified scale of 0 to 100 before weighting, the decision engine prevents high-magnitude dimensions from dominating the decision.
        </p>
      </div>

      {/* Configurable Weight Sliders Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Configurable Scoring Weights & Starvation Threshold</span>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total Weight: <span className="font-bold text-white">{weightSum.toFixed(2)}</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* W1: Vehicle Count */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">W1: Vehicle Count</span>
              <span className="font-mono text-cyan-400 font-bold">{weights.w1_vehicle_count.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.w1_vehicle_count}
              onChange={(e) => handleWeightChange('w1_vehicle_count', parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Relative impact of total queued vehicle count</div>
          </div>

          {/* W2: Queue Length */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">W2: Queue Length</span>
              <span className="font-mono text-blue-400 font-bold">{weights.w2_queue_length.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.w2_queue_length}
              onChange={(e) => handleWeightChange('w2_queue_length', parseFloat(e.target.value))}
              className="w-full accent-blue-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Spatial roadway queue length in meters</div>
          </div>

          {/* W3: Waiting Time */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">W3: Waiting Time</span>
              <span className="font-mono text-amber-400 font-bold">{weights.w3_waiting_time.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.w3_waiting_time}
              onChange={(e) => handleWeightChange('w3_waiting_time', parseFloat(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Accumulated vehicle delay before starvation</div>
          </div>

          {/* W4: Vehicle Type PCU */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">W4: Vehicle Type (PCU)</span>
              <span className="font-mono text-purple-400 font-bold">{weights.w4_vehicle_type.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.80"
              step="0.05"
              value={weights.w4_vehicle_type}
              onChange={(e) => handleWeightChange('w4_vehicle_type', parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Passenger car equivalence (bus=2.5, truck=2.2)</div>
          </div>
        </div>

        {/* Starvation Threshold Slider */}
        <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-xs font-semibold text-slate-200">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Starvation Safeguard Limit Threshold:</span>
              <span className="font-mono text-amber-400 font-bold">{starvationThreshold} seconds</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl">
              When any approach exceeds this waiting time, the starvation safeguard activates to guarantee green priority, preventing busy corridors from monopolizing the intersection indefinitely.
            </p>
          </div>
          <div className="w-48">
            <input
              type="range"
              min="30"
              max="120"
              step="5"
              value={starvationThreshold}
              onChange={(e) => setStarvationThreshold(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveStatus ? (
            <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
          ) : (
            <span className="text-[11px] text-slate-500">
              Weights normalize dynamically to guarantee 100% total contribution.
            </span>
          )}
          <button
            onClick={handleSaveWeights}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Apply Weights & Update Engine</span>
          </button>
        </div>
      </div>

      {/* Active Decision Explainability Panel */}
      <ExplainabilityPanel decision={decision} />

      {/* Real-Time Approach Score Comparison Table */}
      {roads && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Live Real-Time Approach Factor Breakdown Table
            </h3>
            <span className="text-[11px] text-slate-400">Recalculated on every cycle tick</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                  <th className="py-2 px-3">Approach</th>
                  <th className="py-2 px-3">Vehicles (V)</th>
                  <th className="py-2 px-3">Queue (Q)</th>
                  <th className="py-2 px-3">Max Wait (W)</th>
                  <th className="py-2 px-3">PCU Demand</th>
                  <th className="py-2 px-3">Traffic Score</th>
                  <th className="py-2 px-3">Current State</th>
                  <th className="py-2 px-3">Starvation Status</th>
                </tr>
              </thead>
              <tbody>
                {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as const).map((dir) => {
                  const r = roads[dir];
                  const isWinning = decision?.selected_direction === dir;
                  return (
                    <tr
                      key={dir}
                      className={`border-b border-slate-800/60 ${
                        isWinning ? 'bg-emerald-950/30 font-semibold' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 font-bold text-white flex items-center space-x-1.5">
                        <span>{dir}</span>
                        {isWinning && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            SELECTED
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-300">{r.counts.total}</td>
                      <td className="py-2.5 px-3 font-mono text-blue-300">{r.queue_length_meters.toFixed(0)}m</td>
                      <td className={`py-2.5 px-3 font-mono ${r.max_vehicle_wait_sec >= 60 ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                        {r.max_vehicle_wait_sec.toFixed(1)}s
                      </td>
                      <td className="py-2.5 px-3 font-mono text-purple-300">{r.pcu_total.toFixed(1)}</td>
                      <td className="py-2.5 px-3 font-mono text-emerald-400 text-sm font-bold">
                        {r.traffic_score.toFixed(1)}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                            r.signal_state === 'GREEN'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : r.signal_state === 'AMBER'
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-red-500/20 text-red-300'
                          }`}
                        >
                          {r.signal_state}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {r.starvation_risk ? (
                          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold animate-pulse">
                            THRESHOLD EXCEEDED
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-500">Normal</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
