
import React, { useState, useMemo, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { 
  X, Printer, Layout, Sliders, Palette, FileText, Check, Sparkles, Monitor,
  Folder, FolderOpen, Save, ChevronRight, PlusCircle, AlertCircle, Search, FileDown,
  ArrowLeft, HardDrive, Laptop, HelpCircle, Tablet
} from 'lucide-react';
import { ProjectData, PROVINCE_MAP } from '../types';

// Helper functions to convert OKLCH color strings to standard RGB/RGBA strings
// because html2canvas does not support modern CSS color functions like OKLCH.
function parseAndConvertOklch(fullMatch: string, innerContent: string): string {
  const parts = innerContent.trim().split(/[\s/]+/);
  if (parts.length < 3) return fullMatch;

  const lStr = parts[0];
  const cStr = parts[1];
  const hStr = parts[2];
  const aStr = parts[3] || '1';

  let L = 0;
  if (lStr.endsWith('%')) {
    L = parseFloat(lStr) / 100;
  } else {
    L = parseFloat(lStr);
  }

  let C = 0;
  if (cStr.endsWith('%')) {
    C = parseFloat(cStr) / 100;
  } else {
    C = parseFloat(cStr);
  }

  let H = 0;
  if (hStr === 'none') {
    H = 0;
  } else if (hStr.endsWith('deg')) {
    H = parseFloat(hStr);
  } else if (hStr.endsWith('rad')) {
    H = parseFloat(hStr) * (180 / Math.PI);
  } else if (hStr.endsWith('turn')) {
    H = parseFloat(hStr) * 360;
  } else {
    H = parseFloat(hStr);
  }

  let A = 1;
  if (aStr.endsWith('%')) {
    A = parseFloat(aStr) / 100;
  } else {
    A = parseFloat(aStr);
  }

  if (isNaN(L) || isNaN(C) || isNaN(H)) return fullMatch;

  const hRad = H * (Math.PI / 180);
  const oklab_a = C * Math.cos(hRad);
  const oklab_b = C * Math.sin(hRad);

  const l_ = L + 0.3963377774 * oklab_a + 0.2158037573 * oklab_b;
  const m_ = L - 0.1055613458 * oklab_a - 0.0638541728 * oklab_b;
  const s_ = L - 0.0894841775 * oklab_a - 1.2914855414 * oklab_b;

  const l_3 = l_ * l_ * l_;
  const m_3 = m_ * m_ * m_;
  const s_3 = s_ * s_ * s_;

  const rLinear = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
  const gLinear = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
  const bLinear = -0.0041960863 * l_3 - 0.7034186147 * m_3 + 1.7076219004 * s_3;

  const toSRGB = (c: number) => {
    if (c <= 0.0031308) {
      return Math.max(0, Math.min(255, Math.round(12.92 * c * 255)));
    } else {
      return Math.max(0, Math.min(255, Math.round((1.055 * Math.pow(c, 1 / 2.4) - 0.055) * 255)));
    }
  };

  const srgb_r = toSRGB(rLinear);
  const srgb_g = toSRGB(gLinear);
  const srgb_b = toSRGB(bLinear);

  if (A >= 1) {
    return `rgb(${srgb_r}, ${srgb_g}, ${srgb_b})`;
  } else {
    return `rgba(${srgb_r}, ${srgb_g}, ${srgb_b}, ${A})`;
  }
}

function replaceOklchInString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/oklch\(([^)]+)\)/g, parseAndConvertOklch);
}

const convertOklchStylesRecursively = (origNode: HTMLElement, cloneNode: HTMLElement) => {
  const computed = window.getComputedStyle(origNode);
  const propertiesToConvert = [
    'color',
    'backgroundColor',
    'borderColor',
    'borderTopColor',
    'borderRightColor',
    'borderBottomColor',
    'borderLeftColor',
    'outlineColor',
    'fill',
    'stroke',
    'backgroundImage',
    'boxShadow',
    'textShadow',
    'borderImage',
    'background',
    'border'
  ];

  propertiesToConvert.forEach((prop) => {
    try {
      const val = computed[prop as any];
      if (val && val.includes('oklch')) {
        const newVal = replaceOklchInString(val);
        cloneNode.style[prop as any] = newVal;
      }
    } catch (e) {
      // ignore style reading errors
    }
  });

  const origChildren = origNode.children;
  const cloneChildren = cloneNode.children;
  const len = Math.min(origChildren.length, cloneChildren.length);
  for (let i = 0; i < len; i++) {
    convertOklchStylesRecursively(origChildren[i] as HTMLElement, cloneChildren[i] as HTMLElement);
  }
};

interface PrintSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: ProjectData;
  paperSize: 'A4' | 'A3' | 'Letter';
  setPaperSize: (size: 'A4' | 'A3' | 'Letter') => void;
  orientation: 'landscape' | 'portrait';
  setOrientation: (orientation: 'landscape' | 'portrait') => void;
  marginSize: 'none' | 'narrow' | 'normal';
  setMarginSize: (margin: 'none' | 'narrow' | 'normal') => void;
  colorMode: 'dark' | 'light' | 'grayscale';
  setColorMode: (mode: 'dark' | 'light' | 'grayscale') => void;
  onConfirmPrint: () => void;
}

