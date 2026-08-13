"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Trash2, CheckCircle, MousePointer, Loader2 } from "lucide-react";

interface Box {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  source: "ai" | "manual";
}

interface PageData {
  page_number: number;
  page_image_path: string;
  boxes: { x1: number; y1: number; x2: number; y2: number }[];
}

export default function ReviewPage() {
  const router = useRouter();
  const [pdfId, setPdfId] = useState<number | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [boxes, setBoxes] = useState<Box[]>([]);
  
  // Drawing state
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [currentBox, setCurrentBox] = useState<Box | null>(null);
  const [imageDimensions, setImageDimensions] = useState({ width: 1, height: 1 });
  const [hoveredBoxId, setHoveredBoxId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // New State for the Success Overlay
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(false);
  
  const imageRef = useRef<HTMLImageElement>(null);

  // Load data from session storage on mount
  useEffect(() => {
    const rawData = sessionStorage.getItem("pdfProcessingData");
    if (!rawData) {
      router.push("/");
      return;
    }
    const parsedData = JSON.parse(rawData);
    setPdfId(parsedData.pdf_id);
    setPages(parsedData.pages);
    loadBoxesForPage(parsedData.pages[0]);
  }, [router]);

  const loadBoxesForPage = (page: PageData) => {
    const formattedBoxes = page.boxes.map((b, i) => ({
      ...b,
      id: `ai-${i}`,
      source: "ai" as const,
    }));
    setBoxes(formattedBoxes);
  };

  // --- DRAWING LOGIC ---
  const handleMouseDown = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawingMode || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentBox({ id: `manual-${Date.now()}`, x1: x, y1: y, x2: x, y2: y, source: "manual" });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLImageElement>) => {
    if (!isDrawing || !currentBox || !imageRef.current) return;
    
    const rect = imageRef.current.getBoundingClientRect();
    const scaleX = imageRef.current.naturalWidth / rect.width;
    const scaleY = imageRef.current.naturalHeight / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;
    
    setCurrentBox({
      ...currentBox,
      x1: Math.min(startPos.x, currentX),
      y1: Math.min(startPos.y, currentY),
      x2: Math.max(startPos.x, currentX),
      y2: Math.max(startPos.y, currentY),
    });
  };

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;
    
    if (currentBox.x2 - currentBox.x1 > 20 && currentBox.y2 - currentBox.y1 > 20) {
      setBoxes([...boxes, currentBox]);
    }
    
    setIsDrawing(false);
    setCurrentBox(null);
  };

  const deleteBox = (idToRemove: string) => {
    setBoxes(boxes.filter((b) => b.id !== idToRemove));
    // NEW: Clear the hover state if we just deleted the hovered item
    if (hoveredBoxId === idToRemove) {
      setHoveredBoxId(null);
    }
  };

  // --- SUBMIT LOGIC ---
  const handleApprovePage = async () => {
    if (!pdfId || pages.length === 0) return;
    setLoading(true);

    const currentPage = pages[currentPageIndex];
    const payload = {
      pdf_id: pdfId,
      page_number: currentPage.page_number,
      page_image_path: currentPage.page_image_path,
      boxes: boxes.map((b) => ({ x1: Math.round(b.x1), y1: Math.round(b.y1), x2: Math.round(b.x2), y2: Math.round(b.y2) }))
    };

    try {
      await axios.post("http://localhost:8000/api/ingestion/confirm-crops", payload);
      
      if (currentPageIndex < pages.length - 1) {
        const nextIndex = currentPageIndex + 1;
        setCurrentPageIndex(nextIndex);
        loadBoxesForPage(pages[nextIndex]);
        setHoveredBoxId(null); // <--- NEW: Reset hover state for the new page
        setLoading(false);
      } else {
        // Trigger the beautiful success overlay instead of the alert
        setShowSuccessOverlay(true);
        // Wait 2 seconds, then automatically transition
        setTimeout(() => {
          router.push("/metadata"); 
        }, 2000);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to confirm crops.");
      setLoading(false);
    }
  };

  if (pages.length === 0) return <div className="p-10">Loading...</div>;

  const currentPage = pages[currentPageIndex];

  return (
    <div className="flex h-screen bg-brand-light relative">
      
      {/* LEFT: IMAGE CANVAS */}
      <div className="flex-1 p-6 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-4 bg-brand-white p-4 rounded-xl shadow-sm border border-gray-100">
          <h2 className="text-xl font-bold text-brand-dark">
            Reviewing Page {currentPageIndex + 1} of {pages.length}
          </h2>
          <button
            onClick={() => setIsDrawingMode(!isDrawingMode)}
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
              isDrawingMode ? "bg-brand-blue text-brand-white" : "bg-gray-100 text-brand-dark hover:bg-gray-200"
            }`}
          >
            <MousePointer className="w-5 h-5 mr-2" />
            {isDrawingMode ? "Drawing Mode Active" : "+ Draw Manual Box"}
          </button>
        </div>

        <div className="flex-1 bg-brand-white rounded-xl shadow-sm border border-gray-100 overflow-auto relative flex justify-center items-start p-4 cursor-crosshair">
          <div className="relative inline-block select-none">
            <img
                ref={imageRef}
                src={`http://localhost:8000/${currentPage.page_image_path}`}
                alt={`Page ${currentPage.page_number}`}
                className="max-w-full h-auto shadow-sm"
                draggable="false"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onLoad={(e) => {
                    setImageDimensions({
                    width: e.currentTarget.naturalWidth,
                    height: e.currentTarget.naturalHeight
                    });
                }}
                />

            {boxes.map((box, index) => {
              const isHovered = hoveredBoxId === box.id;
              return (
                <div
                  key={box.id}
                  className={`absolute border-[3px] pointer-events-none transition-all flex items-start justify-start ${
                    isHovered 
                      ? "border-brand-peach bg-brand-peach/30 z-50 shadow-lg" 
                      : box.source === "ai" 
                        ? "border-green-500 bg-green-500/10" 
                        : "border-brand-blue bg-brand-blue/10"
                  }`}
                  style={{
                    left: `${(box.x1 / imageDimensions.width) * 100}%`,
                    top: `${(box.y1 / imageDimensions.height) * 100}%`,
                    width: `${((box.x2 - box.x1) / imageDimensions.width) * 100}%`,
                    height: `${((box.y2 - box.y1) / imageDimensions.height) * 100}%`,
                  }}
                >
                  <span 
                    className={`text-xs font-bold px-1.5 py-0.5 text-white ${
                      isHovered ? 'bg-brand-peach text-brand-dark' : 
                      box.source === 'ai' ? 'bg-green-500' : 'bg-brand-blue'
                    }`}
                  >
                    #{index + 1}
                  </span>
                </div>
              );
            })}

            {currentBox && (
              <div
                  className="absolute border-[3px] border-brand-peach bg-brand-peach/20 pointer-events-none"
                  style={{
                  left: `${(currentBox.x1 / imageDimensions.width) * 100}%`,
                  top: `${(currentBox.y1 / imageDimensions.height) * 100}%`,
                  width: `${((currentBox.x2 - currentBox.x1) / imageDimensions.width) * 100}%`,
                  height: `${((currentBox.y2 - currentBox.y1) / imageDimensions.height) * 100}%`,
                  }}
              />
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: SIDEBAR */}
      <div className="w-96 bg-brand-white border-l border-gray-200 p-6 flex flex-col h-full shadow-lg z-10">
        <h3 className="text-lg font-bold text-brand-dark mb-4">Detected Items ({boxes.length})</h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
          {boxes.map((box, index) => (
            <div 
              key={box.id} 
              className={`p-3 rounded-lg border flex justify-between items-center transition-colors cursor-default ${
                hoveredBoxId === box.id ? 'bg-brand-peach/20 border-brand-peach' : 'bg-brand-light border-gray-100'
              }`}
              onMouseEnter={() => setHoveredBoxId(box.id)}
              onMouseLeave={() => setHoveredBoxId(null)}
            >
              <div>
                <p className="font-semibold text-brand-dark">Item #{index + 1}</p>
                <p className="text-xs text-gray-500 uppercase font-medium mt-1">
                  {box.source === "ai" ? "Auto-Detected" : "Manual Draw"}
                </p>
              </div>
              <button
                onClick={() => deleteBox(box.id)}
                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                title="Delete this item"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {boxes.length === 0 && (
            <p className="text-sm text-gray-400 italic text-center mt-10">No items detected. Draw a box to add one.</p>
          )}
        </div>

        <button
          onClick={handleApprovePage}
          disabled={loading || boxes.length === 0}
          className="mt-6 w-full bg-brand-blue text-brand-white py-4 rounded-xl font-bold flex items-center justify-center hover:bg-blue-600 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <CheckCircle className="w-6 h-6 mr-2" />
              Approve Page & Crop
            </>
          )}
        </button>
      </div>

      {/* THE NEW SUCCESS OVERLAY */}
      {showSuccessOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity">
          <div className="bg-white p-10 rounded-2xl shadow-2xl flex flex-col items-center transform scale-100 transition-transform">
            <div className="relative mb-6">
              <CheckCircle className="w-20 h-20 text-green-500" />
              <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-1 shadow-sm border border-gray-100">
                <Loader2 className="w-6 h-6 animate-spin text-brand-blue" />
              </div>
            </div>
            <h2 className="text-2xl font-bold text-brand-dark mb-2">All Pages Approved!</h2>
            <p className="text-gray-500 font-medium">Auto-cropping images and loading metadata queue...</p>
          </div>
        </div>
      )}
      
    </div>
  );
}