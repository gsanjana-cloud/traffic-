import React, { useState, useEffect } from 'react';
import { EvaluationComparison } from '../types/traffic';
import { fetchEvaluation, getExportCsvUrl } from '../services/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  BarChart3, Download, RefreshCw, Sparkles, Cpu,
  TrendingDown, TrendingUp, CheckCircle, AlertCircle, Clock
} from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  const [data, setData] = useState<EvaluationComparison | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadEvaluation = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetchEvaluation();
      setData(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load evaluation');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEvaluation();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-24 space-y-3">
        <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-400">Computing synchronized benchmark comparison against Fixed-Time baseline...</p>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className="p-6 bg-red-950/20 border border-red-500/30 rounded-xl text-center text-xs text-red-300 space-y-3">
        <p>{errorMsg || 'No evaluation data available'}</p>
        <button
          onClick={loadEvaluation}
          className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold transition inline-flex items-center space-x-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Retry Benchmark Run</span>
        </button>
      </div>
    );
  }

  const adapt = data.adaptive_metrics;
  const fixed = data.fixed_metrics;
  const imp = data.improvements;

  // Chart data: Average wait time per direction
  const chartWaitByDirection = (['NORTH', 'SOUTH', 'EAST', 'WEST'] as const).map((dir) => ({
    direction: dir,
    Adaptive: adapt.direction_metrics?.[dir]?.avg_wait_sec ?? 0,
    FixedTime: fixed.direction_metrics?.[dir]?.avg_wait_sec ?? 0,
  }));

  // Chart data: Overall metric comparison
  const chartOverall = [
    { metric: 'Avg Wait (s)', Adaptive: adapt.avg_waiting_time_sec, FixedTime: fixed.avg_waiting_time_sec },
    { metric: 'Max Wait (s)', Adaptive: adapt.max_waiting_time_sec, FixedTime: fixed.max_waiting_time_sec },
    { metric: 'Avg Queue (m)', Adaptive: adapt.avg_queue_length_m, FixedTime: fixed.avg_queue_length_m },
    { metric: 'Green Util (%)', Adaptive: adapt.green_utilization_pct, FixedTime: fixed.green_utilization_pct },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Export CSV */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Rigorous Performance Evaluation & Baseline Benchmark</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/40">
              Adaptive vs Fixed-Time
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Scenario: <span className="font-semibold text-emerald-300">{data.scenario}</span> • Test Duration: <span className="font-mono text-slate-300">{data.simulation_duration_sec.toFixed(0)}s</span>
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadEvaluation}
            className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center space-x-1.5 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Re-Run Comparison</span>
          </button>
          <a
            href={getExportCsvUrl()}
            download="traffic_simulation_evaluation.csv"
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      {/* Summary Narrative Banner */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-200 leading-relaxed flex items-start space-x-3">
        <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <div className="font-bold text-white mb-0.5">Simulation Evaluation Report</div>
          <p className="text-slate-300">{data.summary}</p>
        </div>
      </div>

      {/* Side-by-Side Key Metrics Comparison Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Waiting Time */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Average Vehicle Delay</span>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{adapt.avg_waiting_time_sec.toFixed(1)}s</div>
              <div className="text-[10px] text-slate-500">Adaptive AI</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-400">{fixed.avg_waiting_time_sec.toFixed(1)}s</div>
              <div className="text-[10px] text-slate-500">Fixed-Time</div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Delay Reduction:</span>
            {imp.avg_waiting_time !== null ? (
              <span className={`font-mono font-bold ${imp.avg_waiting_time >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {imp.avg_waiting_time >= 0 ? `-${imp.avg_waiting_time}%` : `+${Math.abs(imp.avg_waiting_time)}%`}
              </span>
            ) : (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
        </div>

        {/* Max Waiting Time */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Maximum Delay (Starvation Guard)</span>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{adapt.max_waiting_time_sec.toFixed(1)}s</div>
              <div className="text-[10px] text-slate-500">Adaptive AI</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-400">{fixed.max_waiting_time_sec.toFixed(1)}s</div>
              <div className="text-[10px] text-slate-500">Fixed-Time</div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Peak Wait Reduction:</span>
            {imp.max_waiting_time !== null ? (
              <span className={`font-mono font-bold ${imp.max_waiting_time >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {imp.max_waiting_time >= 0 ? `-${imp.max_waiting_time}%` : `+${Math.abs(imp.max_waiting_time)}%`}
              </span>
            ) : (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
        </div>

        {/* Green-Time Utilization */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Green-Time Utilization</span>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{adapt.green_utilization_pct.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-500">Adaptive AI</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-400">{fixed.green_utilization_pct.toFixed(1)}%</div>
              <div className="text-[10px] text-slate-500">Fixed-Time</div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Efficiency Gain:</span>
            {imp.green_utilization !== null ? (
              <span className={`font-mono font-bold ${imp.green_utilization >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {imp.green_utilization >= 0 ? `+${imp.green_utilization}%` : `${imp.green_utilization}%`}
              </span>
            ) : (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
        </div>

        {/* Unnecessary Stops */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Unnecessary Stops (Empty Green)</span>
          <div className="flex items-baseline justify-between">
            <div>
              <div className="text-2xl font-bold text-emerald-400">{adapt.unnecessary_stops}</div>
              <div className="text-[10px] text-slate-500">Adaptive AI</div>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-slate-400">{fixed.unnecessary_stops}</div>
              <div className="text-[10px] text-slate-500">Fixed-Time</div>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Stops Avoided:</span>
            {imp.unnecessary_stops !== null ? (
              <span className={`font-mono font-bold ${imp.unnecessary_stops >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {imp.unnecessary_stops >= 0 ? `-${imp.unnecessary_stops}%` : `+${Math.abs(imp.unnecessary_stops)}%`}
              </span>
            ) : (
              <span className="text-slate-500">N/A</span>
            )}
          </div>
        </div>
      </div>

      {/* Comparison Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Waiting Time by Direction Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
            Average Waiting Time by Approach Direction (Seconds)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartWaitByDirection} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="direction" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Adaptive" fill="#10b981" radius={[4, 4, 0, 0]} name="Adaptive AI" />
                <Bar dataKey="FixedTime" fill="#64748b" radius={[4, 4, 0, 0]} name="Fixed-Time Baseline" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Overall System Metrics Chart */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
            System Performance Metrics Comparison
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartOverall} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="metric" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                <Bar dataKey="Adaptive" fill="#06b6d4" radius={[4, 4, 0, 0]} name="Adaptive AI" />
                <Bar dataKey="FixedTime" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Fixed-Time Baseline" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Side-by-Side Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Complete Comparative Results Matrix
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300 border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                <th className="py-2.5 px-3">Evaluation Metric</th>
                <th className="py-2.5 px-3 text-emerald-400">Adaptive AI Mode</th>
                <th className="py-2.5 px-3 text-slate-400">Fixed-Time Baseline</th>
                <th className="py-2.5 px-3">Improvement (%)</th>
                <th className="py-2.5 px-3">Engineering Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 px-3 font-medium text-white">Average Vehicle Waiting Time</td>
                <td className="py-2 px-3 font-mono font-bold text-emerald-400">{adapt.avg_waiting_time_sec.toFixed(1)}s</td>
                <td className="py-2 px-3 font-mono text-slate-400">{fixed.avg_waiting_time_sec.toFixed(1)}s</td>
                <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                  {imp.avg_waiting_time !== null ? `${imp.avg_waiting_time > 0 ? '-' : ''}${Math.abs(imp.avg_waiting_time)}%` : 'N/A'}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">Dynamic phase durations clear backlogged queues faster</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 px-3 font-medium text-white">Maximum Waiting Time</td>
                <td className="py-2 px-3 font-mono font-bold text-emerald-400">{adapt.max_waiting_time_sec.toFixed(1)}s</td>
                <td className="py-2 px-3 font-mono text-slate-400">{fixed.max_waiting_time_sec.toFixed(1)}s</td>
                <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                  {imp.max_waiting_time !== null ? `${imp.max_waiting_time > 0 ? '-' : ''}${Math.abs(imp.max_waiting_time)}%` : 'N/A'}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">Starvation safeguard enforces a strict upper ceiling on delay</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 px-3 font-medium text-white">Green-Time Utilization</td>
                <td className="py-2 px-3 font-mono font-bold text-emerald-400">{adapt.green_utilization_pct.toFixed(1)}%</td>
                <td className="py-2 px-3 font-mono text-slate-400">{fixed.green_utilization_pct.toFixed(1)}%</td>
                <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                  {imp.green_utilization !== null ? `+${imp.green_utilization}%` : 'N/A'}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">Green phases are cut early once queues discharge, avoiding empty roads</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 px-3 font-medium text-white">Vehicles Processed per Cycle</td>
                <td className="py-2 px-3 font-mono font-bold text-emerald-400">
                  {(adapt.total_processed / Math.max(1, adapt.cycles)).toFixed(1)} veh/cycle
                </td>
                <td className="py-2 px-3 font-mono text-slate-400">
                  {(fixed.total_processed / Math.max(1, fixed.cycles)).toFixed(1)} veh/cycle
                </td>
                <td className="py-2 px-3 font-mono text-slate-300">Measured</td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">Capacity matching demand reduces lost startup time per phase</td>
              </tr>
              <tr className="border-b border-slate-800/60">
                <td className="py-2 px-3 font-medium text-white">Unnecessary Stops (Empty Green)</td>
                <td className="py-2 px-3 font-mono font-bold text-emerald-400">{adapt.unnecessary_stops}</td>
                <td className="py-2 px-3 font-mono text-slate-400">{fixed.unnecessary_stops}</td>
                <td className="py-2 px-3 font-mono text-emerald-300 font-bold">
                  {imp.unnecessary_stops !== null ? `${imp.unnecessary_stops > 0 ? '-' : ''}${Math.abs(imp.unnecessary_stops)}%` : 'N/A'}
                </td>
                <td className="py-2 px-3 text-slate-400 text-[11px]">Fixed timers force stopped queues while green is wasted on empty approaches</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
