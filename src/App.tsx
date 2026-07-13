import React, { useState, useEffect } from 'react';
import { ProjectData } from './types';
import { initialProject } from './mockData';
import { ProjectForm } from './components/ProjectForm';
import { DashboardView } from './components/DashboardView';
import { 
  Sparkles, Sun, FileCode, CheckCircle2, AlertCircle, Trash2, FolderSync, Info, Cpu, Github, Save, Download, X, Plus, LogIn, LogOut, Cloud
} from 'lucide-react';
import { signInAnonymously, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, getDocs, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

export default function App() {
  const [view, setView] = useState<'form' | 'dashboard'>('form');
  const [project, setProject] = useState<ProjectData>(() => {
    const savedActive = localStorage.getItem('solar_active_project');
    if (savedActive) {
      try {
        return JSON.parse(savedActive);
      } catch (e) {
        return initialProject;
      }
    }
    return initialProject;
  });
  const [savedProjectsList, setSavedProjectsList] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [autoOpenPrint, setAutoOpenPrint] = useState(false);
  const [openProjectIds, setOpenProjectIds] = useState<string[]>(() => {
    const openIds: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('solar_proj_')) {
        openIds.push(key.substring(11));
      }
    }
    
    let activeId = initialProject.id;
    const savedActive = localStorage.getItem('solar_active_project');
    if (savedActive) {
      try {
        const parsed = JSON.parse(savedActive);
        if (parsed && parsed.id) {
          activeId = parsed.id;
        }
      } catch (e) {
        // ignore
      }
    }
    
    if (openIds.length === 0) {
      openIds.push(activeId);
    }
    if (!openIds.includes(activeId)) {
      openIds.push(activeId);
    }
    return openIds;
  });

  // Save Modal States
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [modalProjectName, setModalProjectName] = useState('');
  const [saveActionType, setSaveActionType] = useState<'overwrite' | 'new'>('overwrite');
  const [downloadAsFile, setDownloadAsFile] = useState(false);

  // Delete Modal States
  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string } | null>(null);

  // ----------------- FIREBASE SYNC & AUTH STATES & EFFECTS -----------------
  const [user, setUser] = useState<User | null>(null);
  const [syncing, setSyncing] = useState<boolean>(false);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // Initialize Firebase Auth and sync
  useEffect(() => {
    let unsubscribeRealtime: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setAuthLoading(false);
        // Sync with Firestore
        try {
          const unsub = await syncWithFirestore(currentUser);
          if (unsub) {
            unsubscribeRealtime = unsub;
          }
        } catch (err) {
          console.error("Error setting up sync:", err);
        }
      } else {
        setUser(null);
        // Try signing in anonymously for background sync if enabled
        try {
          await signInAnonymously(auth);
        } catch (err) {
          console.warn("Anonymous Auth is disabled or restricted in the Firebase console. Falling back to local mode:", err);
          setAuthLoading(false);
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeRealtime) unsubscribeRealtime();
    };
  }, []);

  const syncWithFirestore = async (currentUser: User) => {
    setSyncing(true);
    const userId = currentUser.uid;
    const path = 'projects';

    try {
      // 1. Fetch current projects from Firestore
      const q = query(collection(db, path), where('ownerId', '==', userId));
      const querySnapshot = await getDocs(q);
      const firestoreProjects: Record<string, ProjectData> = {};
      querySnapshot.forEach((doc) => {
        firestoreProjects[doc.id] = doc.data() as ProjectData;
      });

      // 2. Identify local projects
      const localProjects: Record<string, ProjectData> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('solar_proj_')) {
          const id = key.substring(11);
          try {
            const item = localStorage.getItem(key);
            if (item) {
              localProjects[id] = JSON.parse(item);
            }
          } catch (e) {
            // corrupt local json
          }
        }
      }

      // 3. Migrate any local-only projects to Firestore
      for (const id in localProjects) {
        if (!firestoreProjects[id]) {
          const proj = localProjects[id];
          const docRef = doc(db, 'projects', id);
          await setDoc(docRef, {
            ...proj,
            ownerId: userId,
          });
          firestoreProjects[id] = proj;
        }
      }

      // 4. Save any firestore projects to local storage if they are missing locally
      for (const id in firestoreProjects) {
        if (!localProjects[id]) {
          localStorage.setItem(`solar_proj_${id}`, JSON.stringify(firestoreProjects[id]));
        }
      }

      // 5. Setup realtime listener for any concurrent updates
      const unsubscribeRealtime = onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          const docData = change.doc.data() as ProjectData;
          if (change.type === 'added' || change.type === 'modified') {
            localStorage.setItem(`solar_proj_${change.doc.id}`, JSON.stringify(docData));
          } else if (change.type === 'removed') {
            localStorage.removeItem(`solar_proj_${change.doc.id}`);
          }
        });
        refreshSavedProjectsList();
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'projects');
      });

      refreshSavedProjectsList();
      setSyncing(false);
      return unsubscribeRealtime;
    } catch (error) {
      console.error("Firestore sync error:", error);
      setSyncing(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      showToast('เข้าสู่ระบบและเชื่อมคลาวด์สำเร็จ', 'success');
    } catch (error) {
      showToast('เข้าสู่ระบบไม่สำเร็จ: ' + (error instanceof Error ? error.message : String(error)), 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
    } catch (error) {
      showToast('ออกจากระบบไม่สำเร็จ', 'error');
    }
  };

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
    if (!savedActive) {
      // Seed initial project into local storage as well for the first-time catalog
      const defaultId = initialProject.id;
      localStorage.setItem(`solar_proj_${defaultId}`, JSON.stringify(initialProject));
      localStorage.setItem('solar_active_project', JSON.stringify(initialProject));
      refreshSavedProjectsList();
    }
  }, []);

  // Update active backup and correspond project state inside local storage on every project state change
  useEffect(() => {
    if (project && project.id) {
      localStorage.setItem('solar_active_project', JSON.stringify(project));
      localStorage.setItem(`solar_proj_${project.id}`, JSON.stringify(project));
      refreshSavedProjectsList();

      // Sync active edits to Firestore
      if (auth.currentUser) {
        const docRef = doc(db, 'projects', project.id);
        setDoc(docRef, {
          ...project,
          ownerId: auth.currentUser.uid,
        }).catch((err) => {
          console.warn("Real-time cloud save pending connection:", err);
        });
      }
    }
  }, [project]);

  const refreshSavedProjectsList = () => {
    const list: { id: string; name: string }[] = [];
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('solar_proj_')) {
        const id = key.substring(11);
        try {
          const itemStr = localStorage.getItem(key);
          if (!itemStr) continue;
          const data = JSON.parse(itemStr);
          
          // Identify if it's an untouched "ลูกค้าใหม่" project
          const isUntouchedNewClient = (
            data.customerName === 'ลูกค้าใหม่' &&
            (!data.locations || data.locations.length === 0)
          );

          // We delete empty new clients if they are NOT the currently active project
          if (isUntouchedNewClient && project && id !== project.id) {
            keysToDelete.push(key);
            continue;
          }

          list.push({
            id,
            name: data.customerName || data.projectName || `โครงการ #${id}`,
          });
        } catch (e) {
          // ignore corrupted data
        }
      }
    }

    // Perform deletions and clean up tab IDs
    if (keysToDelete.length > 0) {
      keysToDelete.forEach((key) => {
        localStorage.removeItem(key);
      });
      const deletedIds = keysToDelete.map((key) => key.substring(11));
      setOpenProjectIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
    }

    setSavedProjectsList(list);
  };

  const getProjectName = (id: string) => {
    const found = savedProjectsList.find((p) => p.id === id);
    return found ? found.name : 'โครงการใหม่';
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
        // Add to open tabs
        setOpenProjectIds([...openProjectIds, newId]);
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

  // Switch Tab Handler
  const handleSwitchTab = (id: string) => {
    const key = `solar_proj_${id}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        setProject(JSON.parse(saved));
      } catch (e) {
        showToast('ไม่สามารถโหลดข้อมูลของแท็บนี้ได้', 'error');
      }
    }
  };

  // Close Tab Handler
  const handleCloseTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (openProjectIds.length <= 1) {
      showToast('ไม่สามารถปิดแท็บทั้งหมดได้ อย่างน้อยต้องมีหนึ่งโครงการเปิดอยู่', 'info');
      return;
    }

    const newOpenIds = openProjectIds.filter((tabId) => tabId !== id);
    setOpenProjectIds(newOpenIds);

    if (project.id === id) {
      const nextActiveId = newOpenIds[0];
      const key = `solar_proj_${nextActiveId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          setProject(JSON.parse(saved));
        } catch (err) {
          // fallback
        }
      }
    }
  };

  // 2. Add New Project
  const handleNewProject = () => {
    const newId = `solar-proj-${Date.now()}`;
    const newTemplate: ProjectData = {
      id: newId,
      projectName: `โครงการใหม่ #${openProjectIds.length + 1}`,
      customerName: 'ลูกค้าใหม่',
      projectType: 'Solar Rooftop',
      locations: [],
      contractCapacityTotal: 0,
      actualCapacityTotal: 0,
      contractNumber: `CONT-${Math.floor(1000 + Math.random() * 9000)}`,
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

    localStorage.setItem(`solar_proj_${newId}`, JSON.stringify(newTemplate));

    setProject(newTemplate);
    setOpenProjectIds([...openProjectIds, newId]);
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
        
        // Open the tab if it wasn't already open
        if (!openProjectIds.includes(id)) {
          setOpenProjectIds([...openProjectIds, id]);
        }
        
        showToast(`โหลดโครงการ "${parsed.customerName || parsed.projectName || 'ที่บันทึก'}" เรียบร้อยแล้ว`, 'success');
      } catch (e) {
        showToast('ไม่สามารถอ่านข้อมูลโครงการที่บันทึกได้', 'error');
      }
    }
  };

  // 4. Delete Saved Project from Catalog
  const handleDeleteSavedProject = (id: string) => {
    const projName = getProjectName(id);
    setProjectToDelete({ id, name: projName });
  };

  // Perform the actual deletion after confirmation
  const executeDeleteSavedProject = (id: string) => {
    const key = `solar_proj_${id}`;
    localStorage.removeItem(key);
    refreshSavedProjectsList();
    showToast('ลบโครงการออกจากคลังสำเร็จ', 'info');

    // Delete from Firestore if signed in
    if (auth.currentUser) {
      deleteDoc(doc(db, 'projects', id)).catch((err) => {
        console.warn("Could not sync deletion to cloud:", err);
      });
    }

    const newOpenIds = openProjectIds.filter((tabId) => tabId !== id);
    
    if (newOpenIds.length === 0) {
      const newId = `solar-proj-${Date.now()}`;
      const newTemplate: ProjectData = {
        ...initialProject,
        id: newId,
        projectName: 'โครงการติดตั้งระบบผลิตไฟฟ้าจากพลังงานแสงอาทิตย์ใหม่',
      };
      localStorage.setItem(`solar_proj_${newId}`, JSON.stringify(newTemplate));
      setProject(newTemplate);
      setOpenProjectIds([newId]);
    } else {
      setOpenProjectIds(newOpenIds);
      if (project.id === id) {
        const nextActiveId = newOpenIds[0];
        const nextSaved = localStorage.getItem(`solar_proj_${nextActiveId}`);
        if (nextSaved) {
          try {
            setProject(JSON.parse(nextSaved));
          } catch (e) {
            setProject(initialProject);
          }
        }
      }
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
    setAutoOpenPrint(true);
    setView('dashboard');
    showToast('กำลังแสดงหน้าตัวอย่างและเปิดหน้าต่างสั่งพิมพ์ / บันทึก PDF...', 'success');
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

            {/* Header Right Content Area (Stats & Cloud Sync) */}
            <div className="flex flex-col md:flex-row items-center gap-3 w-full sm:w-auto">
              {/* Quick stats on Header */}
              <div className="flex items-center space-x-4 bg-indigo-950/40 px-4 py-2 rounded-xl border border-indigo-800/30 text-xs w-full justify-between sm:justify-start">
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

              {/* Firebase Sync & Authentication Control */}
              <div className="flex items-center space-x-3 bg-indigo-950/35 px-4 py-2 rounded-xl border border-indigo-800/25 text-xs w-full justify-between sm:justify-start">
                <div className="flex items-center space-x-2 text-left">
                  {syncing ? (
                    <div className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </div>
                  ) : (
                    <span className={`h-2 w-2 rounded-full ${user && !user.isAnonymous ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                  )}
                  <div>
                    <span className="text-slate-400 text-[9px] block">สถานะจัดเก็บข้อมูล (Storage Status)</span>
                    <span className="text-indigo-200 font-bold block">
                      {syncing 
                        ? '🔄 กำลังซิงก์คลาวด์...' 
                        : user && !user.isAnonymous 
                          ? '☁️ ซิงก์บนคลาวด์สำเร็จ' 
                          : '💾 บันทึกในบราวเซอร์ (Local)'}
                    </span>
                  </div>
                </div>
                
                <div className="pl-3 border-l border-indigo-800/50 flex items-center space-x-2">
                  {user && !user.isAnonymous ? (
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="text-amber-400 text-[9px] font-bold block">ผู้ใช้งาน (Google)</span>
                        <span className="text-white block font-medium truncate max-w-[100px]">{user.displayName || user.email}</span>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/20 transition-all cursor-pointer"
                        title="ออกจากระบบ"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleGoogleLogin}
                      className="flex items-center space-x-1.5 px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg shadow transition-all hover:scale-[1.02] cursor-pointer"
                      title="สำรองข้อมูลบนบัญชี Google ของคุณ"
                    >
                      <LogIn className="w-3.5 h-3.5" />
                      <span>ผูกบัญชี Google</span>
                    </button>
                  )}
                </div>
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
        {/* ----------------- PROJECT TABS BAR (HIDDEN IN PRINT) ----------------- */}
        <div className="bg-slate-900 text-slate-100 border-b border-slate-800 print:hidden shadow-inner select-none overflow-x-auto scrollbar-none">
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-2.5 flex items-center justify-between gap-4">
            
            {/* Left section: Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1 flex-1">
              <div className="flex items-center space-x-1.5 text-slate-400 text-xs font-semibold mr-3 flex-shrink-0">
                <FolderSync className="w-4 h-4 text-indigo-400" />
                <span>โครงการที่เปิดอยู่:</span>
              </div>
              
              <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none">
                {openProjectIds.map((id) => {
                  const isActive = project.id === id;
                  const projName = getProjectName(id);
                  
                  return (
                    <div
                      key={id}
                      onClick={() => handleSwitchTab(id)}
                      className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-xl cursor-pointer transition text-xs font-semibold border ${
                        isActive
                          ? 'bg-indigo-600 border-indigo-500 text-white shadow-md shadow-indigo-950/40'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate max-w-[150px] sm:max-w-[220px]">
                        {projName}
                      </span>
                      
                      {/* Close Tab Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedProject(id);
                        }}
                        className={`p-0.5 rounded-md hover:bg-slate-700 transition ${
                          isActive ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-slate-200'
                        }`}
                        title="ลบโครงการและปิดแท็บ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Quick Add Tab Button */}
              <button
                onClick={handleNewProject}
                className="flex items-center justify-center p-2 bg-slate-800 hover:bg-indigo-600 hover:text-white rounded-xl text-slate-300 transition ml-2 flex-shrink-0 border border-slate-700 hover:border-indigo-500"
                title="เพิ่มโครงการใหม่ (เปิดแท็บใหม่)"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Right section: Quick stats */}
            <div className="hidden md:flex items-center space-x-3 text-xs text-slate-400 bg-slate-800/40 px-3 py-1.5 rounded-xl border border-slate-700/30 font-medium">
              <span>กำลังเปิดอยู่ {openProjectIds.length} โครงการ</span>
            </div>

          </div>
        </div>

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
            autoOpenPrint={autoOpenPrint}
            onClearAutoOpenPrint={() => setAutoOpenPrint(false)}
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

      {/* ----------------- CONFIRM DELETE PROJECT MODAL ----------------- */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in print:hidden">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden transform transition-all scale-100">
            {/* Header */}
            <div className="bg-rose-50 px-5 py-4 border-b border-rose-100 flex justify-between items-center">
              <div className="flex items-center space-x-2 text-rose-700">
                <div className="p-1.5 bg-rose-100 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm sm:text-base">ยืนยันการลบโครงการ</span>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-rose-100/50 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              <div className="flex items-start space-x-3 bg-amber-50 border border-amber-200 p-3.5 rounded-xl text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                <div className="text-left text-xs sm:text-sm">
                  <span className="font-bold block">คำเตือนระบบความปลอดภัย</span>
                  <span className="block mt-0.5 text-amber-700 leading-relaxed">
                    การลบโครงการนี้จะทำการลบข้อมูลออกจาก <b>"คลังโครงการที่บันทึกไว้"</b> ในระบบอย่างถาวร และปิดแท็บโครงการนี้ทันที
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">โครงการที่จะลบ:</span>
                <span className="text-sm font-extrabold text-slate-800 block bg-slate-50 px-3.5 py-3 rounded-xl border border-slate-200/60 truncate">
                  {projectToDelete.name}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 px-5 py-3.5 border-t border-slate-100 flex justify-end items-center space-x-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={() => {
                  executeDeleteSavedProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm hover:shadow transition flex items-center space-x-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ยืนยันการลบโครงการ</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
