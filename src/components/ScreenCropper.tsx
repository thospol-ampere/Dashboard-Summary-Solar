import React, { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';
import { Camera, Crop, Download, X, Loader2, Sparkles, Image, Check, ChevronRight } from 'lucide-react';

interface ScreenCropperProps {
  targetElementId: string;
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

interface ImageBounds {
  left: number;
  top: number;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
}

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface DragState {
  startX: number;
  startY: number;
  startBox: CropBox;
  handle: string;
}

export const ScreenCropper: React.FC<ScreenCropperProps> = ({
  targetElementId,
  isOpen,
  onClose,
  showToast,
}) => {
  const [step, setStep] = useState<'init' | 'capturing' | 'cropping'>('init');
  const [captureMode, setCaptureMode] = useState<'visible' | 'long'>('visible');
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [exportFormat, setExportFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
  const [isExporting, setIsExporting] = useState(false);

  // Dragging state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageBounds, setImageBounds] = useState<ImageBounds>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
    naturalWidth: 0,
    naturalHeight: 0,
  });
  const [cropBox, setCropBox] = useState<CropBox>({ x: 0, y: 0, w: 0, h: 0 });
  const [dragState, setDragState] = useState<DragState | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasSourceRef = useRef<HTMLCanvasElement | null>(null);

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setStep('init');
      setCapturedImageUrl(null);
      setImageLoaded(false);
      setDragState(null);
    }
  }, [isOpen]);

  // Handle image load to calculate boundaries and scale
  const handleImageLoaded = () => {
    const img = imageRef.current;
    if (!img) return;

    // Wait slightly to ensure layouts are stable
    setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      const imageRatio = naturalWidth / naturalHeight;
      const containerRatio = containerWidth / containerHeight;

      let displayWidth = containerWidth;
      let displayHeight = containerHeight;

      if (imageRatio > containerRatio) {
        // Width constrained
        displayWidth = containerWidth;
        displayHeight = containerWidth / imageRatio;
      } else {
        // Height constrained
        displayHeight = containerHeight;
        displayWidth = containerHeight * imageRatio;
      }

      const left = (containerWidth - displayWidth) / 2;
      const top = (containerHeight - displayHeight) / 2;

      setImageBounds({
        left,
        top,
        width: displayWidth,
        height: displayHeight,
        naturalWidth,
        naturalHeight,
      });

      // Initialize default crop box at 80% centered
      setCropBox({
        x: displayWidth * 0.1,
        y: displayHeight * 0.1,
        w: displayWidth * 0.8,
        h: displayHeight * 0.8,
      });

      setImageLoaded(true);
    }, 100);
  };

  // Drag handlers
  const handleDragStart = (e: React.MouseEvent, handle: string) => {
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    setDragState({
      startX,
      startY,
      startBox: { ...cropBox },
      handle,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, handle: string) => {
    if (e.touches.length === 0) return;
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    setDragState({
      startX,
      startY,
      startBox: { ...cropBox },
      handle,
    });
  };

  // Global mouse/touch move and up listeners
  useEffect(() => {
    if (!dragState) return;

    const handleGlobalMove = (clientX: number, clientY: number) => {
      const { startX, startY, startBox, handle } = dragState;
      const dx = clientX - startX;
      const dy = clientY - startY;

      let { x, y, w, h } = startBox;
      const minSize = 40; // Minimum crop size

      if (handle === 'move') {
        x = startBox.x + dx;
        y = startBox.y + dy;

        // Boundaries checks
        if (x < 0) x = 0;
        if (y < 0) y = 0;
        if (x + w > imageBounds.width) x = imageBounds.width - w;
        if (y + h > imageBounds.height) y = imageBounds.height - h;
      } else {
        // Resizing handles
        if (handle.includes('left')) {
          const nextW = startBox.w - dx;
          const nextX = startBox.x + dx;
          if (nextW >= minSize && nextX >= 0) {
            x = nextX;
            w = nextW;
          }
        }
        if (handle.includes('right')) {
          const nextW = startBox.w + dx;
          if (nextW >= minSize && startBox.x + nextW <= imageBounds.width) {
            w = nextW;
          }
        }
        if (handle.includes('top')) {
          const nextH = startBox.h - dy;
          const nextY = startBox.y + dy;
          if (nextH >= minSize && nextY >= 0) {
            y = nextY;
            h = nextH;
          }
        }
        if (handle.includes('bottom')) {
          const nextH = startBox.h + dy;
          if (nextH >= minSize && startBox.y + nextH <= imageBounds.height) {
            h = nextH;
          }
        }
      }

      setCropBox({ x, y, w, h });
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleGlobalMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 0) return;
      handleGlobalMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const handleGlobalUp = () => {
      setDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleGlobalUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleGlobalUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleGlobalUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleGlobalUp);
    };
  }, [dragState, imageBounds]);

  // Recalculate on window resize
  useEffect(() => {
    if (step === 'cropping' && capturedImageUrl) {
      const handleResize = () => {
        handleImageLoaded();
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, [step, capturedImageUrl]);

  // Trigger Capture using html2canvas
  const handleCapture = async () => {
    setStep('capturing');
    showToast('กำลังประมวลผลเตรียมจับภาพ...', 'info');

    // Slight timeout to let UI update and loader show
    await new Promise((resolve) => setTimeout(resolve, 600));

    try {
      const element = document.getElementById(targetElementId);
      if (!element) {
        throw new Error('ไม่พบองค์ประกอบของหน้าจอสำหรับการจับภาพ');
      }

      // Configure capture options
      // If full long screenshot is selected, we temporarily clear maximum height styles if any,
      // or we use element scroll height.
      const originalStyle = element.style.maxHeight;
      if (captureMode === 'long') {
        element.style.maxHeight = 'none';
      }

      const canvas = await html2canvas(element, {
        useCORS: true,
        allowTaint: true,
        scale: 2, // High resolution scale factor
        backgroundColor: '#030712', // matches dark slate theme
        logging: false,
        height: captureMode === 'long' ? element.scrollHeight : undefined,
        windowHeight: captureMode === 'long' ? element.scrollHeight : undefined,
      });

      // Restore original height style
      if (captureMode === 'long') {
        element.style.maxHeight = originalStyle;
      }

      canvasSourceRef.current = canvas;
      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImageUrl(dataUrl);
      setStep('cropping');
      showToast('จับภาพสำเร็จ! ลากจุดควบคุมเพื่อครอบตัดพื้นที่ที่ต้องการได้เลย', 'success');
    } catch (error: any) {
      console.error(error);
      setStep('init');
      showToast(error.message || 'เกิดข้อผิดพลาดในการจับภาพหน้าจอ', 'error');
    }
  };

  // Perform final crop and download
  const handleConfirmCrop = async () => {
    if (!canvasSourceRef.current || !imageBounds) return;

    setIsExporting(true);
    showToast('กำลังตัดภาพและบันทึกไฟล์...', 'info');

    // Async pause to let loader show
    await new Promise((resolve) => setTimeout(resolve, 300));

    try {
      const scaleX = imageBounds.naturalWidth / imageBounds.width;
      const scaleY = imageBounds.naturalHeight / imageBounds.height;

      // Extract original pixel values
      const sourceX = cropBox.x * scaleX;
      const sourceY = cropBox.y * scaleY;
      const sourceW = cropBox.w * scaleX;
      const sourceH = cropBox.h * scaleY;

      // Create destination canvas
      const destCanvas = document.createElement('canvas');
      destCanvas.width = sourceW;
      destCanvas.height = sourceH;

      const ctx = destCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not create 2D context');

      // Draw cropped area
      ctx.drawImage(
        canvasSourceRef.current,
        sourceX,
        sourceY,
        sourceW,
        sourceH,
        0,
        0,
        sourceW,
        sourceH
      );

      // Determine mime type and file extension
      let mimeType = 'image/png';
      let fileExt = 'png';
      if (exportFormat === 'jpeg') {
        mimeType = 'image/jpeg';
        fileExt = 'jpg';
      } else if (exportFormat === 'webp') {
        mimeType = 'image/webp';
        fileExt = 'webp';
      }

      // Convert to image data URL and trigger download
      const croppedDataUrl = destCanvas.toDataURL(mimeType, 0.95);
      
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.download = `SolarDashboard_Crop_${timestamp}.${fileExt}`;
      link.href = croppedDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast(`บันทึกภาพสำเร็จในรูปแบบ ${exportFormat.toUpperCase()} เรียบร้อยแล้ว!`, 'success');
      onClose();
    } catch (err: any) {
      console.error(err);
      showToast('ไม่สามารถครอบตัดรูปภาพได้', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto print:hidden">
      
      {/* Container Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col overflow-hidden max-h-[92vh] animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-500">
              <Crop className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm md:text-base">เครื่องมือครอบตัดรูปภาพ (Interactive Image Cropper)</h3>
              <p className="text-[10px] md:text-xs text-slate-400">จับภาพแดชบอร์ด ครอบตัดเลือกพื้นที่ และบันทึกเป็นนามสกุลที่ต้องการ</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition"
            disabled={step === 'capturing' || isExporting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dynamic Step Viewports */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col min-h-0">
          
          {/* STEP 1: INITIAL CHOOSE CAPTURE MODE */}
          {step === 'init' && (
            <div className="flex-1 flex flex-col items-center justify-center py-8 max-w-lg mx-auto text-center space-y-6">
              <div className="w-16 h-16 bg-indigo-600/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 animate-bounce">
                <Camera className="w-8 h-8" />
              </div>
              
              <div className="space-y-2">
                <h4 className="text-base font-bold text-slate-200">เลือกรูปแบบการจับภาพแดชบอร์ด</h4>
                <p className="text-xs text-slate-400">คุณสามารถเลือกจับภาพแบบพอดีหน้าจอ หรือจับภาพแดชบอร์ดทั้งหมดแบบแนวยาว</p>
              </div>

              {/* Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                
                {/* Mode 1: Visible Area */}
                <div 
                  onClick={() => setCaptureMode('visible')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col items-center space-y-2.5 text-center ${
                    captureMode === 'visible' 
                      ? 'bg-indigo-600/10 border-indigo-500 text-white shadow-lg' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${captureMode === 'visible' ? 'bg-indigo-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs block">พื้นที่ที่มองเห็น (Visible Area)</span>
                    <span className="text-[10px] text-slate-400 block mt-1">จับเฉพาะสัดส่วนแดชบอร์ดที่พอดีหน้าจอขณะนี้</span>
                  </div>
                </div>

                {/* Mode 2: Long Screen */}
                <div 
                  onClick={() => setCaptureMode('long')}
                  className={`p-4 rounded-xl border cursor-pointer transition flex flex-col items-center space-y-2.5 text-center ${
                    captureMode === 'long' 
                      ? 'bg-amber-500/10 border-amber-500 text-white shadow-lg' 
                      : 'bg-slate-800/40 border-slate-700/60 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${captureMode === 'long' ? 'bg-amber-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    <Image className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-semibold text-xs block">จับภาพแบบยาว (Long Screenshot)</span>
                    <span className="text-[10px] text-slate-400 block mt-1">จับภาพรายละเอียดทั้งหมดหัวจรดท้ายความยาว</span>
                  </div>
                </div>

              </div>

              {/* Start capture button */}
              <button
                onClick={handleCapture}
                className="w-full flex items-center justify-center space-x-2 py-3 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-950/40 cursor-pointer active:scale-95 transition-transform"
              >
                <span>เริ่มกระบวนการจับภาพ</span>
                <ChevronRight className="w-4 h-4" />
              </button>

            </div>
          )}

          {/* STEP 2: CAPTURING LOADER */}
          {step === 'capturing' && (
            <div className="flex-1 flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <div className="text-center space-y-1">
                <span className="font-bold text-slate-200 text-xs block">กำลังถ่ายภาพแดชบอร์ดความละเอียดสูง...</span>
                <span className="text-[10px] text-slate-400 block">กรุณาอย่าขยับหรือปิดหน้าต่างโปรแกรมในขณะนี้</span>
              </div>
            </div>
          )}

          {/* STEP 3: CROPPING AREA */}
          {step === 'cropping' && capturedImageUrl && (
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
              
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                  <span className="font-semibold text-slate-300">เตรียมจับภาพสำเร็จ!</span>
                  <span>ลากที่จับทั้ง 8 มุม/ด้าน เพื่อครอบตัดขนาดภาพ</span>
                </div>
                <div className="font-mono bg-slate-950 px-2 py-1 rounded border border-slate-800 text-slate-300">
                  ขนาดครอบตัด: {Math.round(cropBox.w * (imageBounds.naturalWidth / imageBounds.width))} x {Math.round(cropBox.h * (imageBounds.naturalHeight / imageBounds.height))} px
                </div>
              </div>

              {/* Interactive Cropping Image Container */}
              <div className="flex-1 flex items-center justify-center min-h-0 relative bg-slate-950/50 border border-slate-800 rounded-xl overflow-hidden py-4">
                
                <div 
                  ref={containerRef} 
                  className="relative select-none max-h-[50vh] max-w-full flex items-center justify-center"
                >
                  <img
                    ref={imageRef}
                    src={capturedImageUrl}
                    alt="Captured screen to crop"
                    onLoad={handleImageLoaded}
                    className="max-h-[50vh] max-w-full object-contain"
                    draggable={false}
                  />

                  {/* Dark mask overlays */}
                  {imageLoaded && (
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: imageBounds.left,
                        top: imageBounds.top,
                        width: imageBounds.width,
                        height: imageBounds.height,
                      }}
                    >
                      {/* Top Mask */}
                      <div className="absolute bg-black/65 inset-x-0 top-0 pointer-events-auto" style={{ height: cropBox.y }} />
                      
                      {/* Bottom Mask */}
                      <div className="absolute bg-black/65 inset-x-0 bottom-0 pointer-events-auto" style={{ top: cropBox.y + cropBox.h }} />
                      
                      {/* Left Mask */}
                      <div className="absolute bg-black/65 left-0 pointer-events-auto" style={{ top: cropBox.y, height: cropBox.h, width: cropBox.x }} />
                      
                      {/* Right Mask */}
                      <div className="absolute bg-black/65 right-0 pointer-events-auto" style={{ top: cropBox.y, height: cropBox.h, left: cropBox.x + cropBox.w }} />

                      {/* Interactive Crop Box Overlay */}
                      <div
                        className="absolute border-2 border-dashed border-amber-500 cursor-move pointer-events-auto shadow-[0_0_20px_rgba(245,158,11,0.35)]"
                        style={{
                          left: cropBox.x,
                          top: cropBox.y,
                          width: cropBox.w,
                          height: cropBox.h,
                        }}
                        onMouseDown={(e) => handleDragStart(e, 'move')}
                        onTouchStart={(e) => handleTouchStart(e, 'move')}
                      >
                        {/* 3x3 Grid Lines inside crop box */}
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-25 pointer-events-none">
                          <div className="border-r border-b border-amber-400" />
                          <div className="border-r border-b border-amber-400" />
                          <div className="border-b border-amber-400" />
                          <div className="border-r border-b border-amber-400" />
                          <div className="border-r border-b border-amber-400" />
                          <div className="border-b border-amber-400" />
                          <div className="border-r border-amber-400" />
                          <div className="border-r border-amber-400" />
                          <div className="pointer-events-none" />
                        </div>

                        {/* 8 Drag Handles */}
                        {/* Top Left Corner */}
                        <div
                          className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nwse-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'top-left'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'top-left'); }}
                        />
                        {/* Top Right Corner */}
                        <div
                          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nesw-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'top-right'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'top-right'); }}
                        />
                        {/* Bottom Left Corner */}
                        <div
                          className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nesw-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'bottom-left'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'bottom-left'); }}
                        />
                        {/* Bottom Right Corner */}
                        <div
                          className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-nwse-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'bottom-right'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'bottom-right'); }}
                        />

                        {/* Top Center Edge */}
                        <div
                          className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4.5 h-2 bg-amber-400 border-2 border-slate-900 rounded-full cursor-ns-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'top'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'top'); }}
                        />
                        {/* Bottom Center Edge */}
                        <div
                          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-4.5 h-2 bg-amber-400 border-2 border-slate-900 rounded-full cursor-ns-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'bottom'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'bottom'); }}
                        />
                        {/* Left Center Edge */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-4.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-ew-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'left'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'left'); }}
                        />
                        {/* Right Center Edge */}
                        <div
                          className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-4.5 bg-amber-400 border-2 border-slate-900 rounded-full cursor-ew-resize z-50 hover:bg-white transition-colors"
                          onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'right'); }}
                          onTouchStart={(e) => { e.stopPropagation(); handleTouchStart(e, 'right'); }}
                        />

                        {/* Center Visual Pointer */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 border border-white/50 rounded-full pointer-events-none" />
                      </div>
                    </div>
                  )}

                </div>
              </div>

              {/* Crop Controls Footer Section */}
              <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                
                {/* Left side: Export Format Selector */}
                <div className="flex items-center space-x-2.5 w-full sm:w-auto">
                  <span className="text-slate-400 text-xs font-semibold whitespace-nowrap">นามสกุลรูปภาพ:</span>
                  <div className="bg-slate-900 p-1 rounded-xl flex items-center border border-slate-800 w-full sm:w-auto">
                    {(['png', 'jpeg', 'webp'] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => setExportFormat(format)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition flex-1 sm:flex-initial ${
                          exportFormat === format
                            ? 'bg-amber-500 text-slate-950'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        .{format}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Right side: Action buttons */}
                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={() => setStep('init')}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold border border-slate-850 transition w-full sm:w-auto"
                    disabled={isExporting}
                  >
                    กลับไปเลือกโหมด
                  </button>
                  <button
                    onClick={handleConfirmCrop}
                    disabled={isExporting || !imageLoaded}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-600/50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-950/30 w-full sm:w-auto"
                  >
                    {isExporting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>กำลังประมวลผล...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>ยืนยันและดาวน์โหลดภาพ</span>
                      </>
                    )}
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
};
