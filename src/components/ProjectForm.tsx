import React, { useState, useEffect, useMemo } from 'react';
import { ProjectData, LocationItem, PROVINCE_MAP } from '../types';
import { Plus, Trash2, Save, Download, Upload, Eye, FileSpreadsheet, Sparkles, Building2, Phone, Mail, Award, CheckCircle2, ChevronRight, RefreshCw, Clock, ChevronDown } from 'lucide-react';

interface SearchableProvinceSelectProps {
  value: string;
  onChange: (value: string) => void;
  provinceOptions: string[];
}

const SearchableProvinceSelect: React.FC<SearchableProvinceSelectProps> = ({
  value,
  onChange,
  provinceOptions,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  const filteredOptions = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return provinceOptions;
    return provinceOptions.filter((prov) =>
      prov.toLowerCase().includes(term)
    );
  }, [searchTerm, provinceOptions]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
  };

  const handleSelectOption = (prov: string) => {
    setSearchTerm(prov);
    onChange(prov);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <input
          type="text"
          value={searchTerm}
          onFocus={() => setIsOpen(true)}
          onBlur={() => {
            // Delay slightly so that click events on option buttons can trigger before dropdown closes
            setTimeout(() => {
              setIsOpen(false);
            }, 200);
          }}
          onChange={handleInputChange}
          className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8"
          placeholder="พิมพ์ค้นหา หรือกรอกชื่อจังหวัดใหม่..."
        />
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg z-50 py-1 text-xs text-left">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((prov) => {
              const reg = PROVINCE_MAP[prov]?.region || 'ภาคกลาง';
              return (
                <button
                  key={prov}
                  type="button"
                  onMouseDown={() => handleSelectOption(prov)}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex justify-between items-center text-slate-700"
                >
                  <span className="font-semibold">{prov}</span>
                  <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    {reg}
                  </span>
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-slate-500 italic text-center">
              ใช้จังหวัดตามพิมพ์: "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ProjectFormProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onSave: () => void;
  onNew: () => void;
  onDownload: () => void;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPreview: () => void;
  onExportPDF: () => void;
  savedProjectsList: { id: string; name: string }[];
  onLoadSavedProject: (id: string) => void;
  onDeleteSavedProject: (id: string) => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({
  project,
  setProject,
  onSave,
  onNew,
  onDownload,
  onUpload,
  onPreview,
  onExportPDF,
  savedProjectsList,
  onLoadSavedProject,
  onDeleteSavedProject,
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'locations' | 'contacts'>('info');
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);

  // State and handlers for contractValue formatted input
  const [contractValueStr, setContractValueStr] = useState<string>(() => {
    if (project.contractValue !== undefined && project.contractValue !== null) {
      return project.contractValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return '';
  });

  useEffect(() => {
    if (project.contractValue !== undefined && project.contractValue !== null && project.contractValue !== 0) {
      setContractValueStr(project.contractValue.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    } else if (project.contractValue === 0) {
      setContractValueStr('0.00');
    } else {
      setContractValueStr('');
    }
  }, [project.id]);

  const handleContractValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // Remove all existing commas
    let cleanVal = val.replace(/,/g, '');
    
    // Allow digits, up to one dot, and optionally empty string
    if (cleanVal === '' || /^\d*\.?\d*$/.test(cleanVal)) {
      const parts = cleanVal.split('.');
      if (parts[0] !== undefined) {
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      }
      const formatted = parts.join('.');
      setContractValueStr(formatted);
      
      const parsedNum = parseFloat(cleanVal) || 0;
      setProject((prev) => ({
        ...prev,
        contractValue: parsedNum,
      }));
    }
  };

  const handleContractValueBlur = () => {
    if (contractValueStr) {
      const cleanVal = contractValueStr.replace(/,/g, '');
      const parsedNum = parseFloat(cleanVal);
      if (!isNaN(parsedNum)) {
        setContractValueStr(parsedNum.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
        setProject((prev) => ({
          ...prev,
          contractValue: parsedNum,
        }));
      } else {
        setContractValueStr('0.00');
        setProject((prev) => ({
          ...prev,
          contractValue: 0,
        }));
      }
    } else {
      setContractValueStr('0.00');
      setProject((prev) => ({
        ...prev,
        contractValue: 0,
      }));
    }
  };

  // Province Options list sorted alphabetically
  const provinceOptions = Object.keys(PROVINCE_MAP).sort((a, b) => a.localeCompare(b, 'th'));

  // Calculate dynamic capacity values directly from the locations list
  const calculatedContractCapacityTotal = useMemo(() => {
    return Math.round(project.locations.reduce((sum, loc) => sum + loc.capacityKWp, 0) * 100) / 100;
  }, [project.locations]);

  const calculatedActualCapacityTotal = useMemo(() => {
    return Math.round(project.locations.reduce((sum, loc) => sum + (loc.actualCapacityKWp || 0), 0) * 100) / 100;
  }, [project.locations]);

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setProject((prev) => {
      const updated = { ...prev, [name]: value };
      
      // If we change number fields, parse them properly
      if (name === 'serviceDiscountPercent' || name === 'servicePeriodYears' || name === 'targetCO2ReductionFactor') {
        updated[name] = parseFloat(value) || 0;
      }
      
      return updated;
    });
  };

  const getDatetimeInputValue = (dateStr: string) => {
    if (!dateStr) return '';
    if (dateStr.includes('T')) {
      return dateStr.slice(0, 16);
    }
    if (dateStr.includes(' ')) {
      return dateStr.replace(' ', 'T').slice(0, 16);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return `${dateStr}T12:00`;
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const hh = String(d.getHours()).padStart(2, '0');
      const min = String(d.getMinutes()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
    }
    return '';
  };

  const handleSetThailandCurrentTime = () => {
    const d = new Date();
    const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    const thailandTime = new Date(utc + (3600000 * 7));
    
    const yyyy = thailandTime.getFullYear();
    const mm = String(thailandTime.getMonth() + 1).padStart(2, '0');
    const dd = String(thailandTime.getDate()).padStart(2, '0');
    const hh = String(thailandTime.getHours()).padStart(2, '0');
    const min = String(thailandTime.getMinutes()).padStart(2, '0');
    const ss = String(thailandTime.getSeconds()).padStart(2, '0');
    
    const formattedDateTime = `${yyyy}-${mm}-${dd}T${hh}:${min}:${ss}`;
    
    setProject((prev) => ({
      ...prev,
      updatedDate: formattedDateTime,
    }));
    
    if (onPreview) {
      setTimeout(() => {
        onPreview();
      }, 50);
    }
  };

  const handleMeaContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProject((prev) => ({
      ...prev,
      meaContact: {
        ...prev.meaContact,
        [name]: value,
      },
    }));
  };

  const handleCustomerContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProject((prev) => ({
      ...prev,
      customerContact: {
        ...prev.customerContact,
        [name]: value,
      },
    }));
  };

  // Add Location Item
  const handleAddLocation = () => {
    const newLoc: LocationItem = {
      id: `loc-${Date.now()}`,
      name: 'สถานที่ติดตั้งใหม่',
      subAgency: 'หน่วยงานผู้ดูแล',
      capacityKWp: 100,
      actualCapacityKWp: 100,
      province: 'กรุงเทพมหานคร',
      region: 'กรุงเทพมหานคร',
      status: 'ติดตั้งแล้ว',
    };

    setProject((prev) => {
      const updatedLocs = [...prev.locations, newLoc];
      // Recalculate totals
      const totalContract = updatedLocs.reduce((sum, loc) => sum + loc.capacityKWp, 0);
      const totalActual = updatedLocs.reduce((sum, loc) => sum + (loc.status === 'ติดตั้งแล้ว' ? (loc.actualCapacityKWp || 0) : 0), 0);
      
      return {
        ...prev,
        locations: updatedLocs,
        contractCapacityTotal: Math.round(totalContract * 100) / 100,
        actualCapacityTotal: Math.round(totalActual * 100) / 100,
      };
    });
  };

  // Delete Location Item
  const handleDeleteLocation = (id: string) => {
    setProject((prev) => {
      const updatedLocs = prev.locations.filter((loc) => loc.id !== id);
      const totalContract = updatedLocs.reduce((sum, loc) => sum + loc.capacityKWp, 0);
      const totalActual = updatedLocs.reduce((sum, loc) => sum + (loc.status === 'ติดตั้งแล้ว' ? (loc.actualCapacityKWp || 0) : 0), 0);

      return {
        ...prev,
        locations: updatedLocs,
        contractCapacityTotal: Math.round(totalContract * 100) / 100,
        actualCapacityTotal: Math.round(totalActual * 100) / 100,
      };
    });
  };

  // Update specific field in location item
  const handleLocationChange = (id: string, field: keyof LocationItem, value: any) => {
    setProject((prev) => {
      const updatedLocs = prev.locations.map((loc) => {
        if (loc.id === id) {
          const updatedLoc = { ...loc, [field]: value };
          
          // Auto update region based on province choice
          if (field === 'province') {
            const trimmed = (value || '').trim();
            const mapped = PROVINCE_MAP[trimmed];
            if (mapped) {
              updatedLoc.region = mapped.region;
            } else {
              // Try finding regional match for custom province
              const foundKey = Object.keys(PROVINCE_MAP).find(k => k.toLowerCase().includes(trimmed.toLowerCase()) || trimmed.toLowerCase().includes(k.toLowerCase()));
              if (foundKey) {
                updatedLoc.region = PROVINCE_MAP[foundKey].region;
              } else {
                updatedLoc.region = 'ภาคกลาง'; // Fallback
              }
            }
          }
          
          // Cast numbers
          if (field === 'capacityKWp') {
            updatedLoc.capacityKWp = parseFloat(value) || 0;
          }
          if (field === 'actualCapacityKWp') {
            updatedLoc.actualCapacityKWp = parseFloat(value) || 0;
          }
          if (field === 'status') {
            if (value === 'ติดตั้งแล้ว') {
              if (!updatedLoc.actualCapacityKWp || updatedLoc.actualCapacityKWp === 0) {
                updatedLoc.actualCapacityKWp = updatedLoc.capacityKWp;
              }
            } else {
              updatedLoc.actualCapacityKWp = 0;
            }
          }

          return updatedLoc;
        }
        return loc;
      });

      const totalContract = updatedLocs.reduce((sum, loc) => sum + loc.capacityKWp, 0);
      const totalActual = updatedLocs.reduce((sum, loc) => sum + (loc.status === 'ติดตั้งแล้ว' ? (loc.actualCapacityKWp || 0) : 0), 0);

      return {
        ...prev,
        locations: updatedLocs,
        contractCapacityTotal: Math.round(totalContract * 100) / 100,
        actualCapacityTotal: Math.round(totalActual * 100) / 100,
      };
    });
  };

  // Trigger file dialog
  const triggerFileInput = () => {
    const el = document.getElementById('import-project-file');
    if (el) el.click();
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      {/* TOOLBAR CONTROLS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Save/Reset Left Section */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNew}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition"
            id="btn-add-project"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มโครงการใหม่</span>
          </button>
          
          <button
            onClick={onSave}
            className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-indigo-200"
            id="btn-save-project"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกโครงการ</span>
          </button>

          <button
            onClick={onDownload}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200/60 rounded-lg text-sm font-medium transition"
            id="btn-download-project"
          >
            <Download className="w-4 h-4" />
            <span>ดาวน์โหลดโครงการ (.json)</span>
          </button>

          <button
            onClick={triggerFileInput}
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200/60 rounded-lg text-sm font-medium transition"
          >
            <Upload className="w-4 h-4" />
            <span>นำเข้าโครงการ (.json)</span>
          </button>
          <input
            type="file"
            id="import-project-file"
            accept=".json"
            onChange={onUpload}
            className="hidden"
          />
        </div>

        {/* View / Print / PDF Right Section */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onPreview}
            className="flex items-center space-x-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-sky-100"
            id="btn-preview-dashboard"
          >
            <Eye className="w-4 h-4" />
            <span>ดูหน้าสรุป Dashboard</span>
          </button>

          <button
            onClick={onExportPDF}
            className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-rose-100"
            id="btn-export-pdf"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export PDF / สั่งพิมพ์</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* LEFT COLUMN: SAVED PROJECTS LIST & INSTRUCTIONS */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Saved Projects Hub */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
            <div className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="font-semibold text-slate-800 text-sm flex items-center space-x-1.5">
                <Award className="w-4.5 h-4.5 text-indigo-600" />
                <span>คลังโครงการที่บันทึกไว้ ({savedProjectsList.length})</span>
              </h3>
            </div>
            
            {savedProjectsList.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                ไม่มีโครงการอื่นในคลัง
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-slate-100">
                {savedProjectsList.map((p) => (
                  <div
                    key={p.id}
                    className={`p-3 text-left transition group relative flex justify-between items-center ${
                      p.id === project.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <button
                      onClick={() => onLoadSavedProject(p.id)}
                      className="flex-1 min-w-0 pr-6 text-left"
                    >
                      <p className={`text-xs font-medium truncate ${p.id === project.id ? 'text-indigo-700' : 'text-slate-700 group-hover:text-indigo-600'}`}>
                        {p.name || 'ไม่มีชื่อโครงการ'}
                      </p>
                      <span className="text-[10px] text-slate-400">ID: {p.id}</span>
                    </button>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSavedProject(p.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-50 rounded-md text-rose-500 hover:text-rose-600 transition absolute right-2"
                      title="ลบโครงการ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Guidelines / Tips */}
          <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4.5 space-y-3">
            <h4 className="font-semibold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>คำแนะนำการใช้งาน</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside">
              <li>ระบบจะคำนวณกำลังติดตั้งรวม และสัดส่วนสถานะการติดตั้งให้อัตโนมัติ</li>
              <li>การเลือก <strong>จังหวัด</strong> ในสถานที่ติดตั้ง จะเป็นการกำหนดพิกัดและภูมิภาคโดยอัตโนมัติบนแผนที่</li>
              <li>หากเลือกสถานะ <strong>ติดตั้งแล้ว</strong> สามารถระบุและแก้ไขกำลังติดตั้งจริงแยกต่างหากได้</li>
              <li>ค่าคาดการณ์การลดการปล่อย CO₂ คำนวณจากสูตร: <code className="bg-slate-200/70 px-1 py-0.5 rounded font-mono text-[10px]">กำลังติดตั้งรวม * 1,266.6 * ปี * 0.477 / 1,000</code></li>
            </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: MAIN FORM CARDS */}
        <div className="lg:col-span-3 space-y-6">
          
          {/* TAB SWITCHER */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
                activeTab === 'info'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              1. ข้อมูลโครงการทั่วไป
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`pb-3 px-6 text-sm font-semibold border-b-2 transition flex items-center space-x-1.5 ${
                activeTab === 'locations'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>2. สถานที่ติดตั้งระบบโซลาร์</span>
              <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">
                {project.locations.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('contacts')}
              className={`pb-3 px-6 text-sm font-semibold border-b-2 transition ${
                activeTab === 'contacts'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              3. ข้อมูลติดต่อผู้ประสานงาน
            </button>
          </div>

          {/* TAB 1: GENERAL INFO */}
          {activeTab === 'info' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-6">
              <div className="border-b border-slate-100 pb-3">
                <h3 className="font-semibold text-slate-800 text-base">ข้อมูลทั่วไปของโครงการ</h3>
                <p className="text-slate-500 text-xs mt-0.5">กรอกชื่อ รูปแบบ ขนาด และมูลค่าทางการเงินของโครงการผลิตไฟฟ้าจากแสงอาทิตย์</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                {/* Project Name */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ชื่อโครงการติดตั้งระบบผลิตไฟฟ้าฯ</label>
                  <input
                    type="text"
                    name="projectName"
                    value={project.projectName}
                    onChange={handleGeneralChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="ระบุชื่อโครงการเต็ม เช่น โครงการติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์..."
                  />
                </div>

                {/* Customer Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ชื่อหน่วยงาน / ชื่อลูกค้า</label>
                  <input
                    type="text"
                    name="customerName"
                    value={project.customerName}
                    onChange={handleGeneralChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="ระบุชื่อลูกค้า เช่น กรมประชาสัมพันธ์"
                  />
                </div>

                {/* Project Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">รูปแบบโครงการ</label>
                  <select
                    name="projectType"
                    value={project.projectType}
                    onChange={handleGeneralChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  >
                    <option value="Solar Rooftop">Solar Rooftop (ติดตั้งบนหลังคา)</option>
                    <option value="Floating Solar">Floating Solar (โซลาร์ลอยน้ำ)</option>
                    <option value="Solar Farm">Solar Farm (โซลาร์ฟาร์มบนพื้นดิน)</option>
                  </select>
                </div>

                {/* Contract Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">เลขที่สัญญาให้บริการฯ และวันลงนามสัญญา</label>
                  <input
                    type="text"
                    name="contractNumber"
                    value={project.contractNumber}
                    onChange={handleGeneralChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    placeholder="เลขที่สัญญา... ลงวันที่..."
                  />
                </div>

                {/* Updated Date */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">วันเวลาที่อัพเดทข้อมูลในเอกสาร (เลือกเองได้)</label>
                    <input
                      type="datetime-local"
                      name="updatedDate"
                      value={getDatetimeInputValue(project.updatedDate)}
                      onChange={handleGeneralChange}
                      className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                    />
                  </div>
                  <div>
                    <button
                      type="button"
                      onClick={handleSetThailandCurrentTime}
                      className="w-full flex items-center justify-center space-x-1.5 px-4.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold transition shadow-sm hover:shadow-md focus:outline-none h-[38px] leading-tight"
                      title="ตั้งค่าวันเวลาปัจจุบันของไทย และแสดงผลบนแดชบอร์ดทันที"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>ตั้งค่าเป็นเวลาปัจจุบัน</span>
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="md:col-span-2 border-t border-slate-100 my-2" />

                {/* Contract value (Baht) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">มูลค่าโครงการตลอดอายุสัญญาฯ (บาท)</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="contractValue"
                      value={contractValueStr}
                      onChange={handleContractValueChange}
                      onBlur={handleContractValueBlur}
                      className="w-full pl-3.5 pr-12 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                      placeholder="325,395,321.32"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 text-xs font-medium">บาท</span>
                    </div>
                  </div>
                </div>

                {/* Service Period */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ระยะเวลาการให้บริการ (ปี)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="servicePeriodYears"
                      value={project.servicePeriodYears || ''}
                      onChange={handleGeneralChange}
                      className="w-full pl-3.5 pr-12 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                      placeholder="25"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 text-xs font-medium">ปี</span>
                    </div>
                  </div>
                </div>

                {/* Service Discount */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ส่วนลดค่าบริการ (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      name="serviceDiscountPercent"
                      value={project.serviceDiscountPercent || ''}
                      onChange={handleGeneralChange}
                      className="w-full pl-3.5 pr-12 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                      placeholder="25"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <span className="text-slate-400 text-xs font-medium">%</span>
                    </div>
                  </div>
                </div>

                {/* Target CO2 Factor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">ตัวคูณคำนวณการลดการปล่อย CO₂ (tCO₂/MWh)</label>
                  <input
                    type="number"
                    step="0.001"
                    name="targetCO2ReductionFactor"
                    value={project.targetCO2ReductionFactor || 0.477}
                    onChange={handleGeneralChange}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono"
                    placeholder="0.477"
                  />
                </div>

                {/* Read-Only Stats Info for Form User */}
                <div className="md:col-span-2 bg-indigo-50/50 rounded-xl p-4 grid grid-cols-2 md:grid-cols-4 gap-4 border border-indigo-100">
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">จำนวนสถานที่ทั้งหมด</span>
                    <span className="text-base font-bold text-slate-800 font-mono">{project.locations.length} แห่ง</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">กำลังติดตั้งตามสัญญารวม</span>
                    <span className="text-base font-bold text-indigo-700 font-mono">
                      {calculatedContractCapacityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">กำลังติดตั้งจริงรวม (สำเร็จ)</span>
                    <span className="text-base font-bold text-cyan-700 font-mono">
                      {calculatedActualCapacityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-medium block">ความก้าวหน้าโครงการ</span>
                    <span className="text-base font-bold text-emerald-700 font-mono">
                      {(calculatedContractCapacityTotal > 0
                        ? (calculatedActualCapacityTotal / calculatedContractCapacityTotal) * 100
                        : 0).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %
                    </span>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 2: LOCATIONS EDITING */}
          {activeTab === 'locations' && (
            <div className="space-y-4">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-base">สถานที่ติดตั้งโครงการ ({project.locations.length})</h3>
                    <p className="text-slate-500 text-xs mt-0.5">เพิ่มพิกัดและข้อมูลของหน่วยงานย่อยแต่ละแห่ง</p>
                  </div>
                  
                  <button
                    onClick={handleAddLocation}
                    className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>เพิ่มสถานที่ติดตั้ง</span>
                  </button>
                </div>

                {project.locations.length === 0 ? (
                  <div className="text-center py-10 text-slate-400">
                    <p className="text-sm">ยังไม่มีสถานที่ติดตั้งโครงการในรายการ</p>
                    <button
                      onClick={handleAddLocation}
                      className="mt-3 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-semibold transition"
                    >
                      สร้างสถานที่แห่งแรก
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                    {project.locations.map((loc, idx) => {
                      const isEditing = editingLocationId === loc.id;
                      
                      return (
                        <div
                          key={loc.id}
                          className={`border rounded-xl transition duration-200 ${
                            isEditing
                              ? 'border-indigo-500 shadow-md bg-indigo-50/10'
                              : 'border-slate-200 hover:border-slate-300 bg-white'
                          }`}
                        >
                          {/* COLLAPSED HEADER */}
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer"
                            onClick={() => setEditingLocationId(isEditing ? null : loc.id)}
                          >
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 border border-slate-200 text-slate-600 flex items-center justify-center font-mono text-xs font-bold">
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1 text-left">
                                <h4 className="text-sm font-semibold text-slate-800 truncate">{loc.name}</h4>
                                <p className="text-[11px] text-slate-400 truncate">{loc.subAgency || 'ไม่มีรายละเอียดหน่วยงานย่อย'}</p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-4 pl-4">
                              <div className="text-right flex-shrink-0 hidden sm:block">
                                <span className="text-[10px] text-slate-400 block font-semibold">
                                  {loc.status === 'ติดตั้งแล้ว' ? 'กำลังติดตั้งจริง' : 'กำลังติดตั้ง'}
                                </span>
                                <span className={`text-xs font-bold font-mono ${loc.status === 'ติดตั้งแล้ว' ? 'text-cyan-600' : 'text-indigo-600'}`}>
                                  {(loc.status === 'ติดตั้งแล้ว' ? (loc.actualCapacityKWp !== undefined && loc.actualCapacityKWp !== null ? loc.actualCapacityKWp : loc.capacityKWp) : loc.capacityKWp).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                                </span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                loc.status === 'ติดตั้งแล้ว'
                                  ? 'bg-cyan-100 text-cyan-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}>
                                {loc.status}
                              </span>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteLocation(loc.id);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-md transition"
                                title="ลบ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* EXPANDED CONTENT EDIT FORM */}
                          {isEditing && (
                            <div className="border-t border-slate-150 p-4 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4">
                              {/* Location Name */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">ชื่อสถานที่ติดตั้ง</label>
                                <input
                                  type="text"
                                  value={loc.name}
                                  onChange={(e) => handleLocationChange(loc.id, 'name', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="เช่น กรุงเทพมหานคร (อารีย์)"
                                />
                              </div>

                              {/* Sub Agency / Detail */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">หน่วยงานย่อย / รายละเอียด</label>
                                <input
                                  type="text"
                                  value={loc.subAgency}
                                  onChange={(e) => handleLocationChange(loc.id, 'subAgency', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  placeholder="เช่น สถานีวิทยุกระจายเสียงแห่งประเทศไทย"
                                />
                              </div>

                              {/* Province Selection */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">จังหวัดติดตั้ง (เพื่อกำหนดพิกัดแผนที่)</label>
                                <SearchableProvinceSelect
                                  value={loc.province}
                                  onChange={(val) => handleLocationChange(loc.id, 'province', val)}
                                  provinceOptions={provinceOptions}
                                />
                              </div>

                              {/* Capacity kWp */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">กำลังติดตั้งตามสัญญา (kWp)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={loc.capacityKWp || ''}
                                  onChange={(e) => handleLocationChange(loc.id, 'capacityKWp', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                  placeholder="120.12"
                                />
                              </div>

                              {/* Status */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">สถานะโครงการ</label>
                                <select
                                  value={loc.status}
                                  onChange={(e) => handleLocationChange(loc.id, 'status', e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="ติดตั้งแล้ว">ติดตั้งแล้ว</option>
                                  <option value="อยู่ระหว่างดำเนินการ">อยู่ระหว่างดำเนินการ</option>
                                </select>
                              </div>

                              {/* Actual installed capacity (Conditional or display info) */}
                              <div>
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">กำลังติดตั้งจริง (kWp)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  disabled={loc.status !== 'ติดตั้งแล้ว'}
                                  value={loc.status === 'ติดตั้งแล้ว' ? (loc.actualCapacityKWp !== undefined && loc.actualCapacityKWp !== null ? loc.actualCapacityKWp : loc.capacityKWp) : 0}
                                  onChange={(e) => handleLocationChange(loc.id, 'actualCapacityKWp', e.target.value)}
                                  className={`w-full px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono ${
                                    loc.status !== 'ติดตั้งแล้ว' ? 'bg-slate-200 cursor-not-allowed text-slate-500' : 'bg-white'
                                  }`}
                                  placeholder="0.00"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONTACT INFORMATION */}
          {activeTab === 'contacts' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* MEA Contact */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">ข้อมูลสำหรับติดต่อผู้รับผิดชอบโครงการ (กฟน. MEA)</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">แผนก / กอง / ฝ่าย</label>
                    <input
                      type="text"
                      name="department"
                      value={project.meaContact.department}
                      onChange={handleMeaContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="ฝ่ายธุรกิจบริการคุณภาพไฟฟ้า"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ประสานงานหลัก กฟน.</label>
                    <input
                      type="text"
                      name="contactName"
                      value={project.meaContact.contactName}
                      onChange={handleMeaContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="ชื่อผู้ประสานงาน กฟน."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      name="position"
                      value={project.meaContact.position}
                      onChange={handleMeaContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="ตำแหน่งผู้ประสานงาน กฟน."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                    <input
                      type="text"
                      name="phone"
                      value={project.meaContact.phone}
                      onChange={handleMeaContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="02 256 3333"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={project.meaContact.email}
                      onChange={handleMeaContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="example@mea.or.th"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Contact */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-6 space-y-4">
                <div className="border-b border-slate-100 pb-3 flex items-center space-x-2">
                  <Phone className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-semibold text-slate-800 text-sm">ข้อมูลติดต่อประสานงาน (ลูกค้า)</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อผู้ประสานงานลูกค้า</label>
                    <input
                      type="text"
                      name="contactName"
                      value={project.customerContact.contactName}
                      onChange={handleCustomerContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="ชื่อผู้ประสานงานลูกค้า"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">ตำแหน่ง</label>
                    <input
                      type="text"
                      name="position"
                      value={project.customerContact.position}
                      onChange={handleCustomerContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="ตำแหน่งผู้ประสานงานฝั่งลูกค้า"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                    <input
                      type="text"
                      name="phone"
                      value={project.customerContact.phone}
                      onChange={handleCustomerContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="เบอร์โทรศัพท์ลูกค้า"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={project.customerContact.email}
                      onChange={handleCustomerContactChange}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="customer@email.com"
                    />
                  </div>
                </div>
              </div>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
