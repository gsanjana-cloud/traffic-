import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Activity, Cpu, Sparkles, CheckCircle2 } from 'lucide-react';
import { SimulationState, ScenarioType, OperatingMode } from '../types/traffic';
import { startSimulation, pauseSimulation, resetSimulation, stepSimulation, setScenario, setOperatingMode } from '../services/api';

interface NavbarProps {
  state: SimulationState | null;
  onStateChange: (state: SimulationState) => void;
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ state, onStateChange, isConnected }) => {
  const isRunning = state?.is_running ?? false;
  const mode = state?.mode ?? 'ADAPTIVE_AI';
  const scenario = state?.active_scenario ?? 'MODERATE_BALANCED';

  const handleTogglePlay = async () => {
    try {
      if (isRunning) {
        await pauseSimulation();
        if (state) onStateChange({ ...state, is_running: false });
      } else {
        await startSimulation();
        if (state) onStateChange({ ...state, is_running: true });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleReset = async () => {
    try {
      const newState = await resetSimulation();
      onStateChange(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleStep = async () => {
    try {
      const newState = await stepSimulation();
      onStateChange(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleScenarioChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      const newState = await setScenario(e.target.value as ScenarioType);
      onStateChange(newState);
    } catch (e) {
      console.error(e);
    }
  };

  const handleModeToggle = async () => {
    try {
      const newMode: OperatingMode = mode === 'ADAPTIVE_AI' ? 'FIXED_TIME' : 'ADAPTIVE_AI';
      const newState = await setOperatingMode(newMode);
      onStateChange(newState);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Title & Branding */}
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Activity className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                AI Traffic Signal Control System
              </h1>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                v1.0 • YOLOv8
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">
              Explainable Computer-Vision Adaptive Signal Allocation & Dynamic Queue Optimization
            </p>
          </div>
        </div>

        {/* Live Controls Bar */}
        <div className="flex items-center space-x-2 sm:space-x-3 flex-wrap">
          {/* Operating Mode Toggle */}
          <button
            onClick={handleModeToggle}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border ${
              mode === 'ADAPTIVE_AI'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/80 shadow-sm shadow-emerald-900/20'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/40 hover:bg-amber-900/80'
            }`}
            title="Click to switch between Adaptive AI & Fixed-Time"
          >
            {mode === 'ADAPTIVE_AI' ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Adaptive AI</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-amber-400" />
                <span>Fixed-Time Baseline</span>
              </>
            )}
          </button>

          {/* Scenario Selector */}
          <select
            value={scenario}
            onChange={handleScenarioChange}
            aria-label="Traffic Scenario Selection"
            className="bg-slate-800 text-xs text-slate-200 border border-slate-700 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="LIGHT_BALANCED">Light Balanced</option>
            <option value="MODERATE_BALANCED">Moderate Balanced</option>
            <option value="HEAVY_CONGESTION">Heavy Congestion</option>
            <option value="HIGHLY_UNBALANCED">Highly Unbalanced (North)</option>
            <option value="STARVATION_EDGE_CASE">Starvation Safeguard Case</option>
            <option value="ZERO_TRAFFIC">Zero Traffic (Standby)</option>
            <option value="RAPID_FLUCTUATION">Rapid Fluctuation</option>
          </select>

          {/* Play / Pause */}
          <button
            onClick={handleTogglePlay}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition ${
              isRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-700/30'
            }`}
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run</span>
              </>
            )}
          </button>

          {/* Step 1 Cycle */}
          <button
            onClick={handleStep}
            className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center space-x-1 transition"
            title="Advance one signal phase immediately"
          >
            <FastForward className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Next Phase</span>
          </button>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="p-1.5 rounded-lg text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* WebSocket status */}
          <div
            className="flex items-center space-x-1 text-[11px] px-2 py-1 rounded bg-slate-800/80 border border-slate-700/80"
            title={isConnected ? 'Live WebSocket Connected' : 'Reconnecting WebSocket...'}
          >
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-slate-400 hidden lg:inline">{isConnected ? 'Live Stream' : 'Offline'}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