export const PrintSettingsModal: React.FC<PrintSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  marginSize,
  setMarginSize,
  colorMode,
  setColorMode,
  onConfirmPrint,
}) => {

  // ----------------- PRINT CONFIRMATION STATE -----------------
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportType, setExportType] = useState<'pdf' | 'print'>('pdf');
  
  // Create a default clean filename
  const defaultFileName = useMemo(() => {
    const safeProjectName = (project.projectName || 'MEA_Solar')
      .trim()
      .replace(/[\s\t\n]+/g, '_')
      .replace(/[^\w\u0e00-\u0e7f\-]/g, '');
    const dateStr = new Date().toLocaleDateString('th-TH').replace(/\//g, '-');
    return `รายงานสรุป_Solar_${safeProjectName}_${dateStr}`;
  }, [project.projectName]);

  const [pdfFileName, setPdfFileName] = useState(defaultFileName);
  const [selectedDirectory, setSelectedDirectory] = useState('Downloads');
  const [selectedPrinter, setSelectedPrinter] = useState('HP LaserJet Pro MFP M227 (ห้องผู้บริหาร)');
  const [printCopies, setPrintCopies] = useState(1);
  const [isDirPickerOpen, setIsDirPickerOpen] = useState(false);
  
  // Notification banners
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMsg, setNotificationMsg] = useState('');

  // Sync filename when project name changes or modal opens
  useEffect(() => {
    setPdfFileName(defaultFileName);
  }, [defaultFileName]);

  // ----------------- MOCK FILE SYSTEM & DIR PICKER STATE -----------------
  const [currentPath, setCurrentPath] = useState<string>('Desktop/MEA_Solar_Rooftop_Projects');
  const [fileSystem, setFileSystem] = useState<Record<string, { name: string; type: 'folder' | 'file' }[]>>({
    'This PC': [
      { name: 'Desktop', type: 'folder' },
      { name: 'Documents', type: 'folder' },
      { name: 'Downloads', type: 'folder' },
      { name: 'MEA_Cloud_Drive', type: 'folder' },
      { name: 'Tablet', type: 'folder' }
    ],
    'Desktop': [
      { name: 'MEA_Solar_Rooftop_Projects', type: 'folder' },
      { name: 'รายงานสรุป_ประจำปี', type: 'folder' },
      { name: 'Draft_Report.docx', type: 'file' }
    ],
    'Desktop/MEA_Solar_Rooftop_Projects': [
      { name: 'รายงานสรุป_2569', type: 'folder' },
      { name: 'ข้อมูลการติดตั้ง_MEA', type: 'folder' },
      { name: 'เอกสารแนบ_สัญญา', type: 'folder' },
      { name: 'MEA_Solar_Rooftop_Dashboard.pdf', type: 'file' }
    ],
    'Desktop/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569': [
      { name: 'ไตรมาส_1', type: 'folder' },
      { name: 'ไตรมาส_2', type: 'folder' }
    ],
    'Desktop/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569/ไตรมาส_1': [],
    'Desktop/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569/ไตรมาส_2': [],
    'Desktop/MEA_Solar_Rooftop_Projects/ข้อมูลการติดตั้ง_MEA': [],
    'Desktop/MEA_Solar_Rooftop_Projects/เอกสารแนบ_สัญญา': [],
    'Desktop/รายงานสรุป_ประจำปี': [],
    'Documents': [
      { name: 'MEA_Solar_Rooftop_Projects', type: 'folder' },
      { name: 'Personal_Doc', type: 'folder' },
      { name: 'Resume_2026.pdf', type: 'file' }
    ],
    'Documents/MEA_Solar_Rooftop_Projects': [],
    'Documents/Personal_Doc': [],
    'Downloads': [
      { name: 'MEA_Solar_Rooftop_Projects', type: 'folder' },
      { name: 'installer-setup.exe', type: 'file' },
      { name: 'MEA_Icon.png', type: 'file' }
    ],
    'Downloads/MEA_Solar_Rooftop_Projects': [],
    'MEA_Cloud_Drive': [
      { name: 'โครงการติดตั้ง_Solar_MEA', type: 'folder' },
      { name: 'เอกสารเผยแพร่_ประชาสัมพันธ์', type: 'folder' }
    ],
    'MEA_Cloud_Drive/โครงการติดตั้ง_Solar_MEA': [],
    'MEA_Cloud_Drive/เอกสารเผยแพร่_ประชาสัมพันธ์': [],
    'Tablet': [
      { name: 'MEA_Solar_Rooftop_Projects', type: 'folder' },
      { name: 'รายงานสรุป_2569', type: 'folder' },
      { name: 'เอกสารแนบ_สัญญา', type: 'folder' }
    ],
    'Tablet/MEA_Solar_Rooftop_Projects': [
      { name: 'รายงานสรุป_2569', type: 'folder' },
      { name: 'ข้อมูลการติดตั้ง_MEA', type: 'folder' },
      { name: 'เอกสารแนบ_สัญญา', type: 'folder' },
      { name: 'MEA_Solar_Rooftop_Dashboard.pdf', type: 'file' }
    ],
    'Tablet/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569': [
      { name: 'ไตรมาส_1', type: 'folder' },
      { name: 'ไตรมาส_2', type: 'folder' }
    ],
    'Tablet/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569/ไตรมาส_1': [],
    'Tablet/MEA_Solar_Rooftop_Projects/รายงานสรุป_2569/ไตรมาส_2': [],
    'Tablet/MEA_Solar_Rooftop_Projects/ข้อมูลการติดตั้ง_MEA': [],
    'Tablet/MEA_Solar_Rooftop_Projects/เอกสารแนบ_สัญญา': [],
    'Tablet/รายงานสรุป_2569': [],
    'Tablet/เอกสารแนบ_สัญญา': []
  });
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNewFolderInput, setShowNewFolderInput] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');

  // Handle directory navigation
  const handleFolderDoubleClick = (folderName: string) => {
    let newPath = '';
    if (currentPath === 'This PC') {
      newPath = folderName;
    } else {
      newPath = `${currentPath}/${folderName}`;
    }
    
    // Ensure entry exists in file system
    if (!fileSystem[newPath]) {
      setFileSystem(prev => ({
        ...prev,
        [newPath]: []
      }));
    }
    
    setCurrentPath(newPath);
    setSearchQuery('');
  };

  const handleBreadcrumbClick = (partIndex: number, parts: string[]) => {
    if (partIndex === -1) {
      setCurrentPath('This PC');
    } else {
      const newPath = parts.slice(0, partIndex + 1).join('/');
      setCurrentPath(newPath);
    }
    setSearchQuery('');
  };

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    const trimmedName = newFolderName.trim();
    const currentContents = fileSystem[currentPath] || [];
    
    // Check if name already exists
    if (currentContents.some(item => item.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('โฟลเดอร์นี้มีอยู่แล้ว!');
      return;
    }

    // Add folder to current path
    const updatedContents = [...currentContents, { name: trimmedName, type: 'folder' as const }];
    const newPath = currentPath === 'This PC' ? trimmedName : `${currentPath}/${trimmedName}`;

    setFileSystem(prev => ({
      ...prev,
      [currentPath]: updatedContents,
      [newPath]: []
    }));

    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  // Quick Preset Name Actions
  const appendToFileName = (term: string) => {
    setPdfFileName(prev => {
      // Remove any trailing .pdf if edited
      const base = prev.endsWith('.pdf') ? prev.slice(0, -4) : prev;
      return `${base}_${term}`;
    });
  };

  // Proceed to print / save PDF
  const handleFinalSubmit = () => {
    // 1. Temporarily change document title to user's desired filename
    const originalTitle = document.title;
    
    // Ensure we don't end with double .pdf when document.title is read by browser
    const cleanTitle = pdfFileName.endsWith('.pdf') ? pdfFileName.slice(0, -4) : pdfFileName;
    
    document.title = cleanTitle;

    // 2. Set temporary banners / feedback
    setIsExportDialogOpen(false);
    
    if (exportType === 'pdf') {
      // Direct PDF Generation using html2canvas & jsPDF for Tablet and PC support
      setNotificationMsg(`กำลังวิเคราะห์ความคมชัดและจัดเตรียมไฟล์ "${cleanTitle}.pdf"...`);
      setShowNotification(true);

      setTimeout(() => {
        const input = document.getElementById('dashboard-print-area');
        if (!input) {
          setNotificationMsg('เกิดข้อผิดพลาด: ไม่พบพื้นที่ที่ต้องการสร้าง PDF');
          setTimeout(() => setShowNotification(false), 4000);
          document.title = originalTitle;
          return;
        }

        // Capture dashboard element with precise dimension simulation and ignore viewport scroll
        html2canvas(input, {
          scale: 1.5, // Best balance of high definition and device memory safety
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: colorMode === 'dark' ? '#070e1b' : colorMode === 'grayscale' ? '#ffffff' : '#f8fafc',
          scrollX: 0,
          scrollY: 0,
          width: input.scrollWidth || input.offsetWidth || 1360,
          height: input.scrollHeight || input.offsetHeight || 1000,
          windowWidth: input.scrollWidth || input.offsetWidth || 1360,
          windowHeight: input.scrollHeight || input.offsetHeight || 1000,
          onclone: (clonedDoc) => {
            try {
              const cloneRoot = clonedDoc.getElementById('dashboard-print-area');
              if (cloneRoot && input) {
                convertOklchStylesRecursively(input, cloneRoot);
              }
            } catch (err) {
              console.error('Styles conversion inside onclone failed:', err);
            }
          }
        }).then((canvas) => {
          try {
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            
            // Set up PDF matching paper settings
            const pdfOrientation = orientation === 'landscape' ? 'l' : 'p';
            const pdf = new jsPDF({
              orientation: pdfOrientation,
              unit: 'mm',
              format: paperSize.toLowerCase() as any,
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();

            // Set background color of PDF to match theme
            const isDark = colorMode === 'dark';
            const isGrayscale = colorMode === 'grayscale';
            const bgColor = isDark ? '#070e1b' : isGrayscale ? '#ffffff' : '#f8fafc';

            pdf.setFillColor(bgColor);
            pdf.rect(0, 0, pdfWidth, pdfHeight, 'F');

            // Fit the image exactly to the PDF page dimensions
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

            // Save/Download the file with double fallback for iframe sandbox environments
            try {
              pdf.save(`${cleanTitle}.pdf`);
            } catch (saveError) {
              console.warn('Standard pdf.save failed, using dynamic blob download:', saveError);
              const blob = pdf.output('blob');
              const blobUrl = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = `${cleanTitle}.pdf`;
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              setTimeout(() => {
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);
              }, 200);
            }

            setNotificationMsg(`บันทึกไฟล์ "${cleanTitle}.pdf" ลงในโฟลเดอร์ดาวน์โหลดเสร็จสิ้น!`);
            setTimeout(() => {
              setShowNotification(false);
              document.title = originalTitle;
            }, 3500);
          } catch (error) {
            console.error('PDF Generation Error:', error);
            setNotificationMsg(`เกิดข้อผิดพลาดในการสร้างไฟล์ PDF: ${(error as Error).message}`);
            setTimeout(() => setShowNotification(false), 5000);
            document.title = originalTitle;
          }
        }).catch((err) => {
          console.error('html2canvas Error:', err);
          setNotificationMsg(`เกิดข้อผิดพลาดในระบบจำลองหน้าจอ: ${(err as Error).message}`);
          setTimeout(() => setShowNotification(false), 5000);
          document.title = originalTitle;
        });
      }, 300);

    } else {
      // Printer export using standard window.print() via prop
      const operationMsg = `กำลังส่งไฟล์รายงานไปยังเครื่องพิมพ์ "${selectedPrinter}" จำนวน ${printCopies} ชุด...`;
      setNotificationMsg(operationMsg);
      setShowNotification(true);

      setTimeout(() => {
        onConfirmPrint();
        
        // Restore original page title after print command has been processed
        setTimeout(() => {
          document.title = originalTitle;
          setShowNotification(false);
        }, 3000);
      }, 800);
    }
  };


  // ----------------- CALCULATE REAL-TIME VALUES FOR PREVIEW -----------------
  const totalLocations = project.locations.length;
  
  const totalContractkWp = useMemo(() => {
    return Math.round(project.locations.reduce((sum, l) => sum + l.capacityKWp, 0) * 100) / 100;
  }, [project.locations]);

  const totalInstalledkWp = useMemo(() => {
    return Math.round(project.locations.reduce((sum, l) => {
      return sum + (l.status === 'ติดตั้งแล้ว' ? (l.actualCapacityKWp || 0) : 0);
    }, 0) * 100) / 100;
  }, [project.locations]);

  const totalInProgresskWp = useMemo(() => {
    return Math.round((totalContractkWp - totalInstalledkWp) * 100) / 100;
  }, [totalContractkWp, totalInstalledkWp]);

  const installedPercent = useMemo(() => {
    if (totalContractkWp === 0) return 0;
    return Math.round((totalInstalledkWp / totalContractkWp) * 10000) / 100;
  }, [totalInstalledkWp, totalContractkWp]);

  const inProgressPercent = useMemo(() => {
    if (totalContractkWp === 0) return 0;
    return Math.round((totalInProgresskWp / totalContractkWp) * 10000) / 100;
  }, [totalInProgresskWp, totalContractkWp]);

  const estimatedCO2Reduction = useMemo(() => {
    const factor = project.targetCO2ReductionFactor || 0.477;
    const totalReduction = totalContractkWp * 1266.6 * project.servicePeriodYears * factor / 1000;
    return Math.round(totalReduction * 100) / 100;
  }, [totalContractkWp, project.servicePeriodYears, project.targetCO2ReductionFactor]);

  const formattedUpdatedDate = useMemo(() => {
    if (!project.updatedDate) return '-';
    try {
      const date = new Date(project.updatedDate);
      const monthNamesTh = [
        'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
        'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'
      ];
      const day = date.getDate();
      const month = monthNamesTh[date.getMonth()];
      const year = date.getFullYear() + 543;
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      
      return `${day} ${month} ${year} ${hours}:${minutes} น.`;
    } catch {
      return project.updatedDate;
    }
  }, [project.updatedDate]);

  const isDark = colorMode === 'dark';
  const isGrayscale = colorMode === 'grayscale';

  const previewTheme = {
    bg: isDark ? 'bg-[#070e1b] text-slate-100' : isGrayscale ? 'bg-white text-black border-slate-400' : 'bg-[#f8fafc] text-slate-800 border-slate-200',
    card: isDark ? 'bg-[#0a182f] border-cyan-500/10' : isGrayscale ? 'bg-white border-slate-200' : 'bg-white border-slate-150',
    title: isDark ? 'text-white' : isGrayscale ? 'text-black' : 'text-slate-900',
    subtitle: isDark ? 'text-slate-400' : isGrayscale ? 'text-slate-600' : 'text-slate-500',
    textMuted: isDark ? 'text-slate-400 font-mono scale-[0.8] origin-left' : isGrayscale ? 'text-slate-600' : 'text-slate-500',
    accentText: isDark ? 'text-cyan-400' : isGrayscale ? 'text-slate-800' : 'text-cyan-600',
    accentBg: isDark ? 'bg-cyan-950/30' : isGrayscale ? 'bg-slate-100' : 'bg-cyan-50',
    emeraldText: isDark ? 'text-emerald-400' : isGrayscale ? 'text-slate-800 font-bold' : 'text-emerald-600',
    emeraldBg: isDark ? 'bg-emerald-950/20' : isGrayscale ? 'bg-slate-100' : 'bg-emerald-50',
    amberText: isDark ? 'text-amber-400' : isGrayscale ? 'text-slate-800 font-bold' : 'text-amber-600',
    amberBg: isDark ? 'bg-amber-950/20' : isGrayscale ? 'bg-slate-100' : 'bg-amber-50',
    mapFill: isDark ? 'rgba(6, 182, 212, 0.04)' : isGrayscale ? 'rgba(0, 0, 0, 0.02)' : 'rgba(14, 165, 233, 0.04)',
    mapStroke: isDark ? 'rgba(6, 182, 212, 0.2)' : isGrayscale ? 'rgba(0, 0, 0, 0.15)' : 'rgba(14, 165, 233, 0.25)',
    constellationStroke: isDark ? '#0ea5e9' : isGrayscale ? '#94a3b8' : '#0284c7',
    donutBg: isDark ? '#1e293b' : isGrayscale ? '#e2e8f0' : '#f1f5f9',
    donutInstalled: isDark ? '#0ea5e9' : isGrayscale ? '#475569' : '#0284c7',
    donutInProgress: isDark ? '#f59e0b' : isGrayscale ? '#94a3b8' : '#ea580c',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
        
        {/* LEFT PANEL: REAL-TIME DOCUMENT PREVIEW */}
        <div className="w-full md:w-[42%] bg-slate-950 p-6 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-4">
              <Sparkles className="w-4 h-4 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Live Document Preview</span>
            </div>
            <h3 className="text-sm font-bold text-slate-200">ตัวอย่างจำลองหน้าเอกสาร</h3>
            <p className="text-xs text-slate-400 mt-1">แสดงผลลัพธ์จำลองตามการปรับค่าของคุณ</p>
          </div>

          {/* DOCUMENT PREVIEW BOX */}
          <div className="flex-1 flex items-center justify-center py-6">
            <div 
              className={`relative shadow-2xl transition-all duration-300 overflow-hidden border ${
                colorMode === 'dark' 
                  ? 'bg-[#070e1b] border-cyan-500/15 text-white' 
                  : colorMode === 'grayscale'
                  ? 'bg-white border-slate-400 text-black grayscale'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              } ${
                orientation === 'landscape' 
                  ? 'aspect-[1.414/1] w-full max-w-[290px]' 
                  : 'aspect-[1/1.414] h-full max-h-[220px] w-auto'
              }`}
              style={{
                borderRadius: '4px',
                padding: marginSize === 'none' ? '2px' : marginSize === 'narrow' ? '4px' : '8px'
              }}
            >
              {/* actual miniature content */}
              <div className="h-full flex flex-col justify-between text-[4px] leading-tight select-none">
                {/* Header */}
                <div className={`border-b ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} pb-1 flex items-center justify-between`}>
                  <div className="flex items-center space-x-0.5">
                    <div className="w-1 h-1 bg-cyan-500 rounded-full" />
                    <span className="font-bold text-[4.5px] truncate max-w-[120px] uppercase">
                      {project.customerName || 'MEA SOLAR DASHBOARD'}
                    </span>
                  </div>
                  <span className="text-[3px] opacity-60">CONFIDENTIAL</span>
                </div>

                {/* Main Title */}
                <div className="text-center py-0.5">
                  <span className="font-extrabold text-[5px] line-clamp-1">
                    {project.projectName || 'โครงการติดตั้งระบบผลิตไฟฟ้าฯ'}
                  </span>
                </div>

                {/* Content based on orientation */}
                {orientation === 'landscape' ? (
                  <div key="preview-landscape" className="grid grid-cols-12 gap-1 flex-1 py-1 overflow-hidden">
                    {/* Left Block (Col 3): Project Info */}
                    <div className={`col-span-3 ${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 flex flex-col justify-between`}>
                      <span className="text-[3px] font-bold text-cyan-500 block border-b pb-0.5 mb-0.5">ข้อมูลโครงการ</span>
                      <div className="space-y-0.5 flex-1 flex flex-col justify-around text-[3px]">
                        <div>
                          <span className="text-slate-400 block font-light">ลูกค้า:</span>
                          <span className="font-bold block truncate">{project.customerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-light">กำลังรวม:</span>
                          <span className="font-bold text-cyan-400 block">{totalContractkWp.toFixed(1)} kWp</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-light">จำนวน:</span>
                          <span className="font-bold block">{totalLocations} แห่ง</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block font-light">ระยะเวลา:</span>
                          <span className="font-bold block">{project.servicePeriodYears} ปี</span>
                        </div>
                      </div>
                    </div>

                    {/* Middle Block (Col 5): Map representation */}
                    <div className={`col-span-5 ${isDark ? 'bg-slate-950/40 border-cyan-500/5' : 'bg-slate-50 border-slate-200'} border rounded relative flex items-center justify-center overflow-hidden`}>
                      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d="M 38 10 Q 41 8, 44 9 Q 48 10, 47 15 Q 45 20, 48 24 Q 52 26, 55 24 L 58 26 Q 65 24, 70 28 Q 75 32, 80 34 Q 85 36, 84 41 Q 83 45, 80 47 Q 75 49, 72 46 Q 66 42, 60 46 L 58 52 Q 59 58, 62 61 Q 64 64, 59 66 Q 55 68, 52 64 L 48 60 Q 44 58, 42 62 Q 40 66, 38 72 Q 35 77, 33 82 Q 31 87, 34 91 L 35 96 Q 33 97, 32 94 L 30 88 Q 28 85, 30 81 Q 32 77, 30 73 Q 27 68, 29 64 Q 31 60, 28 55 Q 25 50, 31 44 Q 35 38, 32 30 Q 28 22, 33 16 Z"
                          fill={previewTheme.mapFill}
                          stroke={previewTheme.mapStroke}
                          strokeWidth="0.5"
                        />
                        {project.locations.map((loc, i) => {
                          const mapData = PROVINCE_MAP[loc.province] || { x: 50, y: 50 };
                          return (
                            <circle
                              key={i}
                              cx={mapData.x}
                              cy={mapData.y}
                              r="1.2"
                              fill={loc.status === 'ติดตั้งแล้ว' ? (isDark ? '#22d3ee' : isGrayscale ? '#475569' : '#0284c7') : '#f59e0b'}
                            />
                          );
                        })}
                      </svg>
                      <span className="absolute bottom-0.5 right-0.5 text-[2.5px] text-slate-400 font-mono">MAP</span>
                    </div>

                    {/* Right Block (Col 4): Charts and stats */}
                    <div className="col-span-4 flex flex-col justify-between space-y-0.5">
                      <div className={`flex-1 ${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 flex flex-col justify-between items-center`}>
                        <span className="text-[3px] font-bold text-slate-400 block self-start scale-90">สถานภาพติดตั้ง</span>
                        
                        {/* Miniature Donut */}
                        <div className="w-6 h-6 relative flex items-center justify-center my-0.5">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="45" fill="transparent" stroke={previewTheme.donutBg} strokeWidth="25" />
                            {totalInstalledkWp > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="45"
                                fill="transparent"
                                stroke={previewTheme.donutInstalled}
                                strokeWidth="25"
                                strokeDasharray={`${(totalInstalledkWp / (totalContractkWp || 1)) * 282.7} 282.7`}
                                strokeDashoffset={0}
                              />
                            )}
                            {totalInProgresskWp > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="45"
                                fill="transparent"
                                stroke={previewTheme.donutInProgress}
                                strokeWidth="25"
                                strokeDasharray={`${(totalInProgresskWp / (totalContractkWp || 1)) * 282.7} 282.7`}
                                strokeDashoffset={-((totalInstalledkWp / (totalContractkWp || 1)) * 282.7)}
                              />
                            )}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center font-mono">
                            <span className="text-[2.5px] font-bold leading-none">{installedPercent.toFixed(0)}%</span>
                          </div>
                        </div>

                        <div className="w-full text-[2.5px] space-y-px">
                          <div className="flex justify-between">
                            <span className="text-slate-400">ติดตั้งแล้ว</span>
                            <span className="font-bold text-cyan-400">{installedPercent.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">อยู่ระหว่างทำ</span>
                            <span className="font-bold text-amber-400">{inProgressPercent.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>

                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 text-center`}>
                        <span className="text-[2.5px] text-slate-400 block scale-90 leading-none">ลด CO₂ สะสม</span>
                        <span className="text-[4.5px] font-extrabold text-emerald-400 font-mono">
                          {estimatedCO2Reduction.toFixed(0)} <span className="text-[2.5px] text-slate-400">t</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key="preview-portrait" className="flex flex-col space-y-1 flex-1 py-1 overflow-hidden">
                    {/* KPI row */}
                    <div className="grid grid-cols-3 gap-0.5">
                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 text-center`}>
                        <span className="text-[2.5px] text-slate-400 block scale-90">เป้าหมาย</span>
                        <span className="text-[4px] font-black text-cyan-400 font-mono">{totalContractkWp.toFixed(0)} kWp</span>
                      </div>
                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 text-center`}>
                        <span className="text-[2.5px] text-slate-400 block scale-90">เสร็จสิ้น</span>
                        <span className="text-[4px] font-black text-emerald-400 font-mono">{totalInstalledkWp.toFixed(0)} kWp</span>
                      </div>
                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 text-center`}>
                        <span className="text-[2.5px] text-slate-400 block scale-90">ลด CO₂</span>
                        <span className="text-[4px] font-black text-amber-500 font-mono">{estimatedCO2Reduction.toFixed(0)} t</span>
                      </div>
                    </div>

                    {/* Map Box */}
                    <div className={`flex-1 ${isDark ? 'bg-slate-950/40 border-cyan-500/5' : 'bg-slate-50 border-slate-200'} border rounded relative flex items-center justify-center overflow-hidden min-h-[45px]`}>
                      <svg className="h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path
                          d="M 38 10 Q 41 8, 44 9 Q 48 10, 47 15 Q 45 20, 48 24 Q 52 26, 55 24 L 58 26 Q 65 24, 70 28 Q 75 32, 80 34 Q 85 36, 84 41 Q 83 45, 80 47 Q 75 49, 72 46 Q 66 42, 60 46 L 58 52 Q 59 58, 62 61 Q 64 64, 59 66 Q 55 68, 52 64 L 48 60 Q 44 58, 42 62 Q 40 66, 38 72 Q 35 77, 33 82 Q 31 87, 34 91 L 35 96 Q 33 97, 32 94 L 30 88 Q 28 85, 30 81 Q 32 77, 30 73 Q 27 68, 29 64 Q 31 60, 28 55 Q 25 50, 31 44 Q 35 38, 32 30 Q 28 22, 33 16 Z"
                          fill={previewTheme.mapFill}
                          stroke={previewTheme.mapStroke}
                          strokeWidth="0.5"
                        />
                        {project.locations.map((loc, i) => {
                          const mapData = PROVINCE_MAP[loc.province] || { x: 50, y: 50 };
                          return (
                            <circle
                              key={i}
                              cx={mapData.x}
                              cy={mapData.y}
                              r="1.2"
                              fill={loc.status === 'ติดตั้งแล้ว' ? (isDark ? '#22d3ee' : isGrayscale ? '#475569' : '#0284c7') : '#f59e0b'}
                            />
                          );
                        })}
                      </svg>
                    </div>

                    {/* Portrait Bottom Split */}
                    <div className="grid grid-cols-2 gap-0.5 h-[32px]">
                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 flex flex-col justify-around text-[2.5px]`}>
                        <span className="text-slate-400 leading-none">ผู้ติดต่อ MEA:</span>
                        <span className="font-bold block truncate leading-none">{project.meaContact.contactName}</span>
                        <span className="font-bold block truncate leading-none">{project.meaContact.phone}</span>
                      </div>

                      <div className={`${isDark ? 'bg-[#0a182f]/80' : 'bg-white'} border ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} rounded p-0.5 flex items-center justify-between`}>
                        <div className="w-5 h-5 relative flex items-center justify-center flex-shrink-0">
                          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="45" fill="transparent" stroke={previewTheme.donutBg} strokeWidth="25" />
                            {totalInstalledkWp > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="45"
                                fill="transparent"
                                stroke={previewTheme.donutInstalled}
                                strokeWidth="25"
                                strokeDasharray={`${(totalInstalledkWp / (totalContractkWp || 1)) * 282.7} 282.7`}
                                strokeDashoffset={0}
                              />
                            )}
                            {totalInProgresskWp > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="45"
                                fill="transparent"
                                stroke={previewTheme.donutInProgress}
                                strokeWidth="25"
                                strokeDasharray={`${(totalInProgresskWp / (totalContractkWp || 1)) * 282.7} 282.7`}
                                strokeDashoffset={-((totalInstalledkWp / (totalContractkWp || 1)) * 282.7)}
                              />
                            )}
                          </svg>
                        </div>
                        <div className="text-[2.5px] space-y-px flex-1 pl-1 font-mono leading-none">
                          <div className="flex justify-between text-cyan-400 font-bold">
                            <span>ดล.</span>
                            <span>{installedPercent.toFixed(0)}%</span>
                          </div>
                          <div className="flex justify-between text-amber-500 font-bold">
                            <span>รด.</span>
                            <span>{inProgressPercent.toFixed(0)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Footer block */}
                <div className={`grid grid-cols-2 gap-1 border-t ${isDark ? 'border-cyan-500/10' : 'border-slate-200'} pt-0.5 mt-0.5 text-[2.5px] opacity-75`}>
                  <div className="text-left font-mono">
                    <span>อัพเดทเมื่อ: {formattedUpdatedDate}</span>
                  </div>
                  <div className="text-right truncate">
                    <span>จัดทำโดย: {project.meaContact.department || 'ฝ่ายธุรกิจพลังงาน'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Size labels */}
          <div className="text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest bg-slate-900 px-3 py-1 rounded-full border border-slate-800">
              {paperSize} • {orientation === 'landscape' ? 'แนวนอน' : 'แนวตั้ง'} • {marginSize === 'none' ? 'ไร้ขอบ' : marginSize === 'narrow' ? 'ขอบแคบ' : 'ขอบปกติ'}
            </span>
          </div>
        </div>

        {/* RIGHT PANEL: PRINT SETTINGS FORM */}
        <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-800">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400">
                <Printer className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white leading-tight">ตั้งค่าการพิมพ์และส่งออกเอกสาร</h2>
                <p className="text-xs text-slate-400 mt-0.5">โปรดตรวจสอบและปรับหน้าสรุป Dashboard ให้สมบูรณ์แบบที่สุด</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="space-y-5 py-5 flex-1">
            {/* 1. PAPER SIZE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">1. เลือกขนาดกระดาษที่จะพิมพ์</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'A4', label: 'A4 (297 x 210 มม.)', desc: 'ขนาดมาตรฐานทั่วไป' },
                  { id: 'A3', label: 'A3 (420 x 297 มม.)', desc: 'ขนาดใหญ่ ความละเอียดสูง' },
                  { id: 'Letter', label: 'Letter (8.5" x 11")', desc: 'ขนาดจดหมายราชการ' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setPaperSize(item.id as 'A4' | 'A3' | 'Letter')}
                    className={`p-3 text-left rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      paperSize === item.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{item.id}</span>
                      {paperSize === item.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] mt-2 block font-medium truncate">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. ORIENTATION */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">2. แนวตั้ง / แนวนอน (Page Orientation)</label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: 'landscape', label: 'แนวนอน (Landscape)', desc: 'เหมาะที่สุดสำหรับหน้าสรุป One Page Dashboard เพื่อแสดงเนื้อหาครบถ้วน' },
                  { id: 'portrait', label: 'แนวตั้ง (Portrait)', desc: 'รูปแบบเอกสารรายงานราชการแนวตั้งทั่วไป' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setOrientation(item.id as 'landscape' | 'portrait')}
                    className={`p-3 text-left rounded-xl border transition-all duration-200 flex items-start space-x-3 ${
                      orientation === item.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <Layout className={`w-5 h-5 flex-shrink-0 mt-0.5 ${orientation === item.id ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <span className="text-xs font-bold block">{item.label}</span>
                      <span className="text-[10px] mt-1 block font-medium text-slate-400 line-clamp-2 leading-relaxed">{item.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. MARGIN SIZE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">3. ระยะขอบกระดาษ (Margins)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'none', label: 'ไม่มี (0 มม.)', desc: 'ขยายเนื้อหาเต็มพื้นที่กระดาษ' },
                  { id: 'narrow', label: 'แคบ (5 มม.)', desc: 'แนะนำ เพื่อระยะขอบที่สวยงาม' },
                  { id: 'normal', label: 'ปกติ (12 มม.)', desc: 'ระยะขอบมาตรฐานรายงาน' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setMarginSize(item.id as 'none' | 'narrow' | 'normal')}
                    className={`p-3 text-left rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      marginSize === item.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{item.label}</span>
                      {marginSize === item.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] mt-2 block font-medium truncate">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 4. COLOR MODE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">4. โหมดสีการพิมพ์ (Print Color Mode)</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'dark', label: 'Dark Neon (ธีมเข้ม)', desc: 'สีสันสดใส เอกสารสไตล์ดิจิทัล' },
                  { id: 'light', label: 'Light Clean (ธีมสว่าง)', desc: 'ดูสะอาด เป็นทางการ ประหยัดหมึก' },
                  { id: 'grayscale', label: 'Grayscale (สีเทา)', desc: 'ประหยัดหมึกพิมพ์ดีเยี่ยม ลายเส้นคมชัด' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setColorMode(item.id as 'dark' | 'light' | 'grayscale')}
                    className={`p-3 text-left rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                      colorMode === item.id 
                        ? 'border-cyan-500 bg-cyan-950/20 text-white' 
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold">{item.label}</span>
                      {colorMode === item.id && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[10px] mt-2 block font-medium truncate">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer controls */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 rounded-xl text-xs font-bold transition"
            >
              ยกเลิก
            </button>
            <button
              onClick={() => setIsExportDialogOpen(true)}
              className="flex items-center space-x-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-400 text-slate-950 font-black rounded-xl text-xs shadow-lg shadow-cyan-950/30 transition transform hover:scale-[1.02]"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / บันทึกเป็น PDF</span>
            </button>
          </div>
        </div>

      </div>

      {/* =========================================================================
          POPUP 1: PRINT & EXPORT DESTINATION SELECTOR
          ========================================================================= */}
      {isExportDialogOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-cyan-950 flex items-center justify-center text-cyan-400">
                  <Printer className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">ยืนยันการพิมพ์ / ส่งออกรายงาน</h3>
                  <p className="text-[10.5px] text-slate-400 mt-0.5">กรุณาตั้งชื่อไฟล์และระบุตำแหน่งจัดเก็บข้อมูลก่อนเริ่มระบบพิมพ์</p>
                </div>
              </div>
              <button 
                onClick={() => setIsExportDialogOpen(false)}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto flex-1">
              
              {/* Option Cards: PDF vs Printer */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เลือกวิธีการบันทึก / ปลายทาง</label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: PDF */}
                  <button
                    onClick={() => {
                      setExportType('pdf');
                    }}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start space-x-3.5 ${
                      exportType === 'pdf'
                        ? 'border-cyan-500 bg-cyan-950/20 text-white'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <FileDown className={`w-5 h-5 flex-shrink-0 mt-0.5 ${exportType === 'pdf' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold block">บันทึกเป็นไฟล์ PDF (.pdf)</span>
                      <span className="text-[9.5px] mt-1 block font-medium leading-relaxed opacity-80">บันทึกลงเครื่องคอมพิวเตอร์ หรือ แท็บเล็ตเครื่องนี้ โดยจะจัดเก็บลงในโฟลเดอร์ดาวน์โหลด (Downloads) โดยตรง</span>
                    </div>
                  </button>

                  {/* Option 2: Print */}
                  <button
                    onClick={() => setExportType('print')}
                    className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start space-x-3.5 ${
                      exportType === 'print'
                        ? 'border-cyan-500 bg-cyan-950/20 text-white'
                        : 'border-slate-800 bg-slate-900/50 hover:bg-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <Printer className={`w-5 h-5 flex-shrink-0 mt-0.5 ${exportType === 'print' ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <div>
                      <span className="text-xs font-bold block">สั่งพิมพ์ออกเครื่องพิมพ์ (Printer)</span>
                      <span className="text-[9.5px] mt-1 block font-medium leading-relaxed opacity-80">เชื่อมต่อและพิมพ์รายงานออกทางกระดาษผ่านเครื่องพิมพ์สำนักงาน</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Conditional Settings panel */}
              {exportType === 'pdf' ? (
                <div key="settings-pdf" className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  {/* 1. Name Input */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ระบุชื่อไฟล์เอกสาร</label>
                      <span className="text-[9px] text-slate-500 font-mono">นามสกุลไฟล์: .pdf</span>
                    </div>
                    <div className="flex rounded-xl overflow-hidden border border-slate-800 bg-slate-900 focus-within:border-cyan-500/50 transition">
                      <input
                        type="text"
                        value={pdfFileName}
                        onChange={(e) => setPdfFileName(e.target.value)}
                        placeholder="ตั้งชื่อรายงานของคุณ..."
                        className="w-full px-4 py-2.5 bg-transparent text-xs text-white placeholder-slate-600 focus:outline-none"
                      />
                      <div className="bg-slate-800 px-3 flex items-center justify-center text-slate-400 text-[11px] font-mono select-none">
                        .pdf
                      </div>
                    </div>
                    {/* Suggestions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[9px] text-slate-500">เติมคำด่วน:</span>
                      <button
                        onClick={() => appendToFileName('ด่วนที่สุด')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[9px] font-medium transition"
                      >
                        + ด่วนที่สุด
                      </button>
                      <button
                        onClick={() => appendToFileName('ฉบับสมบูรณ์')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[9px] font-medium transition"
                      >
                        + ฉบับสมบูรณ์
                      </button>
                      <button
                        onClick={() => appendToFileName('MEA_APPROVED')}
                        className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded text-[9px] font-medium font-mono transition"
                      >
                        + MEA_APPROVED
                      </button>
                    </div>
                  </div>

                  {/* 2. Simulated Folder Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">ตำแหน่งจัดเก็บไฟล์</label>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1 flex items-center space-x-2 px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-950/40 select-none overflow-hidden text-ellipsis">
                        <FileDown className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                        <span className="text-xs text-slate-300 font-medium">
                          โฟลเดอร์ <strong className="text-cyan-400">Downloads (ดาวน์โหลด)</strong> ของอุปกรณ์นี้
                        </span>
                      </div>
                    </div>
                    <p className="text-[9.5px] text-slate-500 leading-relaxed">ระบบจะทำการจัดเก็บลงในโฟลเดอร์ Download ของคุณทันทีเมื่อการส่งออก PDF สำเร็จเสร็จสิ้น</p>
                  </div>
                </div>
              ) : (
                <div key="settings-print" className="space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                  {/* 1. Printer Select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">เลือกเครื่องพิมพ์ปลายทาง</label>
                    <select
                      value={selectedPrinter}
                      onChange={(e) => setSelectedPrinter(e.target.value)}
                      className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/50"
                    >
                      <option value="HP LaserJet Pro MFP M227 (ห้องผู้บริหาร)">HP LaserJet Pro MFP M227 (ห้องผู้บริหาร) [ออนไลน์]</option>
                      <option value="Canon MB2700 Series (เครื่องหลัก ชั้น 3)">Canon MB2700 Series (เครื่องหลัก ชั้น 3) [ออนไลน์]</option>
                      <option value="Xerox DocuPrint C3300 (ฝ่ายวิศวกรรม)">Xerox DocuPrint C3300 (ฝ่ายวิศวกรรม) [ปิดออฟไลน์]</option>
                      <option value="Microsoft Print to PDF">Microsoft Print to PDF [เครื่องพิมพ์เสมือน]</option>
                    </select>
                  </div>

                  {/* 2. Print Copies */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">จำนวนชุด (Copies)</label>
                      <input
                        type="number"
                        min="1"
                        max="99"
                        value={printCopies}
                        onChange={(e) => setPrintCopies(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white text-center focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">โหมดสีของเครื่องพิมพ์</label>
                      <div className="px-3 py-2.5 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs text-slate-300 flex items-center justify-between select-none">
                        <span>{colorMode === 'grayscale' ? 'ขาวดำ (Grayscale)' : 'พิมพ์สี (RGB Color)'}</span>
                        <Palette className="w-3.5 h-3.5 text-slate-500" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Informative Guidance */}
              <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/40 flex items-start space-x-2.5">
                <AlertCircle className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                <div className="text-[10.5px] leading-relaxed text-slate-400">
                  <span className="font-bold text-slate-300 block mb-0.5">💡 คำแนะนำในการบันทึก / พิมพ์</span>
                  {exportType === 'pdf' ? (
                    <p key="guidance-pdf">
                      เมื่อกดบันทึก ระบบจะจำลองตำแหน่งโฟลเดอร์ด้านบน และทำการเปิดหน้าต่างพิมพ์ของเบราว์เซอร์ 
                      <strong> โปรดเลือก "บันทึกเป็น PDF (Save as PDF)"</strong> ในช่องเครื่องพิมพ์ของเบราว์เซอร์ 
                      ระบบได้ทำการตั้งค่าชื่อไฟล์ให้ตรงกับที่คุณระบุโดยอัตโนมัติแล้ว!
                    </p>
                  ) : (
                    <p key="guidance-print">
                      เมื่อกดสั่งพิมพ์ ระบบจะเปิดหน้าต่างสั่งพิมพ์ของเบราว์เซอร์ 
                      โปรดเลือกเครื่องพิมพ์ปลายทางให้ตรงกับที่ระบุเพื่อเริ่มพิมพ์ลงบนกระดาษรายงานทันที
                    </p>
                  )}
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end space-x-2.5 p-5 border-t border-slate-800 bg-slate-900/50">
              <button
                onClick={() => setIsExportDialogOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
              >
                ย้อนกลับ
              </button>
              <button
                onClick={handleFinalSubmit}
                className="flex items-center space-x-1.5 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-black rounded-xl text-xs shadow-lg transition transform hover:scale-[1.02]"
              >
                <Save className="w-4 h-4" />
                <span>{exportType === 'pdf' ? 'ยืนยันและบันทึก PDF' : 'ส่งพิมพ์เอกสาร'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          POPUP 2: SIMULATED FILE SYSTEM / DIRECTORY PICKER
          ========================================================================= */}
      {false && isDirPickerOpen && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md transition-all duration-300">
          <div className="w-full max-w-3xl h-[80vh] min-h-[480px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/60">
              <div className="flex items-center space-x-2">
                <Folder className="w-5 h-5 text-amber-500" />
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">ระบบบันทึกเอกสารของฉัน (Computer Folder Explorer)</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">เลือกตำแหน่งโฟลเดอร์บนเครื่องคอมพิวเตอร์เพื่อบันทึกไฟล์รายงาน PDF</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsDirPickerOpen(false);
                  setShowNewFolderInput(false);
                }}
                className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Address Bar & Actions */}
            <div className="p-3 border-b border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row gap-2 items-center justify-between">
              {/* Breadcrumbs */}
              <div className="flex flex-wrap items-center text-[11px] text-slate-400 font-mono bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 w-full sm:w-auto flex-1 overflow-x-auto whitespace-nowrap">
                <button
                  onClick={() => handleBreadcrumbClick(-1, [])}
                  className="hover:text-cyan-400 font-semibold"
                >
                  This PC
                </button>
                <ChevronRight className="w-3 h-3 mx-1 text-slate-600 flex-shrink-0" />
                
                {currentPath !== 'This PC' && currentPath.split('/').map((part, idx, arr) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => handleBreadcrumbClick(idx, arr)}
                      className={`hover:text-cyan-400 font-semibold ${idx === arr.length - 1 ? 'text-cyan-400 font-extrabold' : ''}`}
                    >
                      {part}
                    </button>
                    {idx < arr.length - 1 && (
                      <ChevronRight className="w-3 h-3 mx-1 text-slate-600 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Action Buttons: New Folder, Search */}
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="ค้นหา..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full sm:w-36 pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-[11px] text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                
                <button
                  onClick={() => setShowNewFolderInput(prev => !prev)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-bold flex items-center space-x-1 transition whitespace-nowrap"
                >
                  <PlusCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>โฟลเดอร์ใหม่</span>
                </button>
              </div>
            </div>

            {/* Simulated Workspace */}
            <div className="flex flex-1 overflow-hidden">
              
              {/* Left Sidebar: Standard Mount Points */}
              <div className="w-40 bg-slate-950/40 border-r border-slate-800 p-2 space-y-1 hidden md:block">
                <span className="text-[9px] font-bold text-slate-500 px-2 uppercase tracking-widest block mb-2">ตำแหน่งด่วน</span>
                {[
                  { id: 'Desktop', label: 'Desktop (เดสก์ท็อป)', path: 'Desktop' },
                  { id: 'Documents', label: 'Documents (เอกสาร)', path: 'Documents' },
                  { id: 'Downloads', label: 'Downloads (ดาวน์โหลด)', path: 'Downloads' },
                  { id: 'MEA_Cloud', label: 'MEA Cloud Drive', path: 'MEA_Cloud_Drive' },
                  { id: 'Tablet', label: 'Tablet (แท็บเล็ตเครื่องนี้)', path: 'Tablet' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setCurrentPath(item.path);
                      setSearchQuery('');
                    }}
                    className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-lg text-left text-xs transition ${
                      currentPath.startsWith(item.path)
                        ? 'bg-cyan-950/30 text-cyan-400 font-bold border-l-2 border-cyan-500'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    {item.id === 'Desktop' ? <Laptop className="w-3.5 h-3.5" /> : 
                     item.id === 'Documents' ? <FileText className="w-3.5 h-3.5" /> :
                     item.id === 'Downloads' ? <FileDown className="w-3.5 h-3.5" /> : 
                     item.id === 'Tablet' ? <Tablet className="w-3.5 h-3.5" /> : <HardDrive className="w-3.5 h-3.5" />}
                    <span className="truncate">{item.label}</span>
                  </button>
                ))}
              </div>

              {/* Right Content Panel: Directory items */}
              <div className="flex-1 p-4 overflow-y-auto flex flex-col justify-between">
                
                {/* New Folder Inline Form */}
                {showNewFolderInput && (
                  <form onSubmit={handleCreateFolder} className="mb-4 p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center space-x-2">
                    <Folder className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <input
                      type="text"
                      required
                      placeholder="ตั้งชื่อโฟลเดอร์..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      className="flex-1 bg-transparent border-b border-slate-800 focus:border-cyan-500 px-1 py-0.5 text-xs text-white focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-[10px] font-black rounded transition"
                    >
                      ตกลง
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewFolderInput(false)}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-bold rounded transition"
                    >
                      ยกเลิก
                    </button>
                  </form>
                )}

                {/* Main Items Display */}
                <div className="flex-1">
                  {(() => {
                    const contents = fileSystem[currentPath] || [];
                    const filtered = contents.filter(item => 
                      item.name.toLowerCase().includes(searchQuery.toLowerCase())
                    );

                    if (filtered.length === 0) {
                      return (
                        <div className="flex flex-col items-center justify-center h-48 text-center">
                          <Folder className="w-10 h-10 text-slate-700 mb-2 stroke-1" />
                          <span className="text-xs text-slate-500 font-medium">โฟลเดอร์นี้ว่างเปล่า</span>
                          <span className="text-[10px] text-slate-600 mt-1">คุณสามารถกดปุ่ม "โฟลเดอร์ใหม่" เพื่อสร้างได้</span>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {filtered.map((item, idx) => (
                          <div
                            key={idx}
                            onDoubleClick={() => {
                              if (item.type === 'folder') {
                                handleFolderDoubleClick(item.name);
                              }
                            }}
                            className={`p-3 rounded-xl border flex flex-col items-center text-center cursor-pointer select-none transition group ${
                              item.type === 'folder'
                                ? 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-800 hover:border-slate-700'
                                : 'border-slate-900 bg-slate-900/10 opacity-45 cursor-not-allowed'
                            }`}
                          >
                            {item.type === 'folder' ? (
                              <Folder className="w-8 h-8 text-amber-500 group-hover:scale-110 transition duration-200" />
                            ) : (
                              <FileText className="w-8 h-8 text-slate-500" />
                            )}
                            <span className="text-[11px] font-medium text-slate-300 mt-2 truncate w-full group-hover:text-white transition">
                              {item.name}
                            </span>
                            {item.type === 'folder' && (
                              <span className="text-[8px] text-slate-500 font-mono mt-0.5 group-hover:text-cyan-400/80">
                                ดับเบิ้ลคลิกเพื่อเข้า
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Back Link inside current window */}
                {currentPath !== 'This PC' && (
                  <button
                    onClick={() => {
                      const idx = currentPath.lastIndexOf('/');
                      if (idx === -1) {
                        setCurrentPath('This PC');
                      } else {
                        setCurrentPath(currentPath.substring(0, idx));
                      }
                    }}
                    className="mt-4 flex items-center space-x-1.5 text-[10px] text-slate-500 hover:text-cyan-400 transition"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>ย้อนกลับไปโฟลเดอร์ก่อนหน้า</span>
                  </button>
                )}

              </div>
            </div>

            {/* Footer Select Folder Controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-t border-slate-800 bg-slate-950/60 gap-3">
              <div className="flex items-center space-x-2 text-xs text-slate-300 w-full sm:w-auto">
                <FolderOpen className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="truncate font-mono">
                  เลือกโฟลเดอร์ปัจจุบัน: <strong className="text-cyan-400">{currentPath.replace(/\//g, ' > ')}</strong>
                </span>
              </div>
              <div className="flex items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setIsDirPickerOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition"
                >
                  ยกเลิก
                </button>
                <button
                  onClick={() => {
                    setSelectedDirectory(currentPath);
                    setIsDirPickerOpen(false);
                  }}
                  className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black rounded-xl text-xs flex items-center space-x-1.5 transition shadow-lg"
                >
                  <Check className="w-4 h-4" />
                  <span>เลือกโฟลเดอร์นี้</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          NOTIFICATIVE TOAST: PRINT TRIGGER ACTION FEEDBACK
          ========================================================================= */}
      {showNotification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2000] max-w-md w-full px-4 animate-bounce">
          <div className="bg-slate-900 border-2 border-cyan-500/30 rounded-2xl shadow-2xl p-4 flex items-center space-x-3 text-white">
            <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400 flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 animate-pulse" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-xs font-bold block text-cyan-400">ระบบประมวลผลการจัดส่งเอกสาร</span>
              <p className="text-[10px] text-slate-300 mt-0.5 truncate">{notificationMsg}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

