import React from 'react';
import { Direction, RoadState, SignalState } from '../types/traffic';
import { AlertTriangle, Clock, Layers, Car, Bus, Truck, Bike } from 'lucide-react';

interface IntersectionCanvasProps {
  roads: Record<Direction, RoadState> | null;
  currentGreenDirection: Direction | null;
  currentPhase: SignalState;
  phaseTimeRemaining: number;
  onSelectDirection?: (dir: Direction) => void;
}

export const IntersectionCanvas: React.FC<IntersectionCanvasProps> = ({
  roads,
  currentGreenDirection,
  currentPhase,
  phaseTimeRemaining,
  onSelectDirection
}) => {
  const getSignalColor = (dir: Direction): SignalState => {
    if (!roads) return 'RED';
    return roads[dir]?.signal_state || 'RED';
  };

  const renderSignalHead = (dir: Direction, x: number, y: number, orientation: 'vertical' | 'horizontal') => {
    const state = getSignalColor(dir);
    const isGreen = state === 'GREEN';
    const isAmber = state === 'AMBER';
    const isRed = state === 'RED' || state === 'ALL_RED';

    return (
      <div
        className={`absolute p-1.5 rounded-lg bg-slate-950/95 border border-slate-700 shadow-xl flex ${
          orientation === 'vertical' ? 'flex-col space-y-1' : 'flex-row space-x-1'
        } items-center z-20`}
        style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
      >
        {/* Red light */}
        <div
          className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
            isRed
              ? 'bg-red-500 shadow-[0_0_12px_#ef4444] ring-2 ring-red-400'
              : 'bg-red-950/60 opacity-40'
          }`}
        />
        {/* Amber light */}
        <div
          className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
            isAmber
              ? 'bg-amber-400 shadow-[0_0_12px_#f59e0b] ring-2 ring-amber-300'
              : 'bg-amber-950/60 opacity-40'
          }`}
        />
        {/* Green light */}
        <div
          className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
            isGreen
              ? 'bg-emerald-400 shadow-[0_0_12px_#10b981] ring-2 ring-emerald-300'
              : 'bg-emerald-950/60 opacity-40'
          }`}
        />

        {/* Countdown badge if active */}
        {(isGreen || isAmber) && (
          <div className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-white border border-slate-600">
            {phaseTimeRemaining.toFixed(0)}s
          </div>
        )}
      </div>
    );
  };

  const renderApproachCard = (dir: Direction, positionClasses: string) => {
    const road = roads ? roads[dir] : null;
    const isSelected = currentGreenDirection === dir;
    const isStarving = road?.starvation_risk ?? false;

    return (
      <div
        onClick={() => onSelectDirection?.(dir)}
        className={`absolute ${positionClasses} z-30 p-2.5 rounded-xl border backdrop-blur-md transition cursor-pointer ${
          isSelected
            ? 'bg-slate-900/95 border-emerald-500/70 shadow-lg shadow-emerald-950/50'
            : isStarving
            ? 'bg-slate-900/95 border-amber-500/70 shadow-lg shadow-amber-950/50 animate-pulse'
            : 'bg-slate-900/85 border-slate-700/80 hover:border-slate-500'
        }`}
        style={{ minWidth: '170px' }}
      >
        <div className="flex items-center justify-between pb-1 mb-1 border-b border-slate-800">
          <span className="text-xs font-bold tracking-wider text-slate-200 flex items-center space-x-1">
            <span>{dir}</span>
            {isStarving && <AlertTriangle className="w-3.5 h-3.5 text-amber-400 inline" />}
          </span>
          <span
            className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
              road?.signal_state === 'GREEN'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                : road?.signal_state === 'AMBER'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-red-500/20 text-red-300 border border-red-500/40'
            }`}
          >
            {road?.signal_state || 'RED'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 text-[11px]">
          <div>
            <span className="text-slate-400 text-[10px]">Vehicles:</span>
            <div className="font-semibold text-slate-100 flex items-center space-x-1">
              <span>{road?.counts.total ?? 0}</span>
              <span className="text-[9px] text-slate-400">({road?.pcu_total.toFixed(0)} PCU)</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Max Wait:</span>
            <div className={`font-semibold flex items-center space-x-0.5 ${
              (road?.max_vehicle_wait_sec ?? 0) > 50 ? 'text-amber-400' : 'text-slate-200'
            }`}>
              <Clock className="w-2.5 h-2.5" />
              <span>{road?.max_vehicle_wait_sec.toFixed(0) ?? 0}s</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Queue Est:</span>
            <div className="font-semibold text-slate-200">
              {road?.queue_length_meters.toFixed(0) ?? 0}m
            </div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px]">Score:</span>
            <div className="font-bold text-emerald-400">
              {road?.traffic_score.toFixed(1) ?? '0.0'}
            </div>
          </div>
        </div>

        {/* Mini Vehicle Type Breakdown Icons */}
        <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
          <span className="flex items-center space-x-0.5 text-cyan-400" title="Cars">
            <Car className="w-2.5 h-2.5" /> {road?.counts.cars ?? 0}
          </span>
          <span className="flex items-center space-x-0.5 text-amber-400" title="Buses">
            <Bus className="w-2.5 h-2.5" /> {road?.counts.buses ?? 0}
          </span>
          <span className="flex items-center space-x-0.5 text-purple-400" title="Trucks">
            <Truck className="w-2.5 h-2.5" /> {road?.counts.trucks ?? 0}
          </span>
          <span className="flex items-center space-x-0.5 text-emerald-400" title="Motorcycles">
            <Bike className="w-2.5 h-2.5" /> {road?.counts.motorcycles ?? 0}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full aspect-[4/3] max-w-3xl mx-auto bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden select-none">
      {/* SVG Road Layout */}
      <svg className="w-full h-full" viewBox="0 0 600 600">
        <defs>
          {/* Subtle grid pattern for surrounding ground */}
          <pattern id="groundGrid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
          </pattern>
        </defs>

        {/* Grass / Ground */}
        <rect width="600" height="600" fill="#090d16" />
        <rect width="600" height="600" fill="url(#groundGrid)" />

        {/* North-South Road */}
        <rect x="220" y="0" width="160" height="600" fill="#1e222d" />
        {/* East-West Road */}
        <rect x="0" y="220" width="600" height="160" fill="#1e222d" />

        {/* Center Intersection Junction Box */}
        <rect x="220" y="220" width="160" height="160" fill="#171a23" stroke="#334155" strokeWidth="1" />

        {/* Road Border Curb Lines */}
        <line x1="220" y1="0" x2="220" y2="220" stroke="#475569" strokeWidth="2" />
        <line x1="380" y1="0" x2="380" y2="220" stroke="#475569" strokeWidth="2" />
        <line x1="220" y1="380" x2="220" y2="600" stroke="#475569" strokeWidth="2" />
        <line x1="380" y1="380" x2="380" y2="600" stroke="#475569" strokeWidth="2" />

        <line x1="0" y1="220" x2="220" y2="220" stroke="#475569" strokeWidth="2" />
        <line x1="0" y1="380" x2="220" y2="380" stroke="#475569" strokeWidth="2" />
        <line x1="380" y1="220" x2="600" y2="220" stroke="#475569" strokeWidth="2" />
        <line x1="380" y1="380" x2="600" y2="380" stroke="#475569" strokeWidth="2" />

        {/* Yellow Double Centerlines */}
        {/* North */}
        <line x1="298" y1="0" x2="298" y2="200" stroke="#eab308" strokeWidth="2" />
        <line x1="302" y1="0" x2="302" y2="200" stroke="#eab308" strokeWidth="2" />
        {/* South */}
        <line x1="298" y1="400" x2="298" y2="600" stroke="#eab308" strokeWidth="2" />
        <line x1="302" y1="400" x2="302" y2="600" stroke="#eab308" strokeWidth="2" />
        {/* West */}
        <line x1="0" y1="298" x2="200" y2="298" stroke="#eab308" strokeWidth="2" />
        <line x1="0" y1="302" x2="200" y2="302" stroke="#eab308" strokeWidth="2" />
        {/* East */}
        <line x1="400" y1="298" x2="600" y2="298" stroke="#eab308" strokeWidth="2" />
        <line x1="400" y1="302" x2="600" y2="302" stroke="#eab308" strokeWidth="2" />

        {/* Dashed Lane Dividers */}
        {/* North */}
        <line x1="260" y1="0" x2="260" y2="200" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        <line x1="340" y1="0" x2="340" y2="200" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        {/* South */}
        <line x1="260" y1="400" x2="260" y2="600" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        <line x1="340" y1="400" x2="340" y2="600" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        {/* West */}
        <line x1="0" y1="260" x2="200" y2="260" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        <line x1="0" y1="340" x2="200" y2="340" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        {/* East */}
        <line x1="400" y1="260" x2="600" y2="260" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />
        <line x1="400" y1="340" x2="600" y2="340" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="8,8" />

        {/* White Stop Lines */}
        <line x1="220" y1="200" x2="300" y2="200" stroke="#f8fafc" strokeWidth="4" /> {/* North stop line */}
        <line x1="300" y1="400" x2="380" y2="400" stroke="#f8fafc" strokeWidth="4" /> {/* South stop line */}
        <line x1="200" y1="300" x2="200" y2="380" stroke="#f8fafc" strokeWidth="4" /> {/* West stop line */}
        <line x1="400" y1="220" x2="400" y2="300" stroke="#f8fafc" strokeWidth="4" /> {/* East stop line */}

        {/* Pedestrian Zebra Crossings */}
        {/* North */}
        {[225, 245, 265, 285, 305, 325, 345, 365].map((x) => (
          <rect key={`nz-${x}`} x={x} y="206" width="12" height="10" fill="#f8fafc" opacity="0.8" />
        ))}
        {/* South */}
        {[225, 245, 265, 285, 305, 325, 345, 365].map((x) => (
          <rect key={`sz-${x}`} x={x} y="384" width="12" height="10" fill="#f8fafc" opacity="0.8" />
        ))}
        {/* West */}
        {[225, 245, 265, 285, 305, 325, 345, 365].map((y) => (
          <rect key={`wz-${y}`} x="206" y={y} width="10" height="12" fill="#f8fafc" opacity="0.8" />
        ))}
        {/* East */}
        {[225, 245, 265, 285, 305, 325, 345, 365].map((y) => (
          <rect key={`ez-${y}`} x="384" y={y} width="10" height="12" fill="#f8fafc" opacity="0.8" />
        ))}

        {/* Simulated Queued Vehicle Markers */}
        {/* North Approach Vehicles (moving south towards stopline at y=200, lanes x=240, 275) */}
        {roads && renderApproachVehiclesSVG(roads.NORTH, 'NORTH')}
        {/* South Approach Vehicles (moving north towards stopline at y=400, lanes x=320, 355) */}
        {roads && renderApproachVehiclesSVG(roads.SOUTH, 'SOUTH')}
        {/* West Approach Vehicles (moving east towards stopline at x=200, lanes y=320, 355) */}
        {roads && renderApproachVehiclesSVG(roads.WEST, 'WEST')}
        {/* East Approach Vehicles (moving west towards stopline at x=400, lanes y=240, 275) */}
        {roads && renderApproachVehiclesSVG(roads.EAST, 'EAST')}
      </svg>

      {/* Traffic Light Heads */}
      {renderSignalHead('NORTH', 35, 31, 'horizontal')}
      {renderSignalHead('SOUTH', 65, 69, 'horizontal')}
      {renderSignalHead('WEST', 31, 65, 'vertical')}
      {renderSignalHead('EAST', 69, 35, 'vertical')}

      {/* Floating Road Information Badges */}
      {renderApproachCard('NORTH', 'top-3 left-4')}
      {renderApproachCard('SOUTH', 'bottom-3 right-4')}
      {renderApproachCard('WEST', 'bottom-3 left-4')}
      {renderApproachCard('EAST', 'top-3 right-4')}
    </div>
  );
};

