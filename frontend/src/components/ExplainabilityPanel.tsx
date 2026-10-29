import React from 'react';
import { SignalDecision } from '../types/traffic';
import { BrainCircuit, ShieldAlert, Award, TrendingUp, CheckCircle, Info } from 'lucide-react';

interface ExplainabilityPanelProps {
  decision: SignalDecision | null;
}

export const ExplainabilityPanel: React.FC<ExplainabilityPanelProps> = ({ decision }) => {
  if (!decision) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 text-center text-slate-400">
        <BrainCircuit className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
        <p className="text-sm">Decision engine will generate an explainable allocation on the next cycle transition.</p>
      </div>
    );
  }

  const selectedDir = decision.selected_direction;
  const factorBreakdown = decision.factor_breakdowns?.[selectedDir];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      {/* Header with Winner and Starvation Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Decision Cycle #{decision.cycle_id}
              </h3>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {selectedDir} SELECTED
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Allocated Green Duration: <span className="font-semibold text-emerald-300">{decision.green_duration_sec.toFixed(1)}s</span>
            </p>
          </div>
        </div>

        {/* Starvation status badge */}
        <div>
          {decision.starvation_triggered ? (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/50 text-amber-300 text-xs font-semibold animate-pulse">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>STARVATION SAFEGUARD ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 text-xs">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Standard Multi-Factor Score</span>
            </div>
          )}
        </div>
      </div>

      {/* Plain-English Explanation Banner */}
      <div className={`p-3.5 rounded-xl border text-sm leading-relaxed ${
        decision.starvation_triggered
          ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
          : 'bg-emerald-950/30 border-emerald-500/30 text-slate-200'
      }`}>
        <div className="flex items-start space-x-2">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
          <div>
            <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider mb-0.5">
              Transparent Decision Rationale
            </div>
            <p className="font-medium text-slate-100">{decision.reason}</p>
          </div>
        </div>
      </div>

      {/* Factor Breakdown Bars for Selected Approach */}
      {factorBreakdown && (
        <div>
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Selected Approach ({selectedDir}) Factor Breakdown
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {/* Vehicle Count */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Vehicle Count ({factorBreakdown.vehicle_count.raw_value.toFixed(0)} veh)</span>
                <span className="font-mono text-cyan-400 font-bold">+{factorBreakdown.vehicle_count.weighted_score.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, factorBreakdown.vehicle_count.normalized_value)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Normalized: {factorBreakdown.vehicle_count.normalized_value}% × Weight {factorBreakdown.vehicle_count.weight}
              </div>
            </div>

            {/* Queue Length */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Queue Length ({factorBreakdown.queue_length.raw_value.toFixed(0)}m)</span>
                <span className="font-mono text-blue-400 font-bold">+{factorBreakdown.queue_length.weighted_score.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, factorBreakdown.queue_length.normalized_value)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Normalized: {factorBreakdown.queue_length.normalized_value}% × Weight {factorBreakdown.queue_length.weight}
              </div>
            </div>

            {/* Waiting Time */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>Waiting Time ({factorBreakdown.waiting_time.raw_value.toFixed(0)}s)</span>
                <span className="font-mono text-amber-400 font-bold">+{factorBreakdown.waiting_time.weighted_score.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, factorBreakdown.waiting_time.normalized_value)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Normalized: {factorBreakdown.waiting_time.normalized_value}% × Weight {factorBreakdown.waiting_time.weight}
              </div>
            </div>

            {/* Vehicle Type / PCU */}
            <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="flex justify-between text-slate-300 mb-1">
                <span>PCU Weight ({factorBreakdown.pcu_weight.raw_value.toFixed(1)} PCU)</span>
                <span className="font-mono text-purple-400 font-bold">+{factorBreakdown.pcu_weight.weighted_score.toFixed(1)} pts</span>
              </div>
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-purple-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, factorBreakdown.pcu_weight.normalized_value)}%` }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Normalized: {factorBreakdown.pcu_weight.normalized_value}% × Weight {factorBreakdown.pcu_weight.weight}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rankings Table */}
      {decision.rankings && decision.rankings.length > 0 && (
        <div className="pt-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Multi-Approach Decision Rankings
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                  <th className="py-1.5 px-2">Rank</th>
                  <th className="py-1.5 px-2">Approach</th>
                  <th className="py-1.5 px-2">Traffic Score</th>
                  <th className="py-1.5 px-2">Vehicles</th>
                  <th className="py-1.5 px-2">Max Wait</th>
                  <th className="py-1.5 px-2">Safeguard</th>
                </tr>
              </thead>
              <tbody>
                {decision.rankings.map((r, idx) => (
                  <tr
                    key={r.direction}
                    className={`border-b border-slate-800/50 ${
                      r.direction === selectedDir ? 'bg-emerald-950/20 font-semibold text-emerald-300' : ''
                    }`}
                  >
                    <td className="py-1.5 px-2 font-mono">#{idx + 1}</td>
                    <td className="py-1.5 px-2">{r.direction}</td>
                    <td className="py-1.5 px-2 font-mono text-emerald-400">{Number(r.score).toFixed(1)}</td>
                    <td className="py-1.5 px-2">{r.vehicles}</td>
                    <td className="py-1.5 px-2">{Number(r.wait_sec).toFixed(0)}s</td>
                    <td className="py-1.5 px-2">
                      {r.is_starving ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold">
                          Starving
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Normal</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
