import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Camera,
  BrainCircuit,
  Timer,
  BarChart3,
  History,
  Sliders
} from 'lucide-react';

export type TabId =
  | 'overview'
  | 'simulator'
  | 'detection'
  | 'decision'
  | 'timing'
  | 'evaluation'
  | 'analytics'
  | 'settings';

interface SidebarProps {
  currentTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const navItems: NavItem[] = [
    { id: 'overview', label: 'Overview Dashboard', icon: LayoutDashboard },
    { id: 'simulator', label: 'Intersection Simulator', icon: Activity, badge: 'Live' },
    { id: 'detection', label: 'AI Vehicle Detection', icon: Camera, badge: 'YOLO' },
    { id: 'decision', label: 'Traffic Decision Engine', icon: BrainCircuit, badge: 'Core' },
    { id: 'timing', label: 'Dynamic Signal Timing', icon: Timer },
    { id: 'evaluation', label: 'Performance Evaluation', icon: BarChart3, badge: 'AI vs Fixed' },
    { id: 'analytics', label: 'Analytics & History', icon: History },
    { id: 'settings', label: 'Settings & Architecture', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0">
      <div className="py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Navigation Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition group ${
                isActive
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon
                  className={`w-4 h-4 transition ${
                    isActive ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* College Project Badge Footer */}
      <div className="p-3 m-3 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
        <div className="font-semibold text-slate-200 flex items-center justify-between mb-1">
          <span>Project Prototype</span>
          <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded">B.Tech</span>
        </div>
        <p className="text-[11px] leading-relaxed text-slate-400">
          Engineering College Final Year Prototype. Explainable Multi-Factor Adaptive Signal Control.
        </p>
      </div>
    </aside>
  );
};
