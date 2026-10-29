import React, { useState, useEffect } from 'react';
import { SimulationState, SimulationSettings } from '../types/traffic';
import { fetchSettings, updateSettings } from '../services/api';
import {
  Timer, Clock, AlertTriangle, ShieldCheck, CheckCircle2,
  Sliders, ArrowRight, Gauge, Layers, RefreshCw
} from 'lucide-react';

interface DynamicTimingPageProps {
  state: SimulationState | null;
  onSettingsUpdated?: () => void;
}

export const DynamicTimingPage: React.FC<DynamicTimingPageProps> = ({ state, onSettingsUpdated }) => {
  const [settings, setSettings] = useState<SimulationSettings | null>(null);
  const [minGreen, setMinGreen] = useState<number>(10);
  const [maxGreen, setMaxGreen] = useState<number>(60);
  const [amber, setAmber] = useState<number>(3);
  const [allRed, setAllRed] = useState<number>(1);
  const [fixedGreen, setFixedGreen] = useState<number>(25);
  const [dischargeRate, setDischargeRate] = useState<number>(0.5);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        setSettings(s);
        setMinGreen(s.min_green_sec);
        setMaxGreen(s.max_green_sec);
        setAmber(s.amber_sec);
        setAllRed(s.all_red_sec);
        setFixedGreen(s.fixed_time_green_sec);
        setDischargeRate(s.discharge_rate_veh_per_sec);
      })
      .catch(console.error);
  }, []);

  const handleSaveTimings = async () => {
    if (!settings) return;
    try {
      const updated: SimulationSettings = {
        ...settings,
        min_green_sec: minGreen,
        max_green_sec: maxGreen,
        amber_sec: amber,
        all_red_sec: allRed,
        fixed_time_green_sec: fixedGreen,
        discharge_rate_veh_per_sec: dischargeRate,
      };
      await updateSettings(updated);
      setSettings(updated);
      setSaveStatus('Signal timing parameters saved successfully!');
      onSettingsUpdated?.();
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (e: any) {
      setSaveStatus(e.message || 'Failed to save settings');
    }
  };

  const currentPhase = state?.current_phase ?? 'RED';
  const remainingTime = state?.phase_time_remaining ?? 0;
  const currentDuration = state?.current_phase_duration ?? 10;
  const progressPct = Math.min(100, Math.max(0, ((currentDuration - remainingTime) / Math.max(1, currentDuration)) * 100));

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white flex items-center space-x-2">
            <span>Dynamic Signal Timing & Safe Phase Transitions</span>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              Module 5
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configurable signal interval parameters, all-red clearance intervals, and discharge velocity limits.
          </p>
        </div>
      </div>

      {/* Live Phase Countdown Ring / Progress Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-xl border ${
              currentPhase === 'GREEN'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : currentPhase === 'AMBER'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              <Timer className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-bold text-white">Active Phase: {currentPhase}</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                  Approach: {state?.current_green_direction ?? 'ALL CLEARANCE'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Phase Duration: {currentDuration.toFixed(1)}s • Next Scheduled: <span className="font-semibold text-emerald-400">{state?.next_scheduled_direction ?? 'Pending Decision'}</span>
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-3xl font-mono font-bold text-emerald-400">
              {remainingTime.toFixed(1)}s
            </div>
            <div className="text-[11px] text-slate-400">Remaining in Active Phase</div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400">
            <span>Phase Elapsed: {(currentDuration - remainingTime).toFixed(1)}s</span>
            <span>{progressPct.toFixed(0)}% Complete</span>
          </div>
          <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                currentPhase === 'GREEN'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-400'
                  : currentPhase === 'AMBER'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                  : 'bg-gradient-to-r from-red-600 to-red-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Timing Bounds Configuration Form */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
            <Sliders className="w-4 h-4 text-emerald-400" />
            <span>Configurable Signal Timing Bounds</span>
          </div>
          <span className="text-xs text-slate-400">Enforced by Safety State Machine</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Min Green */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Min Green Duration (G_min)</span>
              <span className="font-mono text-emerald-400 font-bold">{minGreen}s</span>
            </div>
            <input
              type="range"
              min="5"
              max="25"
              step="1"
              value={minGreen}
              onChange={(e) => setMinGreen(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Guaranteed minimum green time even for low demand</div>
          </div>

          {/* Max Green */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Max Green Duration (G_max)</span>
              <span className="font-mono text-emerald-400 font-bold">{maxGreen}s</span>
            </div>
            <input
              type="range"
              min="30"
              max="90"
              step="5"
              value={maxGreen}
              onChange={(e) => setMaxGreen(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Maximum cap allocated to any heavily congested road</div>
          </div>

          {/* Amber Transition */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Amber Transition (Yellow)</span>
              <span className="font-mono text-amber-400 font-bold">{amber}s</span>
            </div>
            <input
              type="range"
              min="2"
              max="6"
              step="1"
              value={amber}
              onChange={(e) => setAmber(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Safe deceleration warning interval before red</div>
          </div>

          {/* All-Red Clearance */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">All-Red Clearance Interval</span>
              <span className="font-mono text-red-400 font-bold">{allRed}s</span>
            </div>
            <input
              type="range"
              min="0"
              max="4"
              step="1"
              value={allRed}
              onChange={(e) => setAllRed(parseInt(e.target.value))}
              className="w-full accent-red-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Junction clearance gap preventing conflicting entries</div>
          </div>

          {/* Fixed-Time Baseline Duration */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Fixed-Time Baseline Green</span>
              <span className="font-mono text-cyan-400 font-bold">{fixedGreen}s</span>
            </div>
            <input
              type="range"
              min="15"
              max="60"
              step="5"
              value={fixedGreen}
              onChange={(e) => setFixedGreen(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Default fixed timer used in conventional comparative mode</div>
          </div>

          {/* Vehicle Discharge Rate */}
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-semibold">Discharge Rate</span>
              <span className="font-mono text-purple-400 font-bold">{dischargeRate} veh/s</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.2"
              step="0.1"
              value={dischargeRate}
              onChange={(e) => setDischargeRate(parseFloat(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="text-[10px] text-slate-500">Average flow capacity (e.g. 0.5 = 1 vehicle every 2 sec)</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saveStatus ? (
            <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>
          ) : (
            <span className="text-[11px] text-slate-500">
              Timings are strictly enforced by the simulation state machine.
            </span>
          )}
          <button
            onClick={handleSaveTimings}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Save Timing Configuration</span>
          </button>
        </div>
      </div>

      {/* Safety Invariant & Prototype Disclaimer Banner */}
      <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div className="flex items-center space-x-2 text-slate-200 font-bold">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Safety Invariant Guarantee & Simulation Scope Disclaimer</span>
        </div>
        <p className="leading-relaxed">
          <strong>Signal Invariant:</strong> The software simulation state machine guarantees mathematically that conflicting green signals can never occur simultaneously. At all times, exactly one approach receives GREEN or AMBER, and during the all-red clearance phase, all four approaches are RED.
        </p>
        <p className="text-[11px] text-slate-500 italic">
          Disclaimer: This system is built strictly as an academic college engineering prototype and educational research simulation. It is not connected to, and must never be used to directly control, real-world public municipal traffic light hardware.
        </p>
      </div>
    </div>
  );
};