// Helper to draw realistic queue dots/vehicles inside the SVG road lanes
function renderApproachVehiclesSVG(road: RoadState, dir: Direction) {
  if (!road || road.counts.total === 0) return null;
  const total = road.counts.total;
  const elements = [];

  // Vehicle color map
  const colorMap = {
    car: '#06b6d4',      // cyan
    bus: '#f59e0b',      // amber
    truck: '#a855f7',    // purple
    moto: '#10b981'      // emerald
  };

  // Generate vehicle types according to counts
  const types: string[] = [];
  for (let i = 0; i < road.counts.cars; i++) types.push('car');
  for (let i = 0; i < road.counts.buses; i++) types.push('bus');
  for (let i = 0; i < road.counts.trucks; i++) types.push('truck');
  for (let i = 0; i < road.counts.motorcycles; i++) types.push('moto');

  const maxVisible = Math.min(total, 16);

  for (let i = 0; i < maxVisible; i++) {
    const vType = types[i] || 'car';
    const color = colorMap[vType as keyof typeof colorMap] || '#06b6d4';
    const lane = i % 2; // 2 lanes per approach
    const row = Math.floor(i / 2);

    if (dir === 'NORTH') {
      const x = lane === 0 ? 245 : 275;
      const y = 180 - row * 22;
      if (y > 10) {
        elements.push(
          <rect key={`nv-${i}`} x={x - 8} y={y - 7} width="16" height="14" rx="3" fill={color} stroke="#0f172a" strokeWidth="1" />
        );
      }
    } else if (dir === 'SOUTH') {
      const x = lane === 0 ? 325 : 355;
      const y = 420 + row * 22;
      if (y < 590) {
        elements.push(
          <rect key={`sv-${i}`} x={x - 8} y={y - 7} width="16" height="14" rx="3" fill={color} stroke="#0f172a" strokeWidth="1" />
        );
      }
    } else if (dir === 'WEST') {
      const y = lane === 0 ? 325 : 355;
      const x = 180 - row * 22;
      if (x > 10) {
        elements.push(
          <rect key={`wv-${i}`} x={x - 7} y={y - 8} width="14" height="16" rx="3" fill={color} stroke="#0f172a" strokeWidth="1" />
        );
      }
    } else if (dir === 'EAST') {
      const y = lane === 0 ? 245 : 275;
      const x = 420 + row * 22;
      if (x < 590) {
        elements.push(
          <rect key={`ev-${i}`} x={x - 7} y={y - 8} width="14" height="16" rx="3" fill={color} stroke="#0f172a" strokeWidth="1" />
        );
      }
    }
  }

  return <g>{elements}</g>;
}
