import React, { useState } from 'react';
import { SimulationState, Direction, ScenarioType, OperatingMode } from '../types/traffic';
import { IntersectionCanvas } from '../components/IntersectionCanvas';
import { ExplainabilityPanel } from '../components/ExplainabilityPanel';
import {
  Play, Pause, RotateCcw, FastForward, Sliders, Sparkles, Cpu,
  Car, Bus, Truck, Bike, AlertCircle, Clock, ShieldCheck, Gauge
} from 'lucide-react';
import {
  startSimulation, pauseSimulation, resetSimulation, stepSimulation,
  setScenario, setOperatingMode, setSimulationSpeed
} from '../services/api';

interface SimulatorPageProps {
  state: SimulationState | null;
  onStateChange: (state: SimulationState) => void;
}

export const SimulatorPage: React.FC<SimulatorPageProps> = ({ state, onStateChange }) => {
  const [selectedDirection, setSelectedDirection] = useState<Direction>('NORTH');
  const [speed, setSpeed] = useState<number>(state?.speed_multiplier ?? 1.0);

  const isRunning = state?.is_running ?? false;
  const mode = state?.mode ?? 'ADAPTIVE_AI';
  const scenario = state?.active_scenario ?? 'MODERATE_BALANCED';
  const roads = state?.roads ?? null;
  const selectedRoad = roads ? roads[selectedDirection] : null;

  const handleTogglePlay = async () => {
    if (isRunning) {
      await pauseSimulation();
    } else {
      await startSimulation();
    }
  };

  const handleReset = async () => {
    const s = await resetSimulation();
    onStateChange(s);
  };

  const handleStep = async () => {
    const s = await stepSimulation();
    onStateChange(s);
  };

  const handleScenarioChange = async (sc: ScenarioType) => {
    const s = await setScenario(sc);
    onStateChange(s);
  };

  const handleModeChange = async (m: OperatingMode) => {
    const s = await setOperatingMode(m);
    onStateChange(s);
  };

  const handleSpeedChange = async (val: number) => {
    setSpeed(val);
    await setSimulationSpeed(val);
  };

  return (
    <div className="space-y-6">
      {/* Simulation Master Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex flex-wrap items-center justify-between gap-4">
        {/* Playback Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleTogglePlay}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-2 transition ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-700/20'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Pause Simulation</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Start Simulation</span>
              </>
            )}
          </button>

          <button
            onClick={handleStep}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
            title="Step through next decision phase"
          >
            <FastForward className="w-4 h-4" />
            <span>Step Cycle</span>
          </button>

          <button
            onClick={handleReset}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1.5 transition"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => handleModeChange('ADAPTIVE_AI')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              mode === 'ADAPTIVE_AI'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Adaptive AI</span>
          </button>
          <button
            onClick={() => handleModeChange('FIXED_TIME')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center space-x-1.5 transition ${
              mode === 'FIXED_TIME'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Fixed-Time Baseline</span>
          </button>
        </div>

        {/* Speed Multiplier */}
        <div className="flex items-center space-x-2 text-xs text-slate-300">
          <Gauge className="w-4 h-4 text-slate-400" />
          <span>Speed:</span>
          {[0.5, 1.0, 2.0, 5.0].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={`px-2 py-1 rounded text-xs font-mono font-bold transition ${
                speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Traffic Scenario Preset Selector Pills */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3">
        <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Select Traffic Scenario Preset
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'LIGHT_BALANCED', label: 'Light Balanced', desc: 'Equal low density on all roads' },
            { id: 'MODERATE_BALANCED', label: 'Moderate Balanced', desc: 'Typical city traffic demand' },
            { id: 'HEAVY_CONGESTION', label: 'Heavy Congestion', desc: 'High peak demand on all 4 roads' },
            { id: 'HIGHLY_UNBALANCED', label: 'Highly Unbalanced', desc: 'North approach heavily backlogged' },
            { id: 'STARVATION_EDGE_CASE', label: 'Starvation Safeguard Case', desc: 'West starving with 72s wait' },
            { id: 'ZERO_TRAFFIC', label: 'Zero Traffic', desc: 'Empty approaches standby test' },
            { id: 'RAPID_FLUCTUATION', label: 'Rapid Fluctuation', desc: 'Dynamic surge shifts' },
          ].map((sc) => (
            <button
              key={sc.id}
              onClick={() => handleScenarioChange(sc.id as ScenarioType)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition text-left border ${
                scenario === sc.id
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-800 hover:text-white'
              }`}
              title={sc.desc}
            >
              <div className="font-semibold">{sc.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Intersection Simulation Canvas & Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Intersection Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Top-Down Intersection Simulator</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Safe Signal Transitions
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Clock: <span className="font-mono text-emerald-400">{state?.elapsed_time_sec.toFixed(1)}s</span>
            </span>
          </div>
          <IntersectionCanvas
            roads={roads}
            currentGreenDirection={state?.current_green_direction ?? null}
            currentPhase={state?.current_phase ?? 'RED'}
            phaseTimeRemaining={state?.phase_time_remaining ?? 0}
            onSelectDirection={(dir) => setSelectedDirection(dir)}
          />
        </div>

        {/* Road Detail Inspector & Direction Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Approach Inspector Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-bold text-white">Approach Detail:</span>
                <div className="flex space-x-1">
                  {(['NORTH', 'SOUTH', 'EAST', 'WEST'] as Direction[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setSelectedDirection(d)}
                      className={`px-2 py-1 rounded text-xs font-bold transition ${
                        selectedDirection === d
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <span
                className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                  selectedRoad?.signal_state === 'GREEN'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : selectedRoad?.signal_state === 'AMBER'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-red-500/20 text-red-300 border border-red-500/40'
                }`}
              >
                {selectedRoad?.signal_state || 'RED'}
              </span>
            </div>

            {selectedRoad ? (
              <div className="space-y-4">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Total Vehicles:</span>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {selectedRoad.counts.total}{' '}
                      <span className="text-xs font-normal text-slate-400">
                        ({selectedRoad.pcu_total.toFixed(1)} PCU)
                      </span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Queue Length:</span>
                    <div className="text-xl font-bold text-white mt-0.5">
                      {selectedRoad.queue_length_meters.toFixed(0)}{' '}
                      <span className="text-xs font-normal text-slate-400">meters</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Max Wait Time:</span>
                    <div className={`text-xl font-bold mt-0.5 ${
                      selectedRoad.max_vehicle_wait_sec >= 60 ? 'text-amber-400' : 'text-white'
                    }`}>
                      {selectedRoad.max_vehicle_wait_sec.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-slate-400">sec</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                    <span className="text-slate-400">Traffic Score:</span>
                    <div className="text-xl font-bold text-emerald-400 mt-0.5">
                      {selectedRoad.traffic_score.toFixed(1)}{' '}
                      <span className="text-xs font-normal text-slate-400">/ 100</span>
                    </div>
                  </div>
                </div>

                {/* Starvation Alert if triggered */}
                {selectedRoad.starvation_risk && (
                  <div className="p-3 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>
                      Starvation Risk: Wait time ({selectedRoad.max_vehicle_wait_sec.toFixed(0)}s) has exceeded the safeguard threshold. Priority will be allocated next cycle.
                    </span>
                  </div>
                )}

                {/* Vehicle Class Counts */}
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                    Vehicle Classification Counts
                  </span>
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                      <Car className="w-4 h-4 text-cyan-400 mx-auto mb-1" />
                      <div className="font-bold text-white">{selectedRoad.counts.cars}</div>
                      <div className="text-[10px] text-slate-400">Cars</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                      <Bus className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                      <div className="font-bold text-white">{selectedRoad.counts.buses}</div>
                      <div className="text-[10px] text-slate-400">Buses</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                      <Truck className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                      <div className="font-bold text-white">{selectedRoad.counts.trucks}</div>
                      <div className="text-[10px] text-slate-400">Trucks</div>
                    </div>
                    <div className="p-2 rounded bg-slate-950/50 border border-slate-800">
                      <Bike className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                      <div className="font-bold text-white">{selectedRoad.counts.motorcycles}</div>
                      <div className="text-[10px] text-slate-400">Bikes</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-500 text-xs">
                No road state loaded yet.
              </div>
            )}
          </div>

          {/* Quick Decision Explainability */}
          <ExplainabilityPanel decision={state?.last_decision ?? null} />
        </div>
      </div>
    </div>
  );
};
