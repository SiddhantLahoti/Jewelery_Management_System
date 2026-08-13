"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Save, AlertCircle } from "lucide-react";

// --- Types ---
interface PendingProduct {
  id: number;
  cropped_image_path: string;
}

interface DropdownOption {
  id: number;
  name: string;
}

const getEmptyForm = () => ({
  style_number: "", main_category_id: "", category_ids: [] as number[], subcategory_1_ids: [] as number[],
  subcategory_2_ids: [] as number[], diamond_type_id: "", shape_ids: [] as number[], cut_ids: [] as number[],
  colour_stone_ids: [] as number[], market_id: "", metal_type_id: "", designer_id: "", total_weight: "", metal_weight: "",
});

export default function MetadataPage() {
  // Queue & Draft State
  const [queue, setQueue] = useState<PendingProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  
  // The Background Memory Bank
  const [drafts, setDrafts] = useState<Record<number, any>>({}); 

  // Master Dropdown Data
  const [masterData, setMasterData] = useState<any>({});
  
  // Cascading Dropdown Data
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [sub1, setSub1] = useState<DropdownOption[]>([]);
  const [sub2, setSub2] = useState<DropdownOption[]>([]);

  // Form State
  const [formData, setFormData] = useState(getEmptyForm());

  // 1. Initial Load: Fetch Queue, Master Dropdowns, AND LocalStorage Drafts
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [queueRes, masterRes] = await Promise.all([
          axios.get("http://localhost:8000/api/metadata/pending-products"),
          axios.get("http://localhost:8000/api/metadata/dropdowns/master")
        ]);
        setQueue(queueRes.data);
        setMasterData(masterRes.data);

        // --- NEW: Restore Bulletproof Auto-Saves from Browser Memory ---
        const savedDrafts = localStorage.getItem("jewelryMetadataDrafts");
        if (savedDrafts) {
          const parsedDrafts = JSON.parse(savedDrafts);
          setDrafts(parsedDrafts);
          
          // Pre-load the draft for the very first item if it exists
          if (queueRes.data.length > 0) {
            const firstId = queueRes.data[0].id;
            if (parsedDrafts[firstId]) {
              setFormData(parsedDrafts[firstId]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setLoadingQueue(false);
      }
    };
    fetchInitialData();
  }, []);

  // --- NEW: Invisible Auto-Save Trigger ---
  // Every time formData changes, save it straight to the browser's hard drive
  useEffect(() => {
    if (queue.length > 0 && currentIndex < queue.length) {
      const currentId = queue[currentIndex].id;
      
      // Only auto-save if they've actually typed something (prevents saving blank forms)
      const hasData = formData.style_number || formData.main_category_id || formData.category_ids.length > 0;
      
      if (hasData) {
        setDrafts((prev) => {
          const updated = { ...prev, [currentId]: formData };
          localStorage.setItem("jewelryMetadataDrafts", JSON.stringify(updated));
          return updated;
        });
      }
    }
  }, [formData]);

  // 2. Cascade Logic: When Main Category changes, fetch Categories
  useEffect(() => {
    if (!formData.main_category_id) {
      setCategories([]);
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/categories`, {
      params: { main_category_id: formData.main_category_id }
    }).then(res => setCategories(res.data));
  }, [formData.main_category_id]);

  // 3. Cascade Logic: When Categories change, fetch Subcategories
  useEffect(() => {
    if (formData.category_ids.length === 0) {
      setSub1([]);
      setSub2([]);
      return;
    }
    const params = new URLSearchParams();
    formData.category_ids.forEach(id => params.append("category_ids", id.toString()));

    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories1?${params.toString()}`)
      .then(res => setSub1(res.data));
      
    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories2?${params.toString()}`)
      .then(res => setSub2(res.data));
  }, [formData.category_ids]);

  // --- Handlers ---

  const handleMultiSelect = (field: string, id: number, max: number = 3) => {
    setFormData(prev => {
      const currentSelected = prev[field as keyof typeof prev] as number[];
      if (currentSelected.includes(id)) {
        return { ...prev, [field]: currentSelected.filter(item => item !== id) };
      } else {
        if (currentSelected.length >= max) return prev;
        return { ...prev, [field]: [...currentSelected, id] };
      }
    });
  };

  const handleJumpToItem = (idx: number) => {
    if (idx === currentIndex) return;

    // Check memory bank for the next item's draft, or load a clean slate
    const nextProductId = queue[idx].id;
    setCurrentIndex(idx);
    
    setFormData(drafts[nextProductId] || getEmptyForm());
    setErrorBanner(null);
  };

  const handleSubmit = async () => {
    setErrorBanner(null);
    
    if (!(formData as any).style_number || !(formData as any).main_category_id) {
      setErrorBanner("Style Number and Main Category are required fields.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const parseId = (val: any) => {
      if (!val || val === "" || val === "0") return null;
      const num = Number(val);
      return isNaN(num) ? null : num;
    };

    const parseWeight = (val: any) => {
      if (val === "" || val === null || val === undefined) return null;
      const num = parseFloat(val);
      return isNaN(num) ? null : num;
    };

    const data = formData as any;
    const currentItem = queue[currentIndex];

    const payload = {
      cropped_product_id: currentItem ? currentItem.id : null, 
      style_number: data.style_number.trim(),
      main_category_id: Number(data.main_category_id),
      category_ids: data.category_ids || [],
      subcategory_1_ids: data.subcategory_1_ids || [],
      subcategory_2_ids: data.subcategory_2_ids || [],
      diamond_type_id: parseId(data.diamond_type_id),
      shape_ids: data.shape_ids || [],
      cut_ids: data.cut_ids || [],
      colour_stone_ids: data.colour_stone_ids || [],
      market_id: parseId(data.market_id),
      metal_type_id: parseId(data.metal_type_id),
      designer_id: parseId(data.designer_id),
      total_weight: parseWeight(data.total_weight),
      metal_weight: parseWeight(data.metal_weight),
    };

    try {
      await axios.post("http://localhost:8000/api/metadata/submit", payload);
      
      // Clean up drafts memory and remove the submitted item entirely
      const currentId = currentItem.id;
      setDrafts(prev => {
        const updated = { ...prev };
        delete updated[currentId];
        localStorage.setItem("jewelryMetadataDrafts", JSON.stringify(updated)); // Delete the draft from hard drive too
        return updated;
      });

      const newQueue = queue.filter((_, idx) => idx !== currentIndex);
      setQueue(newQueue);

      // Determine next logical item
      let nextIndex = currentIndex;
      if (newQueue.length > 0 && currentIndex >= newQueue.length) {
        nextIndex = newQueue.length - 1;
      }
      setCurrentIndex(nextIndex);

      // Pre-load the draft for the new active item, or reset if blank
      if (newQueue.length > 0) {
        const nextProductId = newQueue[nextIndex].id;
        
        // Ensure we fetch from the freshest drafts state
        const currentDrafts = JSON.parse(localStorage.getItem("jewelryMetadataDrafts") || "{}");
        setFormData(currentDrafts[nextProductId] || getEmptyForm());
      }

    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMessage = "Failed to submit product metadata.";

      if (typeof detail === "string") {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => {
          const fieldName = d.loc && d.loc.length > 0 ? d.loc[d.loc.length - 1] : "field";
          return `Field "${fieldName}": ${d.msg}`;
        }).join(" | ");
      } else if (typeof detail === "object" && detail !== null) {
        errorMessage = detail.msg || JSON.stringify(detail);
      }

      setErrorBanner(errorMessage);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- UI Components ---

  const renderMultiSelectPills = (options: DropdownOption[], field: string, max: number = 3) => {
    if (!options || options.length === 0) return <p className="text-xs text-gray-400">Select parent category first.</p>;
    
    const selectedArray = formData[field as keyof typeof formData] as number[];
    const isMaxedOut = selectedArray.length >= max;

    return (
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
        {options.map(opt => {
          const isSelected = selectedArray.includes(opt.id);
          const isDisabled = !isSelected && isMaxedOut;
          
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => handleMultiSelect(field, opt.id, max)}
              disabled={isDisabled}
              className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-all ${
                isSelected 
                  ? "bg-brand-blue border-brand-blue text-white shadow-sm" 
                  : isDisabled
                    ? "bg-gray-50 border-gray-200 text-gray-300 cursor-not-allowed"
                    : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach hover:bg-brand-peach/10"
              }`}
            >
              {opt.name}
            </button>
          );
        })}
      </div>
    );
  };

  if (loadingQueue) return <div className="p-10 text-center text-gray-500">Loading pending items...</div>;
  
  if (queue.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen bg-brand-light">
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold text-brand-dark">You're all caught up!</h2>
      <p className="text-gray-500 mt-2">There are no pending items waiting for metadata.</p>
    </div>
  );

  const currentProduct = queue[currentIndex];

  return (
    <div className="flex h-screen bg-brand-light font-sans overflow-hidden">
      
      {/* LEFT: Sidebar with Main Image & Vertical Interactive Queue */}
      <div className="w-80 p-4 flex flex-col border-r border-gray-200 bg-white shadow-sm z-10">
        
        {/* Shrunk Main Image Preview */}
        <div className="h-56 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-center p-2 relative overflow-hidden mb-4 shrink-0">
          <img 
            src={`http://localhost:8000/${currentProduct.cropped_image_path}`} 
            alt="Cropped Jewelry" 
            className="max-w-full max-h-full object-contain drop-shadow-sm rounded-lg"
          />
        </div>

        {/* FULL Vertical Interactive Queue */}
        <div className="mb-2 flex-1 flex flex-col min-h-0">
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pending Queue</span>
            <span className="text-xs font-bold text-brand-blue bg-blue-50 px-2 py-0.5 rounded-md">{queue.length} Total</span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {queue.map((item, idx) => {
              const isCurrent = idx === currentIndex;
              const hasDraft = !!drafts[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => handleJumpToItem(idx)}
                  className={`w-full border rounded-xl p-2 flex items-center transition-all text-left group ${
                    isCurrent
                      ? "bg-brand-peach/10 border-brand-peach shadow-sm"
                      : hasDraft 
                        ? "bg-blue-50/30 hover:bg-blue-50/80 border-blue-200"
                        : "bg-gray-50 hover:bg-white border-gray-200 hover:border-brand-peach/50"
                  }`}
                >
                  <div className={`w-12 h-12 bg-white rounded-lg border flex-shrink-0 flex items-center justify-center p-1 mr-3 ${
                    isCurrent ? "border-brand-peach/50" : "border-gray-100 group-hover:shadow-sm"
                  }`}>
                    <img src={`http://localhost:8000/${item.cropped_image_path}`} alt="thumbnail" className="max-w-full max-h-full object-contain" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <p className={`text-xs font-bold ${isCurrent ? "text-brand-peach" : hasDraft ? "text-brand-blue" : "text-brand-dark"}`}>
                      Item #{idx + 1} {isCurrent && "(Editing)"}
                    </p>
                    <p className="text-[10px] text-gray-400 truncate">
                      {isCurrent ? "Currently active" : hasDraft ? "Draft saved" : "Click to edit"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT: Ultra-Compact 3-Column Form Layout with Sticky Action Bar */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-brand-light">
        
        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-4 border-b pb-3">
              <h2 className="text-xl font-bold text-brand-dark">Product Metadata Details</h2>
              {drafts[currentProduct?.id] && (
                <span className="text-xs font-bold text-brand-blue bg-blue-50 px-3 py-1 rounded-full">Draft Loaded</span>
              )}
            </div>
            
            {errorBanner && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 text-xs">
                <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-red-500" />
                <span>{errorBanner}</span>
              </div>
            )}

            {/* Compact 3-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* COLUMN 1: Required Basics & Core IDs */}
              <div className="space-y-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">1. Core Information</h3>
                
                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Style Number *</label>
                  <input 
                    type="text" 
                    value={formData.style_number}
                    onChange={(e) => setFormData({...formData, style_number: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                    placeholder="e.g. RG-1029"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Main Category *</label>
                  <select 
                    value={formData.main_category_id}
                    onChange={(e) => setFormData({...formData, main_category_id: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                  >
                    <option value="">-- Select --</option>
                    {masterData.main_categories?.map((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Metal Type</label>
                    <select 
                      value={formData.metal_type_id}
                      onChange={(e) => setFormData({...formData, metal_type_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                    >
                      <option value="">-- Select --</option>
                      {masterData.metal_types?.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Diamond Type</label>
                    <select 
                      value={formData.diamond_type_id}
                      onChange={(e) => setFormData({...formData, diamond_type_id: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                    >
                      <option value="">-- Select --</option>
                      {masterData.diamond_types?.map((item: any) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Total Wt (g)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.total_weight}
                      onChange={(e) => setFormData({...formData, total_weight: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-brand-dark mb-1">Metal Wt (g)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={formData.metal_weight}
                      onChange={(e) => setFormData({...formData, metal_weight: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-2 text-xs focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              {/* COLUMN 2: Hierarchical Categories (Max 3) */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">2. Classifications</h3>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-brand-dark">Category (Max 3)</label>
                  </div>
                  {renderMultiSelectPills(categories, "category_ids")}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-brand-dark">Subcategory 1 (Max 3)</label>
                  </div>
                  {renderMultiSelectPills(sub1, "subcategory_1_ids")}
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-brand-dark">Subcategory 2 (Max 3)</label>
                  </div>
                  {renderMultiSelectPills(sub2, "subcategory_2_ids")}
                </div>
              </div>

              {/* COLUMN 3: Gemstones & Attributes */}
              <div className="space-y-3 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">3. Gemstones & Details</h3>

                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Shapes</label>
                  {renderMultiSelectPills(masterData.shapes, "shape_ids", 10)}
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-dark mb-1">Colour Stones</label>
                  {renderMultiSelectPills(masterData.colour_stones, "colour_stone_ids", 10)}
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Sticky Footer Action Bar */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 py-4 border-t border-gray-200 shadow-lg flex justify-between items-center z-20">
          <div className="text-xs text-gray-500">
            Required: <span className="font-bold text-brand-dark">Style Number</span> & <span className="font-bold text-brand-dark">Main Category</span>
          </div>
          <button 
            type="button"
            onClick={handleSubmit}
            className="bg-brand-blue text-white px-8 py-3 rounded-xl font-bold text-sm flex items-center justify-center hover:bg-blue-600 transition-all shadow-md"
          >
            <Save className="w-4 h-4 mr-2" /> Save Metadata & Next
          </button>
        </div>

      </div>
    </div>
  );
}

function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}