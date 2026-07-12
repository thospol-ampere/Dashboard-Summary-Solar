import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { LocationItem, PROVINCE_MAP } from '../types';
// @ts-ignore
import thailandNeonMap from '../assets/images/thailand_neon_map_1783852455630.jpg';

interface ThailandMapProps {
  locations: LocationItem[];
  hoveredLocationId: string | null;
  setHoveredLocationId: (id: string | null) => void;
  colorMode?: 'dark' | 'light' | 'grayscale';
  projectName?: string;
  customerName?: string;
}

export const ThailandMap: React.FC<ThailandMapProps> = ({
  locations,
  hoveredLocationId,
  setHoveredLocationId,
  colorMode = 'dark',
  projectName,
  customerName,
}) => {
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const containerRef = useRef<HTMLDivElement>(null);

  const isDark = colorMode === 'dark';
  const isGrayscale = colorMode === 'grayscale';

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width) {
          setContainerWidth(entry.contentRect.width);
        }
      }
    });

    observer.observe(containerRef.current);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Helper to get raw coordinates adjusted for the dark/neon theme or grayscale/SVG path
  const getRawCoords = useCallback((province: string) => {
    const raw = PROVINCE_MAP[province] || { x: 50, y: 50 };
    if (isGrayscale) {
      return raw;
    }

    // Surgical geographical corrections to align perfectly with the NEON background map
    let x = raw.x;
    let y = raw.y;

    // Apply general scaling and offset to fit the neon map's physical geography
    if (raw.y > 70) {
      // Southern peninsula
      x = 32 + (raw.x - 35) * 0.7;
      y = 75 + (raw.y - 75) * 0.8;
    } else if (raw.x > 50) {
      // Northeast
      x = 50 + (raw.x - 50) * 0.8;
      y = 40 + (raw.y - 40) * 0.85;
    } else if (raw.y < 35) {
      // North
      x = 40 + (raw.x - 35) * 0.8;
      y = 15 + (raw.y - 15) * 0.85;
    } else {
      // Central / Bangkok / East / West
      x = 41 + (raw.x - 45) * 0.75;
      y = 51 + (raw.y - 50) * 0.85;
    }

    // Specific manual alignments for the prominent provinces to match labels precisely
    if (province === 'กรุงเทพมหานคร') {
      x = 41.5;
      y = 50.5;
    } else if (province === 'ชลบุรี') {
      x = 48.0;
      y = 55.0;
    } else if (province === 'นนทบุรี' || province === 'ปทุมธานี' || province === 'สมุทรปราการ' || province === 'นครปฐม') {
      x = 41.5;
      y = 50.0;
    } else if (province === 'นครราชสีมา') {
      x = 55.0;
      y = 47.0;
    } else if (province === 'ขอนแก่น') {
      x = 59.0;
      y = 35.0;
    } else if (province === 'เชียงใหม่') {
      x = 36.0;
      y = 20.0;
    } else if (province === 'พิษณุโลก') {
      x = 41.0;
      y = 34.0;
    } else if (province === 'สุราษฎร์ธานี') {
      x = 35.0;
      y = 78.0;
    } else if (province === 'สงขลา') {
      x = 36.0;
      y = 86.0;
    } else if (province === 'ยะลา') {
      x = 36.5;
      y = 89.0;
    } else if (province === 'กาญจนบุรี') {
      x = 35.5;
      y = 47.0;
    } else if (province === 'สระบุรี') {
      x = 44.5;
      y = 46.5;
    } else if (province === 'จันทบุรี') {
      x = 49.5;
      y = 56.0;
    } else if (province === 'ภูเก็ต') {
      x = 31.0;
      y = 84.0;
    }

    return { x, y };
  }, [isGrayscale]);

  // Helper to dynamically calculate container-relative percentages from raw image percentages
  const getAdjustedCoords = useCallback((province: string) => {
    const raw = getRawCoords(province);
    if (isGrayscale) {
      return { x: raw.x, y: raw.y };
    }
    
    // The map image has a vertical height of 580px, and natural aspect ratio of 896 / 1200.
    // Map image width is exactly 580 * (896 / 1200) = 433px.
    // The map image is centered horizontally inside the container.
    const mapImageWidth = 433;
    const mapImageHeight = 580;
    const parentHeight = 640;
    const topGap = 30; // (640 - 580) / 2

    // X Projection:
    const pinX = 50 + (raw.x - 50) * (mapImageWidth / containerWidth);

    // Y Projection:
    const pinY = ((topGap + (raw.y / 100) * mapImageHeight) / parentHeight) * 100;

    return { x: pinX, y: pinY };
  }, [containerWidth, isGrayscale, getRawCoords]);

  // Preprocess and group locations to match the photo layout exactly
  const processedData = useMemo(() => {
    const bkkLocations = locations.filter((loc) => loc.province === 'กรุงเทพมหานคร');
    const otherLocations = locations.filter((loc) => loc.province !== 'กรุงเทพมหานคร');

    // Predefined visual order and sequence numbers matching the photo
    const predefinedMapping: Record<string, { seqNum: number; isLeft: boolean; slotIndex: number }> = {
      'เชียงใหม่': { seqNum: 7, isLeft: true, slotIndex: 0 },
      'พิษณุโลก': { seqNum: 8, isLeft: true, slotIndex: 1 },
      'ลำปาง': { seqNum: 15, isLeft: true, slotIndex: 2 },
      'กาญจนบุรี': { seqNum: 12, isLeft: true, slotIndex: 3 },
      'สระบุรี': { seqNum: 14, isLeft: true, slotIndex: 4 },
      'สุราษฎร์ธานี': { seqNum: 9, isLeft: true, slotIndex: 5 },
      'สงขลา': { seqNum: 10, isLeft: true, slotIndex: 6 },
      'ยะลา': { seqNum: 16, isLeft: true, slotIndex: 7 }, // Optional fallback South

      'ขอนแก่น': { seqNum: 5, isLeft: false, slotIndex: 0 },
      'อุบลราชธานี': { seqNum: 6, isLeft: false, slotIndex: 1 },
      'จันทบุรี': { seqNum: 11, isLeft: false, slotIndex: 2 },
      'กรุงเทพมหานคร': { seqNum: 1, isLeft: false, slotIndex: 3 }, // Grouped
      'ปทุมธานี': { seqNum: 13, isLeft: false, slotIndex: 4 },
    };

    const leftItems: any[] = [];
    const rightItems: any[] = [];

    // Group Bangkok locations (loc-1, loc-2, loc-3) into a single tall card
    if (bkkLocations.length > 0) {
      const bkkMap = getAdjustedCoords('กรุงเทพมหานคร');
      const totalCapacity = bkkLocations.reduce((sum, l) => sum + l.capacityKWp, 0);
      const totalActual = bkkLocations.reduce((sum, l) => sum + (l.actualCapacityKWp || 0), 0);
      const allInstalled = bkkLocations.every((l) => l.status === 'ติดตั้งแล้ว');

      const groupName = customerName 
        ? `${customerName} (กรุงเทพฯ)` 
        : projectName 
        ? `${projectName} (กรุงเทพฯ)` 
        : 'กรุงเทพมหานคร (ส่วนกลาง)';

      const uniqueSubAgencies = Array.from(new Set(bkkLocations.map((l) => l.subAgency)));
      const groupSubAgency = uniqueSubAgencies.join(' และ ');

      // Dynamic sequence numbers for BKK locations based on the real order in locations
      const bkkSeqNums = bkkLocations
        .map((loc) => locations.findIndex((l) => l.id === loc.id) + 1)
        .filter((num) => num > 0)
        .sort((a, b) => a - b);

      let seqNumStr = '1';
      if (bkkSeqNums.length > 0) {
        if (bkkSeqNums.length === 1) {
          seqNumStr = bkkSeqNums[0].toString();
        } else if (bkkSeqNums[bkkSeqNums.length - 1] - bkkSeqNums[0] === bkkSeqNums.length - 1) {
          seqNumStr = `${bkkSeqNums[0]}-${bkkSeqNums[bkkSeqNums.length - 1]}`;
        } else {
          seqNumStr = bkkSeqNums.join(',');
        }
      }

      const bkkGroup = {
        id: 'group-bkk',
        name: groupName,
        subAgency: groupSubAgency,
        capacityKWp: totalCapacity,
        actualCapacityKWp: totalActual,
        province: 'กรุงเทพมหานคร',
        region: 'กรุงเทพมหานคร' as any,
        status: allInstalled ? 'ติดตั้งแล้ว' : 'อยู่ระหว่างดำเนินการ' as any,
        pinX: bkkMap.x,
        pinY: bkkMap.y,
        isLeft: false,
        seqNum: seqNumStr,
        slotIndex: 3,
        subLocations: bkkLocations.map((loc) => ({
          id: loc.id,
          subAgency: loc.subAgency,
          capacityKWp: loc.capacityKWp,
          actualCapacityKWp: loc.actualCapacityKWp,
          status: loc.status,
          seqNum: locations.findIndex((l) => l.id === loc.id) + 1,
        })),
      };
      rightItems.push(bkkGroup);
    }

    // Distribute other locations based on predefined mapping
    otherLocations.forEach((loc) => {
      const mapData = getAdjustedCoords(loc.province);
      const mapping = predefinedMapping[loc.province];
      const currentSeqNum = locations.findIndex((l) => l.id === loc.id) + 1;

      if (mapping) {
        const item = {
          ...loc,
          pinX: mapData.x,
          pinY: mapData.y,
          isLeft: mapping.isLeft,
          seqNum: currentSeqNum,
          slotIndex: mapping.slotIndex,
        };
        if (mapping.isLeft) {
          leftItems.push(item);
        } else {
          rightItems.push(item);
        }
      } else {
        // Fallback for custom added locations: place dynamically
        const item = {
          ...loc,
          pinX: mapData.x,
          pinY: mapData.y,
          isLeft: leftItems.length <= rightItems.length,
          seqNum: currentSeqNum,
          slotIndex: 7, // Place towards the bottom
        };
        if (item.isLeft) {
          leftItems.push(item);
        } else {
          rightItems.push(item);
        }
      }
    });

    // Sort items visually by their slotIndex
    leftItems.sort((a, b) => a.slotIndex - b.slotIndex);
    rightItems.sort((a, b) => a.slotIndex - b.slotIndex);

    // Filter list of map pins (Bangkok represented once by the group)
    const pins: any[] = [];
    if (bkkLocations.length > 0) {
      const bkkMap = getAdjustedCoords('กรุงเทพมหานคร');
      const bkkSeqNums = bkkLocations
        .map((loc) => locations.findIndex((l) => l.id === loc.id) + 1)
        .filter((num) => num > 0)
        .sort((a, b) => a - b);

      let seqNumStr = '1';
      if (bkkSeqNums.length > 0) {
        if (bkkSeqNums.length === 1) {
          seqNumStr = bkkSeqNums[0].toString();
        } else if (bkkSeqNums[bkkSeqNums.length - 1] - bkkSeqNums[0] === bkkSeqNums.length - 1) {
          seqNumStr = `${bkkSeqNums[0]}-${bkkSeqNums[bkkSeqNums.length - 1]}`;
        } else {
          seqNumStr = bkkSeqNums.join(',');
        }
      }

      pins.push({
        id: 'group-bkk',
        province: 'กรุงเทพมหานคร',
        pinX: bkkMap.x,
        pinY: bkkMap.y,
        seqNum: seqNumStr,
        status: bkkLocations.every((l) => l.status === 'ติดตั้งแล้ว') ? 'ติดตั้งแล้ว' : 'อยู่ระหว่างดำเนินการ',
        locations: bkkLocations,
      });
    }

    otherLocations.forEach((loc) => {
      const mapData = getAdjustedCoords(loc.province);
      const currentSeqNum = locations.findIndex((l) => l.id === loc.id) + 1;
      pins.push({
        id: loc.id,
        province: loc.province,
        pinX: mapData.x,
        pinY: mapData.y,
        seqNum: currentSeqNum,
        status: loc.status,
        locations: [loc],
      });
    });

    // Dynamically calculate slotY to avoid overlapping
    const leftCount = leftItems.length;
    leftItems.forEach((item, index) => {
      let slotY = 50;
      if (leftCount > 1) {
        const start = 12;
        const end = 88;
        slotY = start + (index * (end - start)) / (leftCount - 1);
      } else if (leftCount === 1) {
        slotY = 50;
      }
      item.slotY = slotY;
    });

    const rightCount = rightItems.length;
    rightItems.forEach((item, index) => {
      let slotY = 50;
      if (rightCount > 1) {
        const start = 12;
        const end = 88;
        slotY = start + (index * (end - start)) / (rightCount - 1);
      } else if (rightCount === 1) {
        slotY = 50;
      }
      item.slotY = slotY;
    });

    return {
      leftItems,
      rightItems,
      pins,
    };
  }, [locations, getAdjustedCoords, customerName, projectName]);

  // Determine if a card/pin or group is active (hovered)
  const isHovered = (id: string, subLocations?: any[]) => {
    if (hoveredLocationId === id || selectedPin === id) return true;
    if (subLocations && hoveredLocationId) {
      return subLocations.some((sub) => sub.id === hoveredLocationId);
    }
    if (id === 'group-bkk' && (hoveredLocationId === 'loc-1' || hoveredLocationId === 'loc-2' || hoveredLocationId === 'loc-3')) {
      return true;
    }
    return false;
  };

  // Card themes matching the image
  const cardBgClass = isGrayscale
    ? 'bg-white border-slate-300'
    : 'bg-[#061121]/90 backdrop-blur-md transition-all duration-300';

  const cardBorderClass = (isActive: boolean, status: string) => {
    if (isGrayscale) {
      return isActive ? 'border-black bg-slate-100 font-bold scale-[1.02]' : 'border-slate-300';
    }
    if (isActive) {
      return status === 'ติดตั้งแล้ว'
        ? 'border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] bg-[#09223f] scale-[1.03]'
        : 'border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.4)] bg-[#1e2521] scale-[1.03]';
    }
    return status === 'ติดตั้งแล้ว'
      ? 'border-cyan-500/20 hover:border-cyan-400/40 hover:bg-[#071930]'
      : 'border-amber-500/20 hover:border-amber-400/40 hover:bg-[#151c18]';
  };

  const numberCircleClass = 'bg-white text-[#0a1120] border-slate-200 font-extrabold shadow-sm';

  // Map colors and stroke styles
  const mapFill = isGrayscale
    ? 'rgba(0, 0, 0, 0.02)'
    : 'rgba(6, 182, 212, 0.05)';

  const mapStroke = isGrayscale
    ? 'rgba(0, 0, 0, 0.2)'
    : '#0891b2';

  const constellationStroke = isGrayscale
    ? 'rgba(0, 0, 0, 0.15)'
    : 'rgba(34, 211, 238, 0.35)';

  const containerClass = isDark
    ? 'bg-[#070e1b] border-cyan-500/20 text-slate-100'
    : isGrayscale
    ? 'bg-white border-slate-300 text-black'
    : 'bg-white border-slate-200 shadow-lg text-slate-800';

  return (
    <div ref={containerRef} className={`relative w-full h-[640px] map-container-print rounded-xl overflow-hidden border select-none transition-all duration-300 ${containerClass}`}>
      
      {/* ----------------- GLOW FILTER EFFECTS ----------------- */}
      {!isGrayscale && (
        <svg className="absolute w-0 h-0">
          <defs>
            <filter id="neon-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="neon-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="map-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feComponentTransfer in="blur" result="boost">
                <feFuncA type="linear" slope="1.5" />
              </feComponentTransfer>
              <feMerge>
                <feMergeNode in="boost" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="map-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#083344" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="ell-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#0891b2" stopOpacity="0.0" />
            </linearGradient>
          </defs>
        </svg>
      )}

      {/* ----------------- HIGH-TECH BLUEPRINT GRID ----------------- */}
      {!isGrayscale && (
        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:24px_24px] opacity-60" />
      )}

      {/* ----------------- CENTERED TITLE PILL ----------------- */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 print:hidden">
        <div className={`${isGrayscale ? 'bg-slate-100 border-slate-400 text-black' : 'bg-slate-900/90 border-cyan-500/30 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'} border px-6 py-1.5 rounded-full flex items-center space-x-2.5`}>
          {!isGrayscale && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
          <span className="text-xs font-bold tracking-wider font-sans">แผนที่แสดงตำแหน่งสถานที่ติดตั้ง</span>
        </div>
      </div>

      {/* ----------------- MAP CANVAS AREA ----------------- */}
      <div className="absolute inset-0 flex items-center justify-center">
        
        {/* NEON CONSTELLATION THAILAND MAP IMAGE */}
        {!isGrayscale && (
          <img
            src={thailandNeonMap}
            alt="Thailand Map Background"
            referrerPolicy="no-referrer"
            className="absolute h-[580px] w-auto opacity-70 object-contain pointer-events-none select-none mix-blend-screen z-0 filter saturate-150 contrast-125 brightness-110"
          />
        )}
        
        {/* SVG connection lines and map base */}
        <svg className="w-full h-full absolute inset-0 z-0" viewBox="0 0 100 100" preserveAspectRatio="none">
          
          {/* HOLOGRAPHIC 3D EMITTER BASE (RIPPLES) */}
          {!isGrayscale && (
            <g className="animate-pulse" style={{ animationDuration: '4s' }}>
              <ellipse cx="36" cy="93" rx="14" ry="3.5" fill="none" stroke="url(#ell-grad)" strokeWidth="0.5" filter="url(#neon-cyan)" />
              <ellipse cx="36" cy="93" rx="9" ry="2.2" fill="none" stroke="url(#ell-grad)" strokeWidth="0.3" opacity="0.8" />
              <ellipse cx="36" cy="93" rx="5" ry="1.2" fill="none" stroke="url(#ell-grad)" strokeWidth="0.2" opacity="0.6" />
            </g>
          )}

          {/* STYLIZED SILHOUETTE OF THAILAND MAP (ONLY FOR GRAYSCALE/PRINT FALLBACK) */}
          {isGrayscale && (
            <g>
              {/* Main filled path */}
              <path
                d="M 38 10 Q 41 8, 44 9 Q 48 10, 47 15 Q 45 20, 48 24 Q 52 26, 55 24 L 58 26 Q 65 24, 70 28 Q 75 32, 80 34 Q 85 36, 84 41 Q 83 45, 80 47 Q 75 49, 72 46 Q 66 42, 60 46 L 58 52 Q 59 58, 62 61 Q 64 64, 59 66 Q 55 68, 52 64 L 48 60 Q 44 58, 42 62 Q 40 66, 38 72 Q 35 77, 33 82 Q 31 87, 34 91 L 35 96 Q 33 97, 32 94 L 30 88 Q 28 85, 30 81 Q 32 77, 30 73 Q 27 68, 29 64 Q 31 60, 28 55 Q 25 50, 31 44 Q 35 38, 32 30 Q 28 22, 33 16 Z"
                fill="#f1f5f9"
                stroke={mapStroke}
                strokeWidth="0.6"
                className="transition-all duration-700"
              />
            </g>
          )}

          {/* BACKGROUND CONSTELLATION MESH (ONLY FOR GRAYSCALE/PRINT FALLBACK) */}
          {isGrayscale && (
            <g opacity={0.15}>
              <line x1="32" y1="20" x2="35" y2="23" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="35" y1="23" x2="40" y2="36" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="40" y1="36" x2="46" y2="52" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="46" y1="52" x2="45" y2="48" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="45" y1="48" x2="58" y2="66" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="46" y1="52" x2="65" y2="40" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="65" y1="40" x2="82" y2="48" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="45" y1="48" x2="35" y2="82" stroke={constellationStroke} strokeWidth="0.2" />
              <line x1="35" y1="82" x2="42" y2="92" stroke={constellationStroke} strokeWidth="0.2" />
            </g>
          )}

          {/* DYNAMIC HIGH-TECH LASER POINTER LINES */}
          {processedData.leftItems.map((item, idx) => {
            const slotY = item.slotY;
            const active = isHovered(item.id);
            const isInstalled = item.status === 'ติดตั้งแล้ว';

            return (
              <g key={`line-left-${item.id}`}>
                {/* Pointer line */}
                <path
                  d={`M 26 ${slotY} H 31 L ${item.pinX} ${item.pinY}`}
                  fill="none"
                  stroke={isGrayscale ? '#64748b' : active ? '#10b981' : isInstalled ? '#06b6d4' : '#f59e0b'}
                  strokeWidth={active ? '0.5' : '0.18'}
                  strokeDasharray={!isInstalled ? '2 1.5' : undefined}
                  opacity={active ? 1 : isGrayscale ? 0.3 : 0.45}
                  className="transition-all duration-300"
                  filter={!isGrayscale && active ? 'url(#neon-cyan)' : undefined}
                />
                {/* Visual node on card edge */}
                {!isGrayscale && (
                  <circle
                    cx="26"
                    cy={slotY}
                    r={active ? '1' : '0.6'}
                    fill={isInstalled ? '#22d3ee' : '#f59e0b'}
                  />
                )}
              </g>
            );
          })}

          {processedData.rightItems.map((item, idx) => {
            const slotY = item.slotY;
            const active = isHovered(item.id, item.subLocations);
            const isInstalled = item.status === 'ติดตั้งแล้ว';

            return (
              <g key={`line-right-${item.id}`}>
                {/* Pointer line */}
                <path
                  d={`M 74 ${slotY} H 69 L ${item.pinX} ${item.pinY}`}
                  fill="none"
                  stroke={isGrayscale ? '#64748b' : active ? '#10b981' : isInstalled ? '#06b6d4' : '#f59e0b'}
                  strokeWidth={active ? '0.5' : '0.18'}
                  strokeDasharray={!isInstalled ? '2 1.5' : undefined}
                  opacity={active ? 1 : isGrayscale ? 0.3 : 0.45}
                  className="transition-all duration-300"
                  filter={!isGrayscale && active ? 'url(#neon-cyan)' : undefined}
                />
                {/* Visual node on card edge */}
                {!isGrayscale && (
                  <circle
                    cx="74"
                    cy={slotY}
                    r={active ? '1' : '0.6'}
                    fill={isInstalled ? '#22d3ee' : '#f59e0b'}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {/* ----------------- LEFT SIDEBAR PANEL ----------------- */}
        <div className="absolute left-3 inset-y-0 w-[240px] flex flex-col justify-between py-5 z-10 pointer-events-none">
          {processedData.leftItems.map((item) => {
            const active = isHovered(item.id);
            const slotY = item.slotY;
            const isInstalled = item.status === 'ติดตั้งแล้ว';

            return (
              <div
                key={`card-left-${item.id}`}
                className="pointer-events-auto cursor-pointer w-full transition-all duration-300"
                style={{
                  position: 'absolute',
                  top: `${slotY}%`,
                  transform: 'translateY(-50%)',
                }}
                onMouseEnter={() => setHoveredLocationId(item.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
                onClick={() => setSelectedPin(selectedPin === item.id ? null : item.id)}
              >
                <div className={`flex items-center space-x-2.5 p-2 rounded-lg border shadow-sm ${cardBgClass} ${cardBorderClass(active, item.status)}`}>
                  {/* Sequence number badge matching orange frame */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] border ${numberCircleClass}`}>
                    {item.seqNum}
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-white truncate">{item.name}</span>
                    </div>
                    <span className="text-[9.5px] text-slate-400 block truncate mt-0.5 leading-tight">{item.subAgency}</span>
                    <span className={`text-[10px] font-bold font-mono block mt-1 ${isGrayscale ? 'text-black' : isInstalled ? 'text-cyan-400' : 'text-amber-400'}`}>
                      {isInstalled
                        ? `ติดตั้งแล้ว ${(item.actualCapacityKWp || item.capacityKWp).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                        : `กำลังติดตั้ง ${item.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                      }
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------- RIGHT SIDEBAR PANEL ----------------- */}
        <div className="absolute right-3 inset-y-0 w-[240px] flex flex-col justify-between py-5 z-10 pointer-events-none">
          {processedData.rightItems.map((item) => {
            const active = isHovered(item.id, item.subLocations);
            const slotY = item.slotY;
            const isInstalled = item.status === 'ติดตั้งแล้ว';
            const isBkk = item.id === 'group-bkk';

            return (
              <div
                key={`card-right-${item.id}`}
                className="pointer-events-auto cursor-pointer w-full transition-all duration-300"
                style={{
                  position: 'absolute',
                  top: `${slotY}%`,
                  transform: 'translateY(-50%)',
                }}
                onMouseEnter={() => setHoveredLocationId(item.id)}
                onMouseLeave={() => setHoveredLocationId(null)}
                onClick={() => setSelectedPin(selectedPin === item.id ? null : item.id)}
              >
                {/* Dynamic Height for BKK Multi-site lists */}
                <div className={`flex flex-col p-2 rounded-lg border shadow-sm ${cardBgClass} ${cardBorderClass(active, item.status)}`}>
                  
                  {/* Top main card layout */}
                  <div className="flex items-center space-x-2.5 w-full">
                    <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] border ${numberCircleClass}`}>
                      {item.seqNum}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-white truncate">{item.name}</span>
                      </div>
                      {!isBkk && (
                        <span className="text-[9.5px] text-slate-400 block truncate mt-0.5 leading-tight">{item.subAgency}</span>
                      )}
                      {isBkk && (
                        <span className="text-[9.5px] text-cyan-400/80 block truncate mt-0.5 leading-tight font-medium">รวมกำลังติดตั้งส่วนกลาง</span>
                      )}
                      
                      {/* Only display main capacity line if not Bkk group, or show the total summary capacity */}
                      <span className={`text-[10px] font-bold font-mono block mt-1 ${isGrayscale ? 'text-black' : isInstalled ? 'text-cyan-400' : 'text-amber-400'}`}>
                        {isInstalled
                          ? `${isBkk ? 'รวมติดตั้งจริง' : 'ติดตั้งแล้ว'} ${(item.actualCapacityKWp || item.capacityKWp).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                          : `กำลังติดตั้ง ${item.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp`
                        }
                      </span>
                    </div>
                  </div>

                  {/* SPECIAL SUB-LOCATIONS BULLETED LIST FOR BANGKOK (EXACT PHOTO REPLICA) */}
                  {isBkk && item.subLocations && (
                    <div className="mt-1.5 pt-1.5 border-t border-cyan-500/10 flex flex-col space-y-1 text-left">
                      {item.subLocations.map((sub: any) => {
                        const subActive = hoveredLocationId === sub.id;
                        return (
                          <div
                            key={sub.id}
                            className={`pl-1.5 flex flex-col transition-colors duration-200 py-0.5 rounded ${subActive ? 'bg-cyan-500/10' : ''}`}
                            onMouseEnter={(e) => {
                              e.stopPropagation();
                              setHoveredLocationId(sub.id);
                            }}
                            onMouseLeave={(e) => {
                              e.stopPropagation();
                              setHoveredLocationId(null);
                            }}
                          >
                            <span className="text-[9px] text-slate-300 font-sans truncate leading-none">
                              • ({sub.seqNum}) {sub.subAgency}
                            </span>
                            <span className="text-[9px] font-mono text-cyan-400/90 pl-2 mt-0.5">
                              กำลังติดตั้ง {sub.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>

        {/* ----------------- HOLOGRAPHIC MAP GLOW PINS ----------------- */}
        {processedData.pins.map((pin) => {
          const active = isHovered(pin.id, pin.locations);
          const isInstalled = pin.status === 'ติดตั้งแล้ว';

          return (
            <div
              key={`pin-${pin.id}`}
              className="absolute cursor-pointer transition-all duration-300"
              style={{
                left: `${pin.pinX}%`,
                top: `${pin.pinY}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: active ? 40 : 20,
              }}
              onMouseEnter={() => setHoveredLocationId(pin.id)}
              onMouseLeave={() => setHoveredLocationId(null)}
              onClick={() => setSelectedPin(selectedPin === pin.id ? null : pin.id)}
            >
              {/* Continuous glowing ripple animation */}
              {!isGrayscale && (
                <div
                  className={`absolute w-8 h-8 -left-4 -top-4 rounded-full animate-ping opacity-60 ${
                    isInstalled ? 'bg-cyan-500/25' : 'bg-amber-500/25'
                  }`}
                  style={{ animationDuration: active ? '1.2s' : '2.8s' }}
                />
              )}

              {/* Pin Center Core */}
              <div
                className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border transition-all duration-300 ${
                  isGrayscale
                    ? 'border-slate-800 bg-white scale-[1.2] text-black font-extrabold'
                    : active
                    ? 'scale-[1.6] border-emerald-300 bg-emerald-950 shadow-[0_0_12px_#10b981] text-white'
                    : isInstalled
                    ? 'border-cyan-300 bg-[#0e3a4e] shadow-[0_0_10px_#22d3ee]'
                    : 'border-amber-300 bg-[#3b2d0d] shadow-[0_0_10px_#f59e0b]'
                }`}
              >
                <span className={`text-[6.5px] font-extrabold ${isGrayscale ? 'text-black' : 'text-white'}`}>
                  {pin.seqNum}
                </span>
              </div>

              {/* FLOATING INDUSTRIAL HUD TOOLTIP */}
              {active && (() => {
                const isSouthern = pin.pinY > 55;
                const xTranslationClass = pin.pinX > 50 
                  ? '-translate-x-[75%]' 
                  : pin.pinX < 35 
                  ? '-translate-x-[25%]' 
                  : '-translate-x-1/2';
                const yPositionClass = isSouthern ? 'bottom-6' : 'top-6';

                return (
                  <div className={`absolute ${yPositionClass} left-1/2 ${xTranslationClass} min-w-[220px] p-2 rounded-lg text-left z-50 pointer-events-none border backdrop-blur-md ${
                    isGrayscale
                      ? 'bg-white border-slate-400 text-black shadow-md'
                      : 'bg-[#081528]/95 border-emerald-500/80 text-white shadow-[0_0_20px_rgba(16,185,129,0.35)]'
                  }`}>
                    <div className="font-bold text-xs">{pin.province === 'กรุงเทพมหานคร' ? 'กรุงเทพมหานคร (ส่วนกลาง)' : pin.province}</div>
                    
                    {/* List each sub-location inside the HUD tooltip */}
                    <div className="mt-1.5 space-y-1.5">
                      {pin.locations.map((loc: any) => {
                        const locSeqNum = locations.findIndex((l) => l.id === loc.id) + 1;
                        return (
                          <div key={loc.id} className="border-t border-slate-700/30 pt-1">
                            <div className="text-[10px] text-slate-300 font-medium leading-tight">
                              {locSeqNum > 0 && <span className="text-emerald-400 font-bold font-mono mr-1">[{locSeqNum}]</span>}
                              {loc.subAgency}
                            </div>
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="text-[9.5px] text-slate-400">กำลังติดตั้งตามสัญญา:</span>
                              <span className="text-[10.5px] font-mono font-bold text-emerald-400">
                                {loc.capacityKWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                              </span>
                            </div>
                            {loc.status === 'ติดตั้งแล้ว' && (
                              <div className="flex justify-between items-center mt-0.5">
                                <span className="text-[9.5px] text-cyan-400/80">ติดตั้งจริง:</span>
                                <span className="text-[10.5px] font-mono font-bold text-cyan-400">
                                  {(loc.actualCapacityKWp || loc.capacityKWp).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                                </span>
                              </div>
                            )}
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="text-[9.5px] text-slate-400">สถานะ:</span>
                              <span className={`text-[9px] font-bold px-1 py-0.2 rounded-sm ${
                                loc.status === 'ติดตั้งแล้ว' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {loc.status}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>

      {/* ----------------- MODERN CORNER LEGEND ----------------- */}
      <div className={`absolute bottom-3 right-3 backdrop-blur-md border p-2 rounded-lg text-[10px] flex flex-col space-y-1 transition-all duration-300 print:hidden ${
        isGrayscale
          ? 'bg-white border-slate-300 text-black'
          : 'bg-[#061224]/85 border-cyan-500/10 text-slate-300 shadow-md'
      }`}>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse border border-cyan-300" />
          <span className="font-semibold text-[9.5px]">ติดตั้งแล้ว (Installed)</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse border border-amber-300" />
          <span className="font-semibold text-[9.5px]">อยู่ระหว่างดำเนินการ (Pending)</span>
        </div>
      </div>
    </div>
  );
};
