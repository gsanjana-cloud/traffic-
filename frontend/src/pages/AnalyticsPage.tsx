import React, { useState, useEffect } from 'react';
import { SessionSummary } from '../types/traffic';
import { fetchAnalytics, fetchHistory, fetchSessionDetail, saveCurrentSession } from '../services/api';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  LineChart, Line, XAxis, YAxis, CartesianGrid
} from 'recharts';
import {
  History, Save, CheckCircle2, FileText, ArrowRight,
  TrendingUp, Clock, Car, Layers, RefreshCw
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [selectedSessionDetail, setSelectedSessionDetail] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [an, hist] = await Promise.all([fetchAnalytics(), fetchHistory()]);
      setAnalytics(an);
      setSessions(hist);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSession = async () => {
    setIsSaving(true);
    setSaveMsg(null);
    try {
      const res = await saveCurrentSession();
      setSaveMsg(`Session #${res.session_id.slice(0, 8)} successfully saved to SQLite database!`);
      const hist = await fetchHistory();
      setSessions(hist);
      setTimeout(() => setSaveMsg(null), 3500);
    } catch (e: any) {
      setSaveMsg(e.message || 'Failed to save session');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInspectSession = async (id: string) => {
    try {
      const detail = await fetchSessionDetail(id);
      setSelectedSessionDetail(detail);
    } catch (err) {
      console.error(err);
    }
  };

  // Vehicle class chart data
  const dist = analytics?.vehicle_distribution || { car: 0, bus: 0, truck: 0, motorcycle: 0 };
  const vehiclePieData = [
    { name: 'Cars', value: dist.car, color: '#06b6d4' },
    { name: 'Buses', value: dist.bus, color: '#f59e0b' },
    { name: 'Trucks', value: dist.truck, color: '#a855f7' },
    { name: 'Motorcycles', value: dist.motorcycle, color: '#10b981' },
  ];

  // Green duration history data
  const decisions = analytics?.recent_decisions || [];
  const decisionLineData = decisions.map((d: any) => ({
    cycle: `#${d.cycle_id}`,
    duration: d.green_duration_sec,
    direction: d.selected_direction,
    starving: d.starvation_triggered ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Top Header & Save Button */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Analytics Dashboard & SQLite Session History</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40">
              Module 7
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical run tracking, vehicle class breakdown, and decision timeline records.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handleSaveSession}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving...' : 'Save Current Session'}</span>
          </button>
        </div>
      </div>

      {saveMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{saveMsg}</span>
        </div>
      )}

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Vehicle Class Distribution Donut */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Active Vehicle Class Distribution (PCU Weighted)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={vehiclePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {vehiclePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dynamic Green Phase Duration Over Cycles */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
            Green Duration Allocation Trend (Recent Cycles)
          </h3>
          <div className="h-64">
            {decisionLineData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={decisionLineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="cycle" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="duration"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ fill: '#10b981', r: 4 }}
                    name="Allocated Green (s)"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-500">
                Run simulation cycles to generate allocation history trends.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Simulation Sessions Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            SQLite Persisted Simulation Runs & History
          </h3>
          <span className="text-[11px] text-slate-400">{sessions.length} saved sessions logged</span>
        </div>

        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300 border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] bg-slate-950/40">
                  <th className="py-2.5 px-3">Session ID</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Scenario</th>
                  <th className="py-2.5 px-3">Duration</th>
                  <th className="py-2.5 px-3">Processed</th>
                  <th className="py-2.5 px-3">Avg Wait</th>
                  <th className="py-2.5 px-3">Utilization</th>
                  <th className="py-2.5 px-3">Inspect</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                    <td className="py-2 px-3 font-mono text-slate-400">{s.id.slice(0, 8)}...</td>
                    <td className="py-2 px-3">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                        s.mode === 'ADAPTIVE_AI' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                      }`}>
                        {s.mode}
                      </span>
                    </td>
                    <td className="py-2 px-3">{s.scenario}</td>
                    <td className="py-2 px-3 font-mono">{s.duration_sec.toFixed(0)}s</td>
                    <td className="py-2 px-3 font-mono text-cyan-300">{s.total_vehicles_processed}</td>
                    <td className="py-2 px-3 font-mono text-amber-300">{s.avg_wait_sec.toFixed(1)}s</td>
                    <td className="py-2 px-3 font-mono text-emerald-400">{s.green_utilization_pct.toFixed(0)}%</td>
                    <td className="py-2 px-3">
                      <button
                        onClick={() => handleInspectSession(s.id)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white transition text-[11px] flex items-center space-x-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500 text-xs">
            No historical sessions saved in SQLite yet. Click &quot;Save Current Session&quot; to archive a test run.
          </div>
        )}
      </div>

      {/* Session Detail Modal / Inspector */}
      {selectedSessionDetail && (
        <div className="p-5 rounded-xl bg-slate-950 border border-slate-700 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h4 className="text-sm font-bold text-white flex items-center space-x-2">
              <span>Session Detail: {selectedSessionDetail.id}</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                {selectedSessionDetail.mode}
              </span>
            </h4>
            <button
              onClick={() => setSelectedSessionDetail(null)}
              className="text-slate-400 hover:text-white text-xs"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Total Cycles:</span>
              <div className="text-base font-bold text-white">{selectedSessionDetail.total_cycles}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Vehicles Processed:</span>
              <div className="text-base font-bold text-cyan-300">{selectedSessionDetail.total_vehicles_processed}</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Avg Wait Time:</span>
              <div className="text-base font-bold text-amber-300">{selectedSessionDetail.avg_wait_sec.toFixed(1)}s</div>
            </div>
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
              <span className="text-slate-400">Green Utilization:</span>
              <div className="text-base font-bold text-emerald-400">{selectedSessionDetail.green_utilization_pct.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
