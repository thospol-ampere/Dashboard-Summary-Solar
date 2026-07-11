import React, { useState, useMemo, useEffect } from 'react';
import { ProjectData } from '../types';
import { ThailandMap } from './ThailandMap';
import { PrintSettingsModal } from './PrintSettingsModal';
import { 
  ArrowLeft, FileText, Printer, Building, ShieldCheck, Clock, Landmark, Percent, MapPin, 
  Settings, Zap, CheckCircle2, Hourglass, BarChart3, Leaf, Phone, Mail, Globe, Sparkles,
  X, Sliders, Palette, Eye, Layout, Check
} from 'lucide-react';

interface DashboardViewProps {
  project: ProjectData;
  onBackToEdit: () => void;
  onExportPDF: () => void;
  autoOpenPrint?: boolean;
  onClearAutoOpenPrint?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  project,
  onBackToEdit,
  onExportPDF,
  autoOpenPrint = false,
  onClearAutoOpenPrint,
}) => {
  const [hoveredLocationId, setHoveredLocationId] = useState<string | null>(null);

  // ----------------- PRINT SETTINGS STATE -----------------
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [paperSize, setPaperSize] = useState<'A4' | 'A3' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [marginSize, setMarginSize] = useState<'none' | 'narrow' | 'normal'>('narrow');
  const [colorMode, setColorMode] = useState<'dark' | 'light' | 'grayscale'>('dark');

  // Trigger modal open if autoOpenPrint is true
  useEffect(() => {
    if (autoOpenPrint) {
      setIsPrintModalOpen(true);
      if (onClearAutoOpenPrint) {
        onClearAutoOpenPrint();
      }
    }
  }, [autoOpenPrint, onClearAutoOpenPrint]);

  // ----------------- DATA PREPARATION & AGGREGATIONS -----------------
  const totalLocations = project.locations.length;
  
  // Total Contract kWp
  const totalContractkWp = useMemo(() => {
    return Math.round(project.locations.reduce((sum, l) => sum + l.capacityKWp, 0) * 100) / 100;
  }, [project.locations]);

  // Total Installed kWp (sum of actual installed capacity of locations where status is 'ติดตั้งแล้ว')
  const totalInstalledkWp = useMemo(() => {
    return Math.round(project.locations.reduce((sum, l) => {
      return sum + (l.status === 'ติดตั้งแล้ว' ? (l.actualCapacityKWp || 0) : 0);
    }, 0) * 100) / 100;
  }, [project.locations]);

  // Total In Progress kWp
  const totalInProgresskWp = useMemo(() => {
    return Math.round((totalContractkWp - totalInstalledkWp) * 100) / 100;
  }, [totalContractkWp, totalInstalledkWp]);

  // Percentages
  const installedPercent = useMemo(() => {
    if (totalContractkWp === 0) return 0;
    return Math.round((totalInstalledkWp / totalContractkWp) * 10000) / 100;
  }, [totalInstalledkWp, totalContractkWp]);

  const inProgressPercent = useMemo(() => {
    if (totalContractkWp === 0) return 0;
    return Math.round((totalInProgresskWp / totalContractkWp) * 10000) / 100;
  }, [totalInProgresskWp, totalContractkWp]);

  // CO2 reduction calculation (based on formula derived from solar yield in Thailand)
  const estimatedCO2Reduction = useMemo(() => {
    const factor = project.targetCO2ReductionFactor || 0.477;
    // Capacity kWp * yield (1266.6 kWh/kWp/year) * years * factor / 1000 to get tCO2
    const totalReduction = totalContractkWp * 1266.6 * project.servicePeriodYears * factor / 1000;
    return Math.round(totalReduction * 100) / 100;
  }, [totalContractkWp, project.servicePeriodYears, project.targetCO2ReductionFactor]);

  // Region aggregation: Sum capacities of locations in each region
  const regionalData = useMemo(() => {
    const regions: Record<string, number> = {
      'กรุงเทพมหานคร': 0,
      'ภาคกลาง': 0,
      'ภาคเหนือ': 0,
      'ภาคตะวันออกเฉียงเหนือ': 0,
      'ภาคตะวันออก': 0,
      'ภาคตะวันตก': 0,
      'ภาคใต้': 0,
    };

    project.locations.forEach((loc) => {
      if (regions[loc.region] !== undefined) {
        regions[loc.region] += loc.capacityKWp;
      } else {
        regions['กรุงเทพมหานคร'] += loc.capacityKWp;
      }
    });

    return Object.entries(regions).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
    }));
  }, [project.locations]);

  // Maximum value in region for rendering scaling bar length
  const maxRegionValue = useMemo(() => {
    const values = regionalData.map((r) => r.value);
    const maxVal = Math.max(...values);
    return maxVal > 0 ? maxVal : 1;
  }, [regionalData]);

  // ----------------- SVG DONUT CHART PATHS -----------------
  const donutPaths = useMemo(() => {
    const radius = 45;
    const strokeWidth = 14;
    const center = 60;
    const circ = 2 * Math.PI * radius; // 282.74
    
    // Installed angle
    const installedShare = totalContractkWp > 0 ? totalInstalledkWp / totalContractkWp : 0;
    const installedStroke = installedShare * circ;
    
    // In progress angle
    const inProgressShare = totalContractkWp > 0 ? totalInProgresskWp / totalContractkWp : 0;
    const inProgressStroke = inProgressShare * circ;

    return {
      circ,
      installedStroke,
      inProgressStroke,
      radius,
      strokeWidth,
      center,
    };
  }, [totalContractkWp, totalInstalledkWp, totalInProgresskWp]);

  // Format Date to Thai Elegant format with time
  const formattedUpdatedDate = useMemo(() => {
    if (!project.updatedDate) return '-';
    try {
      const date = new Date(project.updatedDate);
      if (isNaN(date.getTime())) return project.updatedDate;
      const monthNamesTh = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const day = date.getDate();
      const month = monthNamesTh[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day} ${month} ${year} เวลา ${hours}:${minutes} น.`;
    } catch {
      return project.updatedDate;
    }
  }, [project.updatedDate]);

  const isDark = colorMode === 'dark';
  const isGrayscale = colorMode === 'grayscale';

  // Theme variables for Dashboard cards
  const theme = {
    bg: isDark ? 'bg-[#070e1b] text-slate-100' : isGrayscale ? 'bg-white text-black' : 'bg-[#f8fafc] text-slate-800',
    card: isDark ? 'bg-[#0a182f] border-cyan-500/20 text-slate-100' : isGrayscale ? 'bg-white border-slate-300 text-black' : 'bg-white border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] text-slate-800',
    headerCard: isDark ? 'bg-[#0a182f] border-cyan-500/20 text-slate-100' : isGrayscale ? 'bg-white border-slate-300 text-black' : 'bg-white border-slate-200/80 shadow-[0_4px_20px_rgba(15,23,42,0.03)] text-slate-800',
    footerCard: isDark ? 'bg-[#050b15] border-slate-800/80 text-slate-400' : isGrayscale ? 'bg-white border-slate-300 text-black' : 'bg-slate-100 border-slate-200/60 shadow-inner text-slate-700',
    title: isDark ? 'text-white' : isGrayscale ? 'text-black' : 'text-slate-900',
    subtitle: isDark ? 'text-slate-400' : isGrayscale ? 'text-slate-600' : 'text-slate-500',
    textMuted: isDark ? 'text-slate-400' : isGrayscale ? 'text-slate-600' : 'text-slate-500',
    textMutedExtra: isDark ? 'text-slate-500' : isGrayscale ? 'text-slate-500' : 'text-slate-400',
    textMain: isDark ? 'text-slate-100' : isGrayscale ? 'text-black' : 'text-slate-700',
    accentText: isDark ? 'text-cyan-400' : isGrayscale ? 'text-slate-800' : 'text-cyan-600',
    accentBorder: isDark ? 'border-cyan-500/10' : isGrayscale ? 'border-slate-200' : 'border-cyan-100',
    accentBorderStrong: isDark ? 'border-cyan-500/20' : isGrayscale ? 'border-slate-300' : 'border-cyan-200',
    accentBg: isDark ? 'bg-cyan-950/40' : isGrayscale ? 'bg-slate-100' : 'bg-cyan-50',
    emeraldText: isDark ? 'text-emerald-400' : isGrayscale ? 'text-slate-800' : 'text-emerald-600',
    emeraldBg: isDark ? 'bg-emerald-950/60 border-emerald-500/20 text-emerald-400' : isGrayscale ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-emerald-50 border-emerald-200/60 text-emerald-600',
    amberText: isDark ? 'text-amber-400' : isGrayscale ? 'text-slate-800' : 'text-amber-600',
    amberBg: isDark ? 'bg-amber-950/60 border-amber-500/20 text-amber-400' : isGrayscale ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-amber-50 border-amber-200/60 text-amber-600',
    cyanBg: isDark ? 'bg-cyan-950/60 border-cyan-500/20 text-cyan-400' : isGrayscale ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-cyan-50 border-cyan-200/60 text-cyan-600',
    donutBg: isDark ? '#1e293b' : isGrayscale ? '#e2e8f0' : '#f1f5f9',
    donutInstalled: isDark ? '#0ea5e9' : isGrayscale ? '#475569' : '#0284c7',
    donutInProgress: isDark ? '#f59e0b' : isGrayscale ? '#94a3b8' : '#ea580c',
  };

  const printMarginStyle = useMemo(() => {
    switch (marginSize) {
      case 'none': return '0mm';
      case 'narrow': return '5mm';
      case 'normal': return '12mm';
      default: return '5mm';
    }
  }, [marginSize]);

  const printSizeStyle = useMemo(() => {
    return `${paperSize.toLowerCase()} ${orientation}`;
  }, [paperSize, orientation]);

  return (
    <div className={`w-full min-h-screen flex flex-col font-sans select-none relative pb-10 transition-colors duration-300 ${theme.bg}`}>
      
      {/* ----------------- DYNAMIC PRINT STYLE OVERRIDES ----------------- */}
      <style>{`
        @media print {
          @page {
            size: ${printSizeStyle};
            margin: ${printMarginStyle} !important;
          }
          
          /* Custom overrides for printing */
          body {
            background-color: ${isGrayscale ? '#ffffff' : isDark ? '#070e1b' : '#f8fafc'} !important;
            color: ${isGrayscale ? '#000000' : isDark ? '#f8fafc' : '#0f172a'} !important;
          }
          
          .print-page-wrapper {
            width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            padding: ${printMarginStyle} !important;
            margin: 0 !important;
          }

          /* Force exact height constraints on map to fit One Page perfectly */
          .map-container-print {
            height: ${orientation === 'landscape' ? '36vh' : '24vh'} !important;
            max-height: ${orientation === 'landscape' ? '36vh' : '24vh'} !important;
          }
          
          /* Grayscale conversion filter if grayscale colorMode selected */
          ${isGrayscale ? `
            html, body, svg, img {
              filter: grayscale(100%) !important;
            }
          ` : ''}
        }
      `}</style>

      {/* ----------------- INTERACTIVE CONTROL BAR (HIDDEN IN PRINT) ----------------- */}
      <div className="w-full bg-slate-900/90 border-b border-slate-800 px-6 py-3 flex items-center justify-between z-50 sticky top-0 backdrop-blur-md print:hidden">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToEdit}
            className="flex items-center space-x-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>กลับไปหน้าแก้ไขข้อมูล</span>
          </button>
          
          <div className="h-4 w-px bg-slate-800" />
          
          <span className="text-xs text-slate-400 font-medium">
            กำลังแสดงตัวอย่าง Dashboard แบบ One Page (Digital Twin Theme)
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition shadow-md shadow-emerald-950/40 animate-pulse"
          >
            <Printer className="w-4 h-4" />
            <span>ปรับแต่งการพิมพ์ / บันทึก PDF</span>
          </button>
        </div>
      </div>

      {/* ----------------- DASHBOARD CONTAINER (A4 LANDSCAPE SCALE FRIENDLY) ----------------- */}
      <div className="w-full max-w-[1360px] mx-auto p-4 md:p-6 flex flex-col flex-1 space-y-4 print:p-0 print:max-w-none print:w-full print-page-wrapper">
        
        {/* ================= HEADER SECTION ================= */}
        <div className={`w-full rounded-xl border p-4.5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm transition-all duration-300 ${theme.headerCard}`}>
          {/* Logo Left */}
          <div className="flex items-center space-x-3.5">
            <div className={`w-11 h-11 rounded-full flex items-center justify-center border border-cyan-400/80 transition-all duration-300 ${theme.cyanBg}`}>
              {/* Custom Royal Thai Crown Emblem replica */}
              <Building className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="text-left">
              <span className={`text-[10px] uppercase font-bold tracking-widest block ${theme.accentText}`}>หน่วยงานเจ้าของโครงการ</span>
              <span className={`font-semibold text-sm ${theme.title}`}>{project.customerName || 'กรมประชาสัมพันธ์'}</span>
            </div>
          </div>

          {/* Core Title (Dynamic) */}
          <div className="text-center flex-1 max-w-2xl px-4">
            <h1 className={`text-base sm:text-lg md:text-xl font-bold tracking-tight leading-snug drop-shadow-sm ${theme.title}`}>
              {project.projectName || 'โครงการติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์'}
            </h1>
            <div className="flex items-center justify-center space-x-2 mt-1">
              <span className="h-0.5 w-6 bg-cyan-500/30" />
              <p className={`text-xs font-semibold tracking-wider ${theme.accentText}`}>
                ภาพรวมโครงการ | DIGITAL TWIN DASHBOARD
              </p>
              <span className="h-0.5 w-6 bg-cyan-500/30" />
            </div>
          </div>

          {/* Logo Right */}
          <div className="flex items-center space-x-3 md:text-right">
            <div className="text-left md:text-right">
              <span className="text-[9px] uppercase font-bold tracking-widest text-emerald-500 block">Clean Energy System</span>
              <span className={`text-xs font-extrabold tracking-wider ${theme.title}`}>FOR A BETTER FUTURE</span>
            </div>
            <div className={`w-11 h-11 rounded-lg flex items-center justify-center border border-emerald-400/80 transition-all duration-300 ${theme.emeraldBg}`}>
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* ================= THREE COLUMN ROW ================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
          
          {/* ----- COLUMN 1: PROJECT METADATA PANEL (LEFT, SPAN 3) ----- */}
          <div className="lg:col-span-3 flex flex-col">
            <div className={`rounded-xl p-4 flex-1 flex flex-col justify-between space-y-4 shadow-sm transition-all duration-300 ${theme.card}`}>
              
              {/* Card Header */}
              <div className={`border-b pb-2 flex items-center space-x-2 ${theme.accentBorder}`}>
                <FileText className="w-4 h-4 text-cyan-500" />
                <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-wider">ข้อมูลโครงการ (Project Info)</h2>
              </div>

              {/* Attributes stack */}
              <div className="flex-1 flex flex-col justify-between space-y-3.5 pt-1.5">
                {/* Project Name Attribute */}
                <div>
                  <span className={`text-[10px] block font-medium ${theme.subtitle}`}>ชื่อโครงการ</span>
                  <p className={`text-xs font-semibold leading-tight line-clamp-2 ${theme.title}`}>
                    {project.projectName || '-'}
                  </p>
                </div>

                {/* Customer */}
                <div>
                  <span className={`text-[10px] block font-medium ${theme.subtitle}`}>หน่วยงานเจ้าของโครงการ</span>
                  <p className={`text-xs font-semibold truncate ${theme.accentText}`}>
                    {project.customerName || '-'}
                  </p>
                </div>

                {/* Project Type */}
                <div>
                  <span className={`text-[10px] block font-medium ${theme.subtitle}`}>รูปแบบโครงการ</span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    <p className={`text-xs font-semibold ${theme.title}`}>
                      {project.projectType === 'Solar Rooftop' && 'การติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์แบบติดตั้งบนหลังคา (Solar Rooftop)'}
                      {project.projectType === 'Floating Solar' && 'การติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์แบบลอยน้ำ (Floating Solar)'}
                      {project.projectType === 'Solar Farm' && 'การติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์แบบติดตั้งบนพื้นดิน (Solar Farm)'}
                    </p>
                  </div>
                </div>

                {/* Locations count */}
                <div className={`flex items-center justify-between border-t pt-2 ${theme.accentBorder}`}>
                  <div className="flex items-center space-x-1.5">
                    <MapPin className="w-3.5 h-3.5 text-cyan-500" />
                    <span className={`text-[10px] font-medium ${theme.subtitle}`}>จำนวนสถานที่ติดตั้ง</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${theme.title}`}>{totalLocations} แห่ง</span>
                </div>

                {/* Contract Capacity */}
                <div className={`flex items-center justify-between border-t pt-2 ${theme.accentBorder}`}>
                  <div className="flex items-center space-x-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-500" />
                    <span className={`text-[10px] font-medium ${theme.subtitle}`}>กำลังติดตั้งรวม</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${theme.accentText}`}>
                    {totalContractkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                  </span>
                </div>

                {/* Contract detail */}
                <div className={`border-t pt-2 ${theme.accentBorder}`}>
                  <span className={`text-[10px] block font-medium ${theme.subtitle}`}>สัญญาให้บริการฯ</span>
                  <p className={`text-xs font-medium leading-tight ${theme.title}`}>
                    {project.contractNumber || '-'}
                  </p>
                </div>

                {/* Service Period */}
                <div className={`flex items-center justify-between border-t pt-2 ${theme.accentBorder}`}>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-500" />
                    <span className={`text-[10px] font-medium ${theme.subtitle}`}>ระยะเวลาในการให้บริการ</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${theme.title}`}>{project.servicePeriodYears} ปี</span>
                </div>

                {/* Contract Value */}
                <div className={`border-t pt-2 ${theme.accentBorder}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Landmark className="w-3.5 h-3.5 text-cyan-500" />
                      <span className={`text-[10px] font-medium ${theme.subtitle}`}>วงเงินโครงการ</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${theme.title}`}>
                      {project.contractValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท
                    </span>
                  </div>
                  <span className={`text-[9px] text-right block mt-0.5 ${theme.textMutedExtra}`}>(รวมภาษีมูลค่าเพิ่ม)</span>
                </div>

                {/* Discount */}
                <div className={`flex items-center justify-between border-t pt-2 ${theme.accentBorder}`}>
                  <div className="flex items-center space-x-1.5">
                    <Percent className="w-3.5 h-3.5 text-cyan-500" />
                    <span className={`text-[10px] font-medium ${theme.subtitle}`}>ส่วนลดค่าบริการ</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${theme.emeraldText}`}>
                    {project.serviceDiscountPercent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                  </span>
                </div>

              </div>

            </div>
          </div>

          {/* ----- COLUMN 2: INTERACTIVE MAP (MIDDLE, SPAN 6) ----- */}
          <div className="lg:col-span-6 flex flex-col justify-between map-container-print">
            <div className={`rounded-xl p-3 flex-1 flex flex-col justify-between space-y-2 shadow-sm relative transition-all duration-300 ${theme.card}`}>
              <div className={`border-b pb-1.5 flex items-center justify-between ${theme.accentBorder}`}>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-wider">แผนที่แสดงตำแหน่งสถานที่ติดตั้ง (Locations)</h2>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-colors duration-300 ${theme.cyanBg} ${theme.accentBorderStrong}`}>
                  DIGITAL CONSTANT PLOTTER
                </span>
              </div>

              {/* Map Canvas */}
              <div className="flex-1 w-full relative">
                <ThailandMap
                  locations={project.locations}
                  hoveredLocationId={hoveredLocationId}
                  setHoveredLocationId={setHoveredLocationId}
                  colorMode={colorMode}
                />
              </div>
            </div>
          </div>

          {/* ----- COLUMN 3: CHARTS & METRICS PANEL (RIGHT, SPAN 3) ----- */}
          <div className="lg:col-span-3 flex flex-col justify-between space-y-4">
            
            {/* Upper: Project Status Donut Chart */}
            <div className={`rounded-xl p-4 flex flex-col shadow-sm transition-all duration-300 ${theme.card}`}>
              <div className={`border-b pb-2 flex items-center space-x-2 ${theme.accentBorder}`}>
                <CheckCircle2 className="w-4 h-4 text-cyan-500" />
                <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-wider">สรุปสถานภาพรวมโครงการ</h2>
              </div>

              <div className="flex flex-col items-center justify-center py-4 relative">
                {/* SVG Pure Donut Chart */}
                <div className="w-36 h-36 relative flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                    {/* Background circle */}
                    <circle
                      cx={donutPaths.center}
                      cy={donutPaths.center}
                      r={donutPaths.radius}
                      fill="transparent"
                      stroke={theme.donutBg}
                      strokeWidth={donutPaths.strokeWidth}
                    />

                    {/* Installed (Green-Cyan) */}
                    {totalInstalledkWp > 0 && (
                      <circle
                        cx={donutPaths.center}
                        cy={donutPaths.center}
                        r={donutPaths.radius}
                        fill="transparent"
                        stroke={theme.donutInstalled}
                        strokeWidth={donutPaths.strokeWidth}
                        strokeDasharray={`${donutPaths.installedStroke} ${donutPaths.circ}`}
                        strokeDashoffset={0}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: isDark ? 'drop-shadow(0px 0px 3px rgba(14, 165, 233, 0.4))' : undefined }}
                      />
                    )}

                    {/* In Progress (Orange) */}
                    {totalInProgresskWp > 0 && (
                      <circle
                        cx={donutPaths.center}
                        cy={donutPaths.center}
                        r={donutPaths.radius}
                        fill="transparent"
                        stroke={theme.donutInProgress}
                        strokeWidth={donutPaths.strokeWidth}
                        strokeDasharray={`${donutPaths.inProgressStroke} ${donutPaths.circ}`}
                        strokeDashoffset={-donutPaths.installedStroke}
                        strokeLinecap="round"
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: isDark ? 'drop-shadow(0px 0px 3px rgba(245, 158, 11, 0.4))' : undefined }}
                      />
                    )}
                  </svg>

                  {/* Inner text overlay */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className={`text-[13px] font-extrabold font-mono drop-shadow-sm ${theme.title}`}>
                      {totalContractkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className={`text-[8px] font-bold block leading-none ${theme.textMuted}`}>kWp</span>
                    <span className={`text-[8px] font-semibold uppercase tracking-wider block mt-1 ${theme.accentText}`}>กำลังติดตั้งรวม</span>
                  </div>
                </div>

                {/* Legends */}
                <div className="w-full space-y-2 mt-4 text-left">
                  {/* Installed segment */}
                  <div className={`flex items-center justify-between p-1.5 rounded border transition-all duration-300 ${
                    isDark ? 'bg-slate-900/40 border-cyan-500/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                      <span className={`text-[10px] font-semibold ${theme.title}`}>ติดตั้งแล้ว (Installed)</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold font-mono block ${theme.title}`}>
                        {totalInstalledkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                      </span>
                      <span className={`text-[9px] font-mono block ${theme.accentText}`}>
                        ({installedPercent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                      </span>
                    </div>
                  </div>

                  {/* In Progress segment */}
                  <div className={`flex items-center justify-between p-1.5 rounded border transition-all duration-300 ${
                    isDark ? 'bg-slate-900/40 border-amber-500/5' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className={`text-[10px] font-semibold ${theme.title}`}>อยู่ระหว่างดำเนินการ</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-bold font-mono block ${theme.title}`}>
                        {totalInProgresskWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                      </span>
                      <span className={`text-[9px] font-mono block ${theme.amberText}`}>
                        ({inProgressPercent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Lower: Region Horizontal Bar Chart */}
            <div className={`rounded-xl p-4 flex flex-col flex-1 shadow-sm transition-all duration-300 ${theme.card}`}>
              <div className={`border-b pb-2 flex items-center justify-between ${theme.accentBorder}`}>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-xs font-bold text-cyan-500 uppercase tracking-wider">กำลังติดตั้งแยกตามภูมิภาค</h2>
                </div>
                <span className={`text-[8px] font-mono ${theme.subtitle}`}>หน่วย: kWp</span>
              </div>

              {/* Dynamic Region Bars */}
              <div className="flex-1 flex flex-col justify-between space-y-2 py-3">
                {regionalData.map((reg) => {
                  const percent = maxRegionValue > 0 ? (reg.value / maxRegionValue) * 100 : 0;
                  
                  return (
                    <div key={reg.name} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className={`font-semibold ${theme.title}`}>{reg.name}</span>
                        <span className={`font-bold font-mono ${theme.accentText}`}>
                          {reg.value.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      
                      {/* Bar Background */}
                      <div className={`w-full h-2.5 rounded border overflow-hidden relative transition-colors duration-300 ${
                        isDark ? 'bg-slate-900 border-cyan-500/5' : isGrayscale ? 'bg-slate-200 border-slate-300' : 'bg-slate-100 border-slate-200'
                      }`}>
                        {/* Fill */}
                        <div
                          className={`h-full rounded transition-all duration-1000 ease-out ${
                            isGrayscale ? 'bg-slate-600' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>

        {/* ================= BOTTOM ROW: KPI INDICATORS (5 TILES) ================= */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 w-full">
          
          {/* Tile 1: Total locations */}
          <div className={`rounded-xl p-3 flex items-center space-x-3 shadow-sm transition-all duration-300 ${theme.card}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-500/20 flex-shrink-0 transition-all duration-300 ${theme.cyanBg}`}>
              <MapPin className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-[9px] text-slate-400 uppercase font-semibold block truncate">จำนวนสถานที่ทั้งหมด</span>
              <p className="text-lg font-black text-white font-mono leading-none mt-1">
                {totalLocations} <span className="text-xs font-semibold text-slate-400">แห่ง</span>
              </p>
            </div>
          </div>

          {/* Tile 2: Total Contract capacity */}
          <div className={`rounded-xl p-3 flex items-center space-x-3 shadow-sm transition-all duration-300 ${theme.card}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-cyan-500/20 flex-shrink-0 transition-all duration-300 ${theme.cyanBg}`}>
              <Zap className="w-5 h-5 text-cyan-500" />
            </div>
            <div className="text-left min-w-0">
              <span className={`text-[9px] uppercase font-semibold block truncate ${theme.textMuted}`}>กำลังติดตั้งรวม</span>
              <p className={`text-base font-black font-mono leading-none mt-1 ${theme.accentText}`}>
                {totalContractkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-[10px] font-semibold ml-1 ${theme.textMuted}`}>kWp</span>
              </p>
            </div>
          </div>

          {/* Tile 3: Total Completed capacity */}
          <div className={`rounded-xl p-3 flex items-center space-x-3 shadow-sm transition-all duration-300 ${theme.card} col-span-1`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-emerald-500/20 flex-shrink-0 transition-all duration-300 ${theme.emeraldBg}`}>
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className={`text-[9px] uppercase font-semibold block truncate ${theme.textMuted}`}>ติดตั้งแล้ว</span>
              <p className={`text-sm font-black font-mono leading-none mt-0.5 ${theme.title}`}>
                {totalInstalledkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-[9px] font-semibold ml-0.5 ${theme.textMuted}`}>kWp ({installedPercent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</span>
              </p>
              <span className={`text-[8px] mt-1 block leading-none truncate font-mono ${theme.textMutedExtra}`}>
                (ตามเป้าหมายหลัก {totalContractkWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp)
              </span>
            </div>
          </div>

          {/* Tile 4: Total In Progress capacity */}
          <div className={`rounded-xl p-3 flex items-center space-x-3 shadow-sm transition-all duration-300 ${theme.card}`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-amber-500/20 flex-shrink-0 transition-all duration-300 ${theme.amberBg}`}>
              <Hourglass className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-left min-w-0">
              <span className={`text-[9px] uppercase font-semibold block truncate ${theme.textMuted}`}>อยู่ระหว่างดำเนินการ</span>
              <p className={`text-sm font-black font-mono leading-none mt-1 ${theme.title}`}>
                {totalInProgresskWp.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className={`text-[9px] ml-1 font-mono ${theme.amberText}`}>kWp ({inProgressPercent.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)</span>
              </p>
            </div>
          </div>

          {/* Tile 5: CO2 Reduction */}
          <div className={`rounded-xl p-3 flex items-center space-x-3 shadow-sm transition-all duration-300 ${theme.card} col-span-2 md:col-span-1`}>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center border border-emerald-500/20 flex-shrink-0 transition-all duration-300 ${theme.emeraldBg}`}>
              <Leaf className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <span className={`text-[9px] uppercase font-semibold block truncate ${theme.textMuted}`}>คาดการณ์ลดการปล่อย CO₂</span>
              <p className={`text-sm font-extrabold font-mono leading-tight mt-1 ${theme.emeraldText}`}>
                {estimatedCO2Reduction.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <span className={`text-[8px] block leading-none mt-0.5 ${theme.textMutedExtra}`}>
                tCO₂ (*คำนวณ 0.477 tCO₂/MWh)
              </span>
            </div>
          </div>

        </div>

        {/* ================= FOOTER / DOCUMENT CONTACT INFO ================= */}
        <div className={`w-full rounded-xl border p-3 flex flex-col md:flex-row items-center justify-between text-[11px] gap-3 transition-colors duration-300 ${theme.footerCard}`}>
          
          {/* Update Timestamp and Signatures */}
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <span className={`mr-1.5 font-medium ${theme.textMuted}`}>ข้อมูลอัพเดทเมื่อ:</span>
              <span className={`font-bold font-mono px-2 py-0.5 rounded border transition-colors duration-300 ${theme.accentBg} ${theme.accentBorder}`}>
                {formattedUpdatedDate}
              </span>
            </div>
            <div>
              <span className={`mr-1.5 font-medium ${theme.textMuted}`}>จัดทำโดย:</span>
              <span className={`font-semibold ${theme.title}`}>{project.meaContact.department || 'ฝ่ายธุรกิจคณะบริการคุณภาพไฟฟ้า'}</span>
            </div>
          </div>

          {/* MEA Contact channels */}
          <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2">
            <div className="flex items-center space-x-1.5">
              <Phone className="w-3.5 h-3.5 text-cyan-500" />
              <span className={`font-mono ${theme.title}`}>{project.meaContact.phone || '02 256 3333'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Mail className="w-3.5 h-3.5 text-cyan-500" />
              <span className={`font-mono ${theme.title}`}>{project.meaContact.email || 'mea.energy@mea.or.th'}</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <Globe className="w-3.5 h-3.5 text-cyan-500" />
              <span className={`font-mono ${theme.title}`}>www.mea.or.th</span>
            </div>
          </div>

        </div>

      </div>

      {/* ----------------- PRINT SETTINGS MODAL ----------------- */}
      <PrintSettingsModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        project={project}
        paperSize={paperSize}
        setPaperSize={setPaperSize}
        orientation={orientation}
        setOrientation={setOrientation}
        marginSize={marginSize}
        setMarginSize={setMarginSize}
        colorMode={colorMode}
        setColorMode={setColorMode}
        onConfirmPrint={() => {
          setIsPrintModalOpen(false);
          // Allow modal close transition/state change to apply then trigger browser print dialog
          setTimeout(() => {
            window.print();
          }, 150);
        }}
      />

    </div>
  );
};
