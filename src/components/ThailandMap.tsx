import React, { useState } from 'react';
import { LocationItem, PROVINCE_MAP } from '../types';

interface ThailandMapProps {
  locations: LocationItem[];
  hoveredLocationId: string | null;
  setHoveredLocationId: (id: string | null) => void;
  colorMode?: 'dark' | 'light' | 'grayscale';
}

export const ThailandMap: React.FC<ThailandMapProps> = ({
  locations,
  hoveredLocationId,
  setHoveredLocationId,
  colorMode = 'dark',
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);

  const isDark = colorMode === 'dark';
  const isGrayscale = colorMode === 'grayscale';

  // Theme-aware style helpers
  const cardBgClass = isDark
    ? 'bg-slate-900/80'
    : isGrayscale
    ? 'bg-white border-slate-300'
    : 'bg-white/95 border-slate-200 shadow-sm';

  const cardBorderClass = (isHovered: boolean, status: string) => {
    if (isHovered) {
      return isDark 
        ? 'border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)] bg-slate-900/95 scale-[1.04]' 
        : isGrayscale
        ? 'border-slate-800 shadow-sm bg-slate-50 scale-[1.04]'
        : 'border-emerald-500 shadow-md bg-white scale-[1.04]';
    }
    if (status === 'ติดตั้งแล้ว') {
      return isDark 
        ? 'border-cyan-500/30 hover:border-cyan-400/60' 
        : isGrayscale
        ? 'border-slate-200 hover:border-slate-400'
        : 'border-cyan-200 hover:border-cyan-300';
    } else {
      return isDark 
        ? 'border-amber-500/30 hover:border-amber-400/60' 
        : isGrayscale
        ? 'border-slate-200 hover:border-slate-400'
        : 'border-amber-200 hover:border-amber-300';
    }
  };

  const badgeSuccessClass = isDark
    ? 'bg-cyan-500/10 text-cyan-400'
    : isGrayscale
    ? 'bg-slate-100 text-slate-800 border border-slate-300'
    : 'bg-cyan-50 text-cyan-700 border border-cyan-100';

  const badgeProgressClass = isDark
    ? 'bg-amber-500/10 text-amber-400'
    : isGrayscale
    ? 'bg-slate-100 text-slate-800 border border-slate-300'
    : 'bg-amber-50 text-amber-700 border border-amber-100';

  const numberCircleClass = (status: string) => {
    if (status === 'ติดตั้งแล้ว') {
      return isDark
        ? 'bg-cyan-950/80 text-cyan-400 border-cyan-400/80'
        : isGrayscale
        ? 'bg-slate-100 text-slate-800 border-slate-400'
        : 'bg-cyan-50 text-cyan-600 border-cyan-200';
    } else {
      return isDark
        ? 'bg-amber-950/80 text-amber-400 border-amber-400/80'
        : isGrayscale
        ? 'bg-slate-100 text-slate-800 border-slate-400'
        : 'bg-amber-50 text-amber-600 border-amber-200';
    }
  };

  const textNameClass = isDark ? 'text-white' : isGrayscale ? 'text-black font-bold' : 'text-slate-800';
  const textSubClass = isDark ? 'text-slate-400' : 'text-slate-500';
  const textCapacityClass = isDark ? 'text-emerald-400' : isGrayscale ? 'text-slate-900 font-bold' : 'text-emerald-600';

  // Predefined left/right slots for callout cards to draw elegant pointer lines
  // Left column coordinates (relative %)
  const leftSlots = [
    { x: 10, y: 15 }, // slot 0
    { x: 10, y: 26 }, // slot 1
    { x: 10, y: 37 }, // slot 2
    { x: 10, y: 48 }, // slot 3
    { x: 10, y: 59 }, // slot 4
    { x: 10, y: 70 }, // slot 5
    { x: 10, y: 81 }, // slot 6
    { x: 10, y: 92 }, // slot 7
  ];

  // Right column coordinates (relative %)
  const rightSlots = [
    { x: 90, y: 15 }, // slot 0
    { x: 90, y: 26 }, // slot 1
    { x: 90, y: 37 }, // slot 2
    { x: 90, y: 48 }, // slot 3
    { x: 90, y: 59 }, // slot 4
    { x: 90, y: 70 }, // slot 5
    { x: 90, y: 81 }, // slot 6
    { x: 90, y: 92 }, // slot 7
  ];

  // Assign locations to left/right columns
  // To keep it clean, we divide locations:
  // - North, West, South, and Central/Bangkok with odd indexes can go left
  // - Northeast, East, and Central/Bangkok with even indexes can go right
  const processedLocations = locations.map((loc, index) => {
    const mapData = PROVINCE_MAP[loc.province] || { x: 50, y: 50 };
    const pinX = mapData.x;
    const pinY = mapData.y;

    // Decide side
    const isLeft =
      loc.region === 'ภาคเหนือ' ||
      loc.region === 'ภาคตะวันตก' ||
      loc.region === 'ภาคใต้' ||
      (loc.region === 'ภาคกลาง' && index % 2 === 0);

    return {
      ...loc,
      pinX,
      pinY,
      isLeft,
    };
  });

  const leftLocs = processedLocations.filter((l) => l.isLeft).slice(0, 8);
  const rightLocs = processedLocations.filter((l) => !l.isLeft).slice(0, 8);

  const containerBg = isDark 
    ? "bg-slate-950/20 border-cyan-500/20" 
    : isGrayscale 
    ? "bg-white border-slate-300" 
    : "bg-slate-50/50 border-slate-200 shadow-sm";

  const mapFill = isDark 
    ? "rgba(6, 182, 212, 0.04)" 
    : isGrayscale 
    ? "rgba(0, 0, 0, 0.01)" 
    : "rgba(14, 165, 233, 0.04)";

  const mapStroke = isDark 
    ? "rgba(6, 182, 212, 0.2)" 
    : isGrayscale 
    ? "rgba(0, 0, 0, 0.12)" 
    : "rgba(14, 165, 233, 0.25)";

  const constellationStroke = isDark 
    ? "#0ea5e9" 
    : isGrayscale 
    ? "#94a3b8" 
    : "#0284c7";

  return (
    <div className={`relative w-full h-[620px] map-container-print rounded-xl overflow-hidden border select-none transition-all duration-300 ${containerBg}`}>
      {/* Glow effect filter definition */}
      <svg className="absolute w-0 h-0">
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
          <filter id="intense-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComponentTransfer in="blur" result="boost">
              <feFuncA type="linear" slope="2" />
            </feComponentTransfer>
            <feComposite in="SourceGraphic" in2="boost" operator="over" />
          </filter>
        </defs>
      </svg>

      {/* Decorative Blueprint Grid */}
      <div className={`absolute inset-0 bg-[radial-gradient(#1e293b_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-30 ${isGrayscale ? 'opacity-10' : 'opacity-30'}`} />
      
      {/* Map Content Area */}
      <div className="absolute inset-0 flex items-center justify-center">
        {/* SVG Wrapper representing Thailand & connection lines */}
        <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          
          {/* Stylized Silhouette of Thailand */}
          <path
            d="M 38 10 
               Q 41 8, 44 9 
               Q 48 10, 47 15 
               Q 45 20, 48 24 
               Q 52 26, 55 24 
               L 58 26 
               Q 65 24, 70 28 
               Q 75 32, 80 34
               Q 85 36, 84 41
               Q 83 45, 80 47
               Q 75 49, 72 46
               Q 66 42, 60 46
               L 58 52
               Q 59 58, 62 61
               Q 64 64, 59 66
               Q 55 68, 52 64
               L 48 60
               Q 44 58, 42 62
               Q 40 66, 38 72
               Q 35 77, 33 82
               Q 31 87, 34 91
               L 35 96
               Q 33 97, 32 94
               L 30 88
               Q 28 85, 30 81
               Q 32 77, 30 73
               Q 27 68, 29 64
               Q 31 60, 28 55
               Q 25 50, 31 44
               Q 35 38, 32 30
               Q 28 22, 33 16
               Z"
            fill={mapFill}
            stroke={mapStroke}
            strokeWidth="0.5"
            strokeDasharray="1 1"
            className="transition-all duration-700"
          />

          {/* Core high-tech constellation overlay - connecting nodes for digital twin look */}
          <g opacity="0.3">
            {/* Constellation lines */}
            <line x1="32" y1="20" x2="35" y2="23" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="35" y1="23" x2="40" y2="36" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="40" y1="36" x2="46" y2="52" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="46" y1="52" x2="45" y2="58" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="45" y1="58" x2="45" y2="56" stroke={constellationStroke} strokeWidth="0.15" strokeDasharray="1 1" />
            <line x1="45" y1="58" x2="58" y2="66" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="46" y1="52" x2="65" y2="40" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="65" y1="40" x2="82" y2="48" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="45" y1="58" x2="28" y2="56" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="28" y1="56" x2="35" y2="82" stroke={constellationStroke} strokeWidth="0.15" />
            <line x1="35" y1="82" x2="42" y2="92" stroke={constellationStroke} strokeWidth="0.15" />
          </g>

          {/* DYNAMIC laser lines from slot card to map pin */}
          {leftLocs.map((loc, idx) => {
            const slot = leftSlots[idx];
            const isHovered = hoveredLocationId === loc.id || selectedPin === loc.id;
            return (
              <path
                key={`line-left-${loc.id}`}
                d={`M ${slot.x + 16} ${slot.y + 4.5} L ${loc.pinX} ${loc.pinY}`}
                fill="none"
                stroke={isHovered ? '#10b981' : loc.status === 'ติดตั้งแล้ว' ? 'rgba(6, 182, 212, 0.35)' : 'rgba(245, 158, 11, 0.3)'}
                strokeWidth={isHovered ? '0.4' : '0.15'}
                className="transition-all duration-300"
                strokeDasharray={loc.status === 'อยู่ระหว่างดำเนินการ' ? '1 1' : undefined}
                filter={isHovered ? 'url(#glow)' : undefined}
              />
            );
          })}

          {rightLocs.map((loc, idx) => {
            const slot = rightSlots[idx];
            const isHovered = hoveredLocationId === loc.id || selectedPin === loc.id;
            return (
              <path
                key={`line-right-${loc.id}`}
                d={`M ${slot.x - 16} ${slot.y + 4.5} L ${loc.pinX} ${loc.pinY}`}
                fill="none"
                stroke={isHovered ? '#10b981' : loc.status === 'ติดตั้งแล้ว' ? 'rgba(6, 182, 212, 0.35)' : 'rgba(245, 158, 11, 0.3)'}
                strokeWidth={isHovered ? '0.4' : '0.15'}
                className="transition-all duration-300"
                strokeDasharray={loc.status === 'อยู่ระหว่างดำเนินการ' ? '1 1' : undefined}
                filter={isHovered ? 'url(#glow)' : undefined}
              />
            );
          })}
        </svg>

        {/* ----------------- LEFT SIDE CARDS ----------------- */}
        <div className="absolute left-2 inset-y-0 w-[240px] flex flex-col justify-between py-6 z-10 pointer-events-none">
          {leftSlots.map((slot, idx) => {
            const loc = leftLocs[idx];
            if (!loc) return <div key={`empty-left-${idx}`} className="h-14" />;

            const isHovered = hoveredLocationId === loc.id || selectedPin === loc.id;
            const seqNum = locations.findIndex((l) => l.id === loc.id) + 1;

            return (
              <div
                key={`card-left-${loc.id}`}
                className="pointer-events-auto cursor-pointer h-14"
                style={{ position: 'absolute', top: `${slot.y}%`, left: '10px', right: '10px', transform: 'translateY(-50%)' }}
                onMouseEnter={() => setHoveredLocationId(loc.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
                onClick={() => setSelectedPin(selectedPin === loc.id ? null : loc.id)}
              >
                <div
                  className={`flex items-center space-x-2 p-1.5 rounded transition-all duration-300 ${cardBgClass} border ${cardBorderClass(isHovered, loc.status)}`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${numberCircleClass(loc.status)}`}
                  >
                    {seqNum}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate block ${textNameClass}`}>{loc.name}</span>
                      <span className={`text-[8px] px-1 rounded-sm uppercase font-bold ${
                        loc.status === 'ติดตั้งแล้ว' ? badgeSuccessClass : badgeProgressClass
                      }`}>
                        {loc.status === 'ติดตั้งแล้ว' ? 'สำเร็จ' : 'ดำเนินการ'}
                      </span>
                    </div>
                    <span className={`text-[9px] block truncate ${textSubClass}`}>{loc.subAgency}</span>
                    <span className={`text-[10px] font-semibold font-mono block ${textCapacityClass}`}>
                      {loc.status === 'ติดตั้งแล้ว'
                        ? `ติดตั้งจริง ${(loc.actualCapacityKWp || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                        : `กำลังติดตั้ง ${loc.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------- RIGHT SIDE CARDS ----------------- */}
        <div className="absolute right-2 inset-y-0 w-[240px] flex flex-col justify-between py-6 z-10 pointer-events-none">
          {rightSlots.map((slot, idx) => {
            const loc = rightLocs[idx];
            if (!loc) return <div key={`empty-right-${idx}`} className="h-14" />;

            const isHovered = hoveredLocationId === loc.id || selectedPin === loc.id;
            const seqNum = locations.findIndex((l) => l.id === loc.id) + 1;

            return (
              <div
                key={`card-right-${loc.id}`}
                className="pointer-events-auto cursor-pointer h-14"
                style={{ position: 'absolute', top: `${slot.y}%`, left: '10px', right: '10px', transform: 'translateY(-50%)' }}
                onMouseEnter={() => setHoveredLocationId(loc.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
                onClick={() => setSelectedPin(selectedPin === loc.id ? null : loc.id)}
              >
                <div
                  className={`flex items-center space-x-2 p-1.5 rounded transition-all duration-300 ${cardBgClass} border ${cardBorderClass(isHovered, loc.status)}`}
                >
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border ${numberCircleClass(loc.status)}`}
                  >
                    {seqNum}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-semibold truncate block ${textNameClass}`}>{loc.name}</span>
                      <span className={`text-[8px] px-1 rounded-sm uppercase font-bold ${
                        loc.status === 'ติดตั้งแล้ว' ? badgeSuccessClass : badgeProgressClass
                      }`}>
                        {loc.status === 'ติดตั้งแล้ว' ? 'สำเร็จ' : 'ดำเนินการ'}
                      </span>
                    </div>
                    <span className={`text-[9px] block truncate ${textSubClass}`}>{loc.subAgency}</span>
                    <span className={`text-[10px] font-semibold font-mono block ${textCapacityClass}`}>
                      {loc.status === 'ติดตั้งแล้ว'
                        ? `ติดตั้งจริง ${(loc.actualCapacityKWp || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                        : `กำลังติดตั้ง ${loc.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------- MAP PINS ----------------- */}
        {processedLocations.map((loc) => {
          const isHovered = hoveredLocationId === loc.id || selectedPin === loc.id;
          const seqNum = locations.findIndex((l) => l.id === loc.id) + 1;

          const pinSuccessClass = isDark 
            ? "border-cyan-300 bg-cyan-950 shadow-[0_0_6px_#06b6d4]" 
            : isGrayscale 
            ? "border-slate-600 bg-slate-200 text-black font-extrabold" 
            : "border-cyan-500 bg-cyan-50 text-cyan-700 shadow-sm font-extrabold";
            
          const pinProgressClass = isDark 
            ? "border-amber-300 bg-amber-950 shadow-[0_0_6px_#f59e0b]" 
            : isGrayscale 
            ? "border-slate-500 bg-slate-100 text-black font-extrabold" 
            : "border-amber-500 bg-amber-50 text-amber-700 shadow-sm font-extrabold";

          const tooltipClass = isDark
            ? "bg-slate-950/95 border-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            : isGrayscale
            ? "bg-white border-slate-400 text-black shadow-md"
            : "bg-white border-emerald-500 text-slate-800 shadow-md border-2";

          const tooltipTextMuted = isDark ? "text-slate-300" : "text-slate-600";
          const tooltipTextMutedCap = isDark ? "text-slate-400" : "text-slate-500";

          return (
            <div
              key={`pin-${loc.id}`}
              className="absolute cursor-pointer transition-all duration-300"
              style={{
                left: `${loc.pinX}%`,
                top: `${loc.pinY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: isHovered ? 40 : 20,
              }}
              onMouseEnter={() => setHoveredLocationId(loc.id)}
              onMouseLeave={() => setHoveredLocationId(null)}
              onClick={() => setSelectedPin(selectedPin === loc.id ? null : loc.id)}
            >
              {/* Pulsing ring */}
              <div
                className={`absolute w-8 h-8 -left-4 -top-4 rounded-full animate-ping opacity-75 ${
                  loc.status === 'ติดตั้งแล้ว' ? 'bg-cyan-500/40' : 'bg-amber-500/40'
                }`}
                style={{ animationDuration: isHovered ? '1s' : '2.5s' }}
              />

              {/* Pin Center */}
              <div
                className={`w-4 h-4 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isHovered
                    ? 'scale-[1.5] border-emerald-400 bg-emerald-950 shadow-[0_0_10px_#10b981] text-white'
                    : loc.status === 'ติดตั้งแล้ว'
                    ? pinSuccessClass
                    : pinProgressClass
                }`}
              >
                <span className={`text-[7px] font-extrabold ${isDark ? 'text-white' : 'text-slate-800'}`}>{seqNum}</span>
              </div>

              {/* Float HUD tooltips for selected pin or hovered pin */}
              {isHovered && (
                <div className={`absolute top-6 left-1/2 -translate-x-1/2 min-w-[200px] p-2 rounded text-left z-50 pointer-events-none backdrop-blur-sm ${tooltipClass}`}>
                  <div className={`font-bold text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>{loc.name}</div>
                  <div className={`${tooltipTextMuted} text-[10px] mt-0.5`}>{loc.subAgency}</div>
                  <div className={`flex justify-between items-center mt-1 pt-1 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
                    <span className={`${tooltipTextMutedCap} text-[10px]`}>กำลังติดตั้งตามสัญญา:</span>
                    <span className={`${isDark ? 'text-emerald-400' : 'text-emerald-600'} text-[11px] font-mono font-bold`}>
                      {loc.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                    </span>
                  </div>
                  {loc.status === 'ติดตั้งแล้ว' && (
                    <div className="flex justify-between items-center mt-0.5">
                      <span className={`${tooltipTextMutedCap} text-[10px]`}>กำลังติดตั้งจริง:</span>
                      <span className="text-cyan-400 text-[11px] font-mono font-bold">
                        {(loc.actualCapacityKWp || 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-0.5">
                    <span className={`${tooltipTextMutedCap} text-[10px]`}>สถานะ:</span>
                    <span className={`text-[9px] font-bold ${
                      loc.status === 'ติดตั้งแล้ว' 
                        ? (isDark ? 'text-cyan-400' : 'text-cyan-600') 
                        : (isDark ? 'text-amber-400' : 'text-amber-600')
                    }`}>
                      {loc.status}
                    </span>
                  </div>
                  <div className="text-[9px] text-slate-400 mt-1">ภูมิภาค: {loc.region}</div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Map legend in corner */}
      <div className={`absolute bottom-2 right-2 backdrop-blur-md border p-2 rounded text-[10px] flex flex-col space-y-1 transition-all duration-300 ${
        isDark
          ? 'bg-slate-900/80 border-slate-800 text-slate-300'
          : isGrayscale
          ? 'bg-white border-slate-300 text-black'
          : 'bg-white/90 border-slate-200 text-slate-700 shadow-sm'
      }`}>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse border border-cyan-300" />
          <span className="font-semibold">ติดตั้งแล้ว (Installed)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse border border-amber-300" />
          <span className="font-semibold">อยู่ระหว่างดำเนินการ</span>
        </div>
      </div>
    </div>
  );
};
