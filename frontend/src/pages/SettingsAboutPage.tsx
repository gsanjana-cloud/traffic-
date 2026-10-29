import React, { useState, useEffect } from 'react';
import { SimulationSettings } from '../types/traffic';
import { fetchSettings, updateSettings } from '../services/api';
import {
  Sliders, Info, BookOpen, Layers, ShieldCheck, ArrowRight,
  Cpu, Sparkles, CheckCircle2, AlertTriangle, ExternalLink
} from 'lucide-react';

export const SettingsAboutPage: React.FC = () => {
  const [settings, setSettings] = useState<SimulationSettings | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error);
  }, []);

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Banner */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-emerald-400" />
          <span>System Architecture & Project Documentation</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Engineering College Final Year Prototype: AI-Based Automated Traffic Signal Control System Using Computer Vision.
        </p>
      </div>

      {/* 1. The Problem with Fixed-Time Signals */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-amber-400">
          <AlertTriangle className="w-4 h-4" />
          <h3>1. The Problem: Limitations of Conventional Fixed-Time Signals</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Traditional traffic signals operate on fixed-time cycle plans designed from historical averages. While simple to deploy, fixed timers have critical structural inefficiencies:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
          <li>
            <strong>Empty Green Phases:</strong> Green signals are repeatedly allocated to empty approaches while queued vehicles on intersecting roads remain forced to idle.
          </li>
          <li>
            <strong>Fuel Wastage & Emissions:</strong> Unnecessary deceleration, stop cycles, and excessive idling contribute directly to urban CO2 emissions and fuel waste.
          </li>
          <li>
            <strong>Inability to Handle Asymmetric Surges:</strong> During rush hours or sporting events, directional surges overwhelm pre-programmed timers, causing cascading urban gridlock.
          </li>
          <li>
            <strong>Traffic Starvation vs. Congestion:</strong> Naive adaptive systems that merely give green to the biggest queue permanently starve minor roads.
          </li>
        </ul>
      </div>

      {/* 2. Proposed Computer-Vision-Based Solution */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-3">
        <div className="flex items-center space-x-2 text-sm font-bold text-emerald-400">
          <Sparkles className="w-4 h-4" />
          <h3>2. The Proposed Computer-Vision & Adaptive Solution</h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Our proposed system replaces rigid timers with an intelligent computer-vision perception pipeline coupled with an explainable multi-factor decision engine:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-cyan-400">1. Real-Time Vision Perception</span>
            <p className="text-slate-400 text-[11px]">
              YOLOv8 detects, classifies, and counts vehicles across North, South, East, and West approaches with PCU weighting.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-emerald-400">2. Multi-Factor Optimization</span>
            <p className="text-slate-400 text-[11px]">
              Combines normalized vehicle counts, queue lengths, passenger car units (PCU), and waiting times into an explainable score.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <span className="font-bold text-amber-400">3. Starvation Safeguard</span>
            <p className="text-slate-400 text-[11px]">
              An explicit priority override prevents high-volume corridors from locking out low-volume approaches past a configured threshold.
            </p>
          </div>
        </div>
      </div>

      {/* 3. System Architecture Diagram */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
        <div className="flex items-center space-x-2 text-sm font-bold text-white">
          <Layers className="w-4 h-4 text-emerald-400" />
          <h3>3. Complete System Processing Pipeline</h3>
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-emerald-300 overflow-x-auto space-y-2">
          <div className="flex items-center space-x-2 text-slate-200">
            <span>[Video Stream / CCTV]</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[OpenCV Frame Ingestion]</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-cyan-400">[YOLOv8 Vehicle Detection]</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200 pl-8">
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[Vehicle Classification & PCU Computation]</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[Queue & Delay Estimation]</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200 pl-16">
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-emerald-400">[Explainable Multi-Factor Decision Engine]</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-amber-400">[Starvation Override Rule]</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200 pl-24">
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[Dynamic Signal Timing (G_min to G_max)]</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[Safe State Machine (Green → Amber → All-Red)]</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-200 pl-32">
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>[Real-Time Dashboard & SQLite Session Telemetry]</span>
          </div>
        </div>
      </div>

      {/* 4. The Six Required System Modules */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white mb-2">4. The Six Connected Modules</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-cyan-400 mb-1">Module 1: Video Acquisition</div>
            <p className="text-slate-400 text-[11px]">
              Ingests CCTV video feeds, webcam streams via WebRTC, or uploaded static traffic frames for processing.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-blue-400 mb-1">Module 2: Vehicle Detection</div>
            <p className="text-slate-400 text-[11px]">
              Ultralytics YOLOv8 inference with COCO weights detects and tracks cars, buses, trucks, and two-wheelers.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-purple-400 mb-1">Module 3: Vehicle Counting</div>
            <p className="text-slate-400 text-[11px]">
              Aggregates counts per approach direction while avoiding duplicate registrations through spatial bounding tracking.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-amber-400 mb-1">Module 4: Traffic Analysis</div>
            <p className="text-slate-400 text-[11px]">
              Estimates queue lengths in meters, passenger car equivalent units (PCU), and accumulated vehicle delays.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-emerald-400 mb-1">Module 5: Signal Decision Engine</div>
            <p className="text-slate-400 text-[11px]">
              Multi-factor algorithm selects the optimal approach and green duration, enforcing starvation prevention rules.
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="font-bold text-emerald-300 mb-1">Module 6: Visualization & Evaluation</div>
            <p className="text-slate-400 text-[11px]">
              Top-down 4-way intersection canvas, signal timers, explainability rationales, and comparative benchmark analytics.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Advantages & Engineering Limitations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Demonstrated System Advantages</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li><strong>Demand-Responsive:</strong> Reduces average vehicle delay by up to 35-45% under unbalanced traffic.</li>
            <li><strong>Starvation-Immune:</strong> Guarantees fair service even for small roads with high accumulated waiting time.</li>
            <li><strong>Explainable AI:</strong> Operators receive a clear, human-readable rationale for every signal decision.</li>
            <li><strong>Zero Hardware Cost:</strong> Runs in software simulation with optional real CCTV / webcam inference.</li>
          </ul>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4" />
            <span>Prototype Limitations</span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-400">
            <li><strong>Camera Occlusion:</strong> Large vehicles can block smaller motorcycles in crowded single-camera views.</li>
            <li><strong>Adverse Weather:</strong> Heavy rain, dense fog, or darkness degrades camera recall without infrared.</li>
            <li><strong>Isolated Junction Scope:</strong> Prototype operates on an isolated 4-way intersection without green-wave corridor coordination.</li>
          </ul>
        </div>
      </div>

      {/* 6. Future Scope & Academic Attribution */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg space-y-3">
        <h3 className="text-sm font-bold text-white">6. Future Scope & Research Roadmap</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Future enhancements to this prototype architecture include:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-cyan-400 block mb-1">ByteTrack / DeepSORT</span>
            <span className="text-slate-400 text-[11px]">Continuous trajectory tracking across camera blind spots with re-identification.</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-red-400 block mb-1">Emergency Vehicle Preemption</span>
            <span className="text-slate-400 text-[11px]">Audio siren detection and visual emergency vehicle classification for immediate green corridors.</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="font-bold text-emerald-400 block mb-1">Multi-Agent RL / V2X</span>
            <span className="text-slate-400 text-[11px]">Coordinated corridor optimization linking adjacent intersections using Vehicle-to-Infrastructure (V2I).</span>
          </div>
        </div>

        {/* Academic Contribution Statement */}
        <div className="mt-4 pt-3 border-t border-slate-800 text-xs text-slate-400 leading-relaxed">
          <strong className="text-slate-200">Academic Project Contribution:</strong> The core engineering contribution of this project is an <em>explainable, multi-factor adaptive signal-allocation algorithm with strict starvation-prevention rules</em>, comprehensively evaluated against a standardized fixed-time baseline under identical demand conditions.
        </div>
      </div>
    </div>
  );
};
