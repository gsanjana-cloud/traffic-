import React from 'react';
import { SimulationState, Direction } from '../types/traffic';
import { MetricCard } from '../components/MetricCard';
import { IntersectionCanvas } from '../components/IntersectionCanvas';
import { ExplainabilityPanel } from '../components/ExplainabilityPanel';
import {
  Car,
  CheckCircle2,
  Clock,
  Navigation,
  Activity,
  Layers,
  Cpu,
  ShieldCheck
} from 'lucide-react';

interface OverviewPageProps {
  state: SimulationState | null;
  onSelectDirection?: (dir: Direction) => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({ state, onSelectDirection }) => {
  const activeVehicles = state?.total_vehicles_active ?? 0;
  const processed = state?.total_vehicles_processed ?? 0;
  const currentGreen = state?.current_green_direction ?? 'ALL RED';
  const avgWait = state?.average_system_wait_sec ?? 0;
  const longestRoad = state?.longest_waiting_road ?? 'None';
  const mode = state?.mode === 'ADAPTIVE_AI' ? 'Adaptive AI' : 'Fixed-Time';
  const cycles = state?.cycle_count ?? 0;
  const phase = state?.current_phase ?? 'RED';
  const remainingTime = state?.phase_time_remaining ?? 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Alert / Status */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">System Status: Active Simulation</h2>
            <p className="text-xs text-slate-400">
              Operating Mode: <span className="font-semibold text-emerald-400">{mode}</span> • Scenario: <span className="text-slate-300 font-mono">{state?.active_scenario}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 text-xs font-mono">
          <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            Clock: {state?.elapsed_time_sec.toFixed(1)}s
          </span>
          <span className="px-2.5 py-1 rounded-md bg-slate-800 border border-slate-700 text-slate-300">
            Phase: {phase} ({remainingTime.toFixed(0)}s)
          </span>
        </div>
      </div>

      {/* KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          title="Active Vehicles"
          value={activeVehicles}
          unit="queued"
          subtext="Total across 4 approaches"
          icon={Car}
          color="cyan"
        />
        <MetricCard
          title="Vehicles Processed"
          value={processed}
          unit="discharged"
          subtext="Completed stopline crossings"
          icon={CheckCircle2}
          color="emerald"
        />
        <MetricCard
          title="Average Wait Time"
          value={avgWait.toFixed(1)}
          unit="sec"
          subtext="System-wide mean delay"
          icon={Clock}
          color="amber"
          badge={avgWait > 40 ? 'High Delay' : 'Optimal'}
        />
        <MetricCard
          title="Active Green Approach"
          value={currentGreen}
          subtext={`Phase: ${phase}`}
          icon={Navigation}
          color="emerald"
          badge={`${remainingTime.toFixed(0)}s left`}
        />
        <MetricCard
          title="Longest Waiting Road"
          value={longestRoad}
          subtext="Max accumulated queue wait"
          icon={Activity}
          color="purple"
        />
        <MetricCard
          title="Signal Cycles"
          value={cycles}
          unit="completed"
          subtext="Phase transitions logged"
          icon={Layers}
          color="blue"
        />
        <MetricCard
          title="Control Algorithm"
          value={mode}
          subtext="Dynamic Multi-Factor"
          icon={Cpu}
          color="emerald"
        />
        <MetricCard
          title="Active Phase State"
          value={phase}
          subtext={`${remainingTime.toFixed(1)}s remaining in phase`}
          icon={ShieldCheck}
          color={phase === 'GREEN' ? 'emerald' : phase === 'AMBER' ? 'amber' : 'red'}
        />
      </div>

      {/* Main Grid: Visual Intersection Canvas & Decision Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Visual Intersection Canvas (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Top-Down Intersection Simulator</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Live 4-Way Junction
              </span>
            </h3>
            <span className="text-xs text-slate-400">Click any approach to inspect details</span>
          </div>
          <IntersectionCanvas
            roads={state?.roads ?? null}
            currentGreenDirection={state?.current_green_direction ?? null}
            currentPhase={state?.current_phase ?? 'RED'}
            phaseTimeRemaining={state?.phase_time_remaining ?? 0}
            onSelectDirection={onSelectDirection}
          />
        </div>

        {/* Explainability Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <ExplainabilityPanel decision={state?.last_decision ?? null} />
        </div>
      </div>
    </div>
  );
};
