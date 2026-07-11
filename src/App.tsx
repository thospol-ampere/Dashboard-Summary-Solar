import React, { useState, useEffect } from 'react';
import { ProjectData } from './types';
import { initialProject } from './mockData';
import { ProjectForm } from './components/ProjectForm';
import { DashboardView } from './components/DashboardView';
import { 
  Sparkles, Sun, FileCode, CheckCircle2, AlertCircle, Trash2, FolderSync, Info, Cpu, Github, Save, Download, X 
} from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [project, setProject] = useState<ProjectData>(initialProject);
  const [savedProjectsList, setSavedProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Save Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [modalProjectName, setModalProjectName] = useState('');
  const [saveActionType, setSaveActionType] = useState<'overwrite' | 'new'>('overwrite');
  const [downloadAsFile, setDownloadAsFile] = useState(false);

  // ----------------- TOAST ALERTS -----------------
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ----------------- LOCAL STORAGE MANAGERS -----------------
  // Load list of saved projects on mount
  useEffect(() => {
    refreshSavedProjectsList();
    
    // Check if there is an active project being edited, or seed the default
    const savedActive = localStorage.getItem('solar_active_project');
    if (savedActive) {
      try {
        setProject(JSON.parse(savedActive));
      } catch (e) {
        setProject(initialProject);
      }
    } else {
      // Seed initial project into local storage as well for the first-time catalog
      const defaultId = initialProject.id;
      localStorage.setItem(`solar_proj_${defaultId}`, JSON.stringify(initialProject));
      localStorage.setItem('solar_active_project', JSON.stringify(initialProject));
      refreshSavedProjectsList();
    }
  }, []);

  // Update active backup in local storage on every project state change
  useEffect(() => {
    if (project && project.id) {
      localStorage.setItem('solar_active_project', JSON.stringify(project));
    }
  }, [project]);

  const refreshSavedProjectsList = () => {
    const list: { id: string; name: string }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('solar_proj_')) {
        const id = key.substring(11);
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          list.push({
            id,
            name: data.projectName || data.customerName || `โครงการ #${id}`,
          });
        } catch (e) {
          // ignore corrupted data
        }
      }
    }
    setSavedProjectsList(list);
  };

  // ----------------- CORE CONTROLLER FUNCTIONS -----------------
  
  // 1. Save Project & Modal Handlers
  const handleOpenSaveModal = () => {
    setModalProjectName(project.projectName || '');
    setSaveActionType('overwrite');
    setDownloadAsFile(false);
    setIsSaveModalOpen(true);
  };

  const handleConfirmSave = () => {
    if (!modalProjectName.trim()) {
      showToast('กรุณาระบุชื่อโครงการก่อนบันทึก', 'error');
      return;
    }

    try {
      let updatedProject = { ...project, projectName: modalProjectName };

      if (saveActionType === 'new') {
        const newId = `solar-proj-${Date.now()}`;
        updatedProject = {
          ...updatedProject,
          id: newId,
        };
      }

      // Save to local storage
      localStorage.setItem(`solar_proj_${updatedProject.id}`, JSON.stringify(updatedProject));
      localStorage.setItem('solar_active_project', JSON.stringify(updatedProject));
      
      // Update state in App
      setProject(updatedProject);
      refreshSavedProjectsList();

      // Download file if selected
      if (downloadAsFile) {
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
          JSON.stringify(updatedProject, null, 2)
        )}`;
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute('href', jsonString);
        
        const fileName = `${updatedProject.projectName || 'solar'}_project_backup.json`
          .replace(/\s+/g, '_')
          .toLowerCase();
          
        downloadAnchor.setAttribute('download', fileName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
      }

      setIsSaveModalOpen(false);
      
      if (saveActionType === 'new') {
        showToast(`บันทึกเป็นโครงการใหม่ "${updatedProject.projectName}" สำเร็จ`, 'success');
      } else {
        showToast(`บันทึกข้อมูลโครงการ "${updatedProject.projectName}" สำเร็จ`, 'success');
      }
    } catch (e) {
      showToast('ไม่สามารถบันทึกข้อมูลได้ เนื่องจากพื้นที่ความจำเต็ม', 'error');
    }
  };

  // 2. Add New Project
  const handleNewProject = () => {
    const newId = `solar-proj-${Date.now()}`;
    const newTemplate: ProjectData = {
      id: newId,
      projectName: 'โครงการติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ใหม่',
      customerName: 'ชื่อลูกค้าใหม่',
      projectType: 'Solar Rooftop',
      locations: [],
      contractCapacityTotal: 0,
      actualCapacityTotal: 0,
      contractNumber: 'เลขที่สัญญา...',
      serviceDiscountPercent: 0,
      servicePeriodYears: 20,
      contractValue: 0,
      targetCO2ReductionFactor: 0.477,
      meaContact: {
        department: 'แผนกบริการไฟฟ้า',
        contactName: '',
        position: '',
        phone: '',
        email: '',
      },
      customerContact: {
        contactName: '',
        position: '',
        phone: '',
        email: '',
      },
      updatedDate: new Date().toISOString().split('T')[0],
    };

    setProject(newTemplate);
    setView('form');
    showToast('สร้างแบบฟอร์มโครงการใหม่เรียบร้อยแล้ว', 'info');
  };

  // 3. Load Saved Project from Catalog
  const handleLoadSavedProject = (id: string) => {
    const key = `solar_proj_${id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setProject(parsed);
        setView('form');
        showToast(`โหลดโครงการ "${parsed.customerName || 'ที่บันทึก'}" เรียบร้อยแล้ว`, 'success');
      } catch (e) {
        showToast('ไม่สามารถอ่านข้อมูลโครงการที่บันทึกได้', 'error');
      }
    }
  };

  // 4. Delete Saved Project from Catalog
  const handleDeleteSavedProject = (id: string) => {
    const key = `solar_proj_${id}`;
    localStorage.removeItem(key);
    refreshSavedProjectsList();
    showToast('ลบโครงการออกจากคลังสำเร็จ', 'info');

    // If deleted project is currently active, load default initial
    if (project.id === id) {
      setProject(initialProject);
    }
  };

  // 5. Download Project as JSON file
  const handleDownloadProject = () => {
    try {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(project, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      
      const fileName = `${project.customerName || 'solar'}_project_backup.json`
        .replace(/\s+/g, '_')
        .toLowerCase();
        
      downloadAnchor.setAttribute('download', fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      
      showToast('ดาวน์โหลดไฟล์ข้อมูลโครงการ (.json) สำเร็จ', 'success');
    } catch (e) {
      showToast('ไม่สามารถส่งออกไฟล์ได้', 'error');
    }
  };

  // 6. Import Project from JSON file upload
  const handleUploadProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target?.result as string);
        
        // Basic validation of import schema
        if (importedData && typeof importedData === 'object' && importedData.projectName) {
          // Assign a new ID to avoid conflict or reuse import ID
          const updatedImport = {
            ...importedData,
            id: importedData.id || `solar-imported-${Date.now()}`,
          };
          
          setProject(updatedImport);
          // Also save to localStorage list
          localStorage.setItem(`solar_proj_${updatedImport.id}`, JSON.stringify(updatedImport));
          localStorage.setItem('solar_active_project', JSON.stringify(updatedImport));
          refreshSavedProjectsList();
          
          setView('form');
          showToast('นำเข้าข้อมูลโครงการจากไฟล์สำเร็จแล้ว', 'success');
        } else {
          showToast('ไฟล์ข้อมูลไม่ถูกต้องตามโครงสร้างระบบ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาดในการอ่านไฟล์ กรุณาตรวจสอบรูปแบบไฟล์ JSON', 'error');
      }
    };
    
    fileReader.readAsText(file);
    // Reset file input value to allow uploading same file again
    e.target.value = '';
  };

  // 7. Preview and PDF Export Handlers
  const handlePreviewDashboard = () => {
    setView('dashboard');
    showToast('กำลังแสดงหน้าสรุปภาพรวมโครงการ', 'info');
  };

  const handleExportPDF = () => {
    setView('dashboard');
    showToast('ระบบกำลังเปิดหน้าสั่งพิมพ์เพื่อส่งออก PDF...', 'success');
    
    // Allow React state transition to complete, then print
    setTimeout(() => {
      window.print();
    }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans transition-colors duration-300">
      
      {/* ----------------- GLOBAL HEADER (HIDDEN IN DASHBOARD / PRINT) ----------------- */}
      {view === 'form' && (
        <header className="bg-gradient-to-r from-indigo-900 to-slate-900 text-white shadow-md border-b border-indigo-950 px-6 py-4.5 print:hidden">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            
            {/* Branding Title */}
            <div className="flex items-center space-x-3.5 text-left w-full sm:w-auto">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center text-amber-400 shadow-inner">
                <Sun className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h1 className="text-base font-extrabold tracking-tight flex items-center space-x-1.5">
                  <span>ระบบจัดข้อมูลและสร้างรายงานสรุปโครงการผลิตไฟฟ้าแสงอาทิตย์</span>
                  <span className="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[9px] uppercase tracking-wider">
                    ONE PAGE DIGITAL TWIN
                  </span>
                </h1>
                <p className="text-[11px] text-indigo-200 font-medium">
                  กรอกข้อมูลโครงการเพื่อสร้าง Dashboard สรุปแบบ One Page โดยอัตโนมัติ ตามรูปแบบเอกสารหลัก
                </p>
              </div>
            </div>

            {/* Quick stats on Header */}
            <div className="flex items-center space-x-4 bg-indigo-950/40 px-4 py-2 rounded-xl border border-indigo-800/30 text-xs w-full sm:w-auto justify-between sm:justify-start">
              <div className="text-left pr-4 border-r border-indigo-800/50">
                <span className="text-slate-400 text-[10px] block">โครงการที่กรอกอยู่</span>
                <span className="text-amber-400 font-bold font-mono block truncate max-w-[150px]">
                  {project.customerName || 'ไม่มีชื่อลูกค้า'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 text-[10px] block">กำลังติดตั้งรวม</span>
                <span className="text-white font-bold font-mono">
                  {project.contractCapacityTotal.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWp
                </span>
              </div>
            </div>

          </div>
        </header>
      )}

      {/* ----------------- TOAST NOTIFICATIONS ----------------- */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[100] animate-bounce print:hidden">
          <div className={`flex items-center space-x-2.5 px-4.5 py-3 rounded-xl shadow-lg border backdrop-blur-md ${
            toast.type === 'success' 
              ? 'bg-emerald-50/95 border-emerald-200 text-emerald-800' 
              : toast.type === 'error'
              ? 'bg-rose-50/95 border-rose-200 text-rose-800'
              : 'bg-indigo-50/95 border-indigo-200 text-indigo-800'
          }`}>
            {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
            {toast.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            {toast.type === 'info' && <Info className="w-5 h-5 text-indigo-600 flex-shrink-0" />}
            <span className="text-xs font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* ----------------- CORE VIEWS ----------------- */}
      <main className="flex-1 w-full print:p-0">
        {view === 'form' ? (
          <div className="py-6 px-4">
            <ProjectForm
              project={project}
              setProject={setProject}
              onSave={handleOpenSaveModal}
              onNew={handleNewProject}
              onDownload={handleDownloadProject}
              onUpload={handleUploadProject}
              onPreview={handlePreviewDashboard}
              onExportPDF={handleExportPDF}
              savedProjectsList={savedProjectsList}
              onLoadSavedProject={handleLoadSavedProject}
              onDeleteSavedProject={handleDeleteSavedProject}
            />
          </div>
        ) : (
          <DashboardView
            project={project}
            onBackToEdit={() => setView('form')}
            onExportPDF={handleExportPDF}
          />
        )}
      </main>

      {/* ----------------- SAVE PROJECT MODAL ----------------- */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all scale-100">
            {/* Header */}
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600">
                  <Save className="w-5 h-5" />
                </div>
                <span className="font-bold text-slate-800 text-sm sm:text-base">ยืนยันการบันทึกโครงการ</span>
              </div>
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">ชื่อโครงการ</label>
                <input
                  type="text"
                  value={modalProjectName}
                  onChange={(e) => setModalProjectName(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-xs sm:text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                  placeholder="ตั้งชื่อโครงการเพื่อจัดเก็บ..."
                />
              </div>

              {/* Save Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">รูปแบบการบันทึก</label>
                
                <div className="grid grid-cols-1 gap-2">
                  {/* Overwrite current */}
                  <label className={`flex items-start p-3 border rounded-xl cursor-pointer transition ${
                    saveActionType === 'overwrite'
                      ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="saveActionType"
                      value="overwrite"
                      checked={saveActionType === 'overwrite'}
                      onChange={() => setSaveActionType('overwrite')}
                      className="mt-0.5 mr-3 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold block">บันทึกซ้ำโครงการเดิม (Overwrite)</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        บันทึกทับข้อมูลในโปรเจคปัจจุบัน (รหัสเดิม: {project.id})
                      </span>
                    </div>
                  </label>

                  {/* Save as new */}
                  <label className={`flex items-start p-3 border rounded-xl cursor-pointer transition ${
                    saveActionType === 'new'
                      ? 'border-indigo-500 bg-indigo-50/20 text-indigo-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="saveActionType"
                      value="new"
                      checked={saveActionType === 'new'}
                      onChange={() => setSaveActionType('new')}
                      className="mt-0.5 mr-3 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    <div className="text-left">
                      <span className="text-xs font-bold block">บันทึกเป็นโครงการใหม่ (Save as New)</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        คัดลอกข้อมูลไปสร้างโครงการใหม่แยกออกมาอีกตัวหนึ่ง
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Device Download Option */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl cursor-pointer border border-slate-200/60 transition group">
                  <input
                    type="checkbox"
                    checked={downloadAsFile}
                    onChange={(e) => setDownloadAsFile(e.target.checked)}
                    className="mr-3 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded"
                  />
                  <div className="flex-1 text-left flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-700 block">บันทึกไฟล์ลงอุปกรณ์ด้วย (.json)</span>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        ดาวน์โหลดไฟล์โปรเจคเก็บไว้ในเครื่องคอมพิวเตอร์หรือมือถือของคุณ
                      </span>
                    </div>
                    <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition ml-2 flex-shrink-0" />
                  </div>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex justify-end items-center space-x-2">
              <button
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmSave}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition flex items-center space-x-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>ยืนยันการบันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
