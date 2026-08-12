"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Loader2, Save, SkipForward, AlertCircle } from "lucide-react";

// --- Types ---
interface PendingProduct {
  id: number;
  cropped_image_path: string;
}

interface DropdownOption {
  id: number;
  name: string;
}

export default function MetadataPage() {
  // Queue State
  const [queue, setQueue] = useState<PendingProduct[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingQueue, setLoadingQueue] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Master Dropdown Data
  const [masterData, setMasterData] = useState<any>({});
  
  // Cascading Dropdown Data
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [sub1, setSub1] = useState<DropdownOption[]>([]);
  const [sub2, setSub2] = useState<DropdownOption[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    style_number: "",
    main_category_id: "",
    category_ids: [] as number[],
    subcategory_1_ids: [] as number[],
    subcategory_2_ids: [] as number[],
    diamond_type_id: "",
    shape_ids: [] as number[],
    cut_ids: [] as number[],
    colour_stone_ids: [] as number[],
    market_id: "",
    metal_type_id: "",
    designer_id: "",
    total_weight: "",
  });

  // 1. Initial Load: Fetch Queue and Master Dropdowns
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [queueRes, masterRes] = await Promise.all([
          axios.get("http://localhost:8000/api/metadata/pending-products"),
          axios.get("http://localhost:8000/api/metadata/dropdowns/master")
        ]);
        setQueue(queueRes.data);
        setMasterData(masterRes.data);
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setLoadingQueue(false);
      }
    };
    fetchInitialData();
  }, []);

  // 2. Cascade Logic: When Main Category changes, fetch Categories
  useEffect(() => {
    if (!formData.main_category_id) {
      setCategories([]);
      setFormData(prev => ({ ...prev, category_ids: [], subcategory_1_ids: [], subcategory_2_ids: [] }));
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
      setFormData(prev => ({ ...prev, subcategory_1_ids: [], subcategory_2_ids: [] }));
      return;
    }

    // Prepare params for array (FastAPI expects ?category_ids=1&category_ids=2)
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
        // Remove it
        return { ...prev, [field]: currentSelected.filter(item => item !== id) };
      } else {
        // Add it if under max limit
        if (currentSelected.length >= max) return prev;
        return { ...prev, [field]: [...currentSelected, id] };
      }
    });
  };

  const handleSkip = () => {
    if (currentIndex < queue.length - 1) {
      setCurrentIndex(prev => prev + 1);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      style_number: "", main_category_id: "", category_ids: [], subcategory_1_ids: [],
      subcategory_2_ids: [], diamond_type_id: "", shape_ids: [], cut_ids: [],
      colour_stone_ids: [], market_id: "", metal_type_id: "", designer_id: "", total_weight: "",
    });
  };

  const handleSubmit = async () => {
    if (!formData.style_number || !formData.main_category_id) {
      alert("Style Number and Main Category are required!");
      return;
    }

    setSubmitting(true);
    const currentProduct = queue[currentIndex];

    const payload = {
      cropped_product_id: currentProduct.id,
      style_number: formData.style_number,
      main_category_id: Number(formData.main_category_id),
      category_ids: formData.category_ids,
      subcategory_1_ids: formData.subcategory_1_ids,
      subcategory_2_ids: formData.subcategory_2_ids,
      diamond_type_id: formData.diamond_type_id ? Number(formData.diamond_type_id) : null,
      shape_ids: formData.shape_ids,
      cut_ids: formData.cut_ids,
      colour_stone_ids: formData.colour_stone_ids,
      market_id: formData.market_id ? Number(formData.market_id) : null,
      metal_type_id: formData.metal_type_id ? Number(formData.metal_type_id) : null,
      designer_id: formData.designer_id ? Number(formData.designer_id) : null,
      total_weight: formData.total_weight ? parseFloat(formData.total_weight) : null,
    };

    try {
      await axios.post("http://localhost:8000/api/metadata/submit", payload);
      
      // Remove item from queue array and reset form
      const newQueue = [...queue];
      newQueue.splice(currentIndex, 1);
      setQueue(newQueue);
      resetForm();
      
      // If we are at the end of the new queue, adjust index
      if (currentIndex >= newQueue.length) {
        setCurrentIndex(Math.max(0, newQueue.length - 1));
      }
      
    } catch (err) {
      console.error(err);
      alert("Failed to save metadata. Ensure Style Number is unique.");
    } finally {
      setSubmitting(false);
    }
  };

  // --- UI Components ---

  const renderMultiSelectPills = (options: DropdownOption[], field: string, max: number = 3) => {
    if (!options || options.length === 0) return <p className="text-sm text-gray-400">Please select parent category first.</p>;
    
    const selectedArray = formData[field as keyof typeof formData] as number[];
    const isMaxedOut = selectedArray.length >= max;

    return (
      <div className="flex flex-wrap gap-2">
        {options.map(opt => {
          const isSelected = selectedArray.includes(opt.id);
          const isDisabled = !isSelected && isMaxedOut;
          
          return (
            <button
              key={opt.id}
              onClick={() => handleMultiSelect(field, opt.id, max)}
              disabled={isDisabled}
              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                isSelected 
                  ? "bg-brand-blue border-brand-blue text-white shadow-sm" 
                  : isDisabled
                    ? "bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed"
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

  if (loadingQueue) return <div className="p-10 text-center">Loading pending items...</div>;
  
  if (queue.length === 0) return (
    <div className="flex flex-col items-center justify-center h-screen bg-brand-light">
      <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
      <h2 className="text-2xl font-bold text-brand-dark">You're all caught up!</h2>
      <p className="text-gray-500 mt-2">There are no pending items waiting for metadata.</p>
    </div>
  );

  const currentProduct = queue[currentIndex];

  return (
    <div className="flex h-screen bg-brand-light font-sans">
      
      {/* LEFT: Image Preview & Queue Status */}
      <div className="w-1/3 p-6 flex flex-col border-r border-gray-200 bg-white shadow-sm z-10">
        <div className="mb-6 flex justify-between items-center bg-brand-light px-4 py-3 rounded-lg border border-gray-100">
          <span className="font-bold text-brand-dark">Pending Queue</span>
          <span className="bg-brand-peach text-brand-dark px-3 py-1 rounded-full text-sm font-bold shadow-sm">
            {currentIndex + 1} of {queue.length}
          </span>
        </div>

        <div className="flex-1 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center p-4 relative overflow-hidden">
          <img 
            src={`http://localhost:8000/${currentProduct.cropped_image_path}`} 
            alt="Cropped Jewelry" 
            className="max-w-full max-h-full object-contain drop-shadow-md rounded-lg"
          />
        </div>

        <div className="mt-6 flex space-x-3">
          <button 
            onClick={handleSkip}
            disabled={currentIndex >= queue.length - 1}
            className="flex-1 py-3 bg-white border border-gray-300 text-gray-600 font-bold rounded-xl flex items-center justify-center hover:bg-gray-50 hover:text-brand-dark transition-all disabled:opacity-50"
          >
            <SkipForward className="w-5 h-5 mr-2" /> Skip for Now
          </button>
        </div>
      </div>

      {/* RIGHT: Metadata Form */}
      <div className="w-2/3 p-8 overflow-y-auto bg-brand-light">
        <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-2xl font-bold text-brand-dark mb-6 border-b pb-4">Product Details</h2>
          
          <div className="space-y-8">
            {/* Required Basics */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-brand-dark mb-2">Style Number *</label>
                <input 
                  type="text" 
                  value={formData.style_number}
                  onChange={(e) => setFormData({...formData, style_number: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-peach focus:border-brand-peach outline-none transition-all"
                  placeholder="e.g. RG-1029"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-dark mb-2">Main Category *</label>
                <select 
                  value={formData.main_category_id}
                  onChange={(e) => setFormData({...formData, main_category_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-peach outline-none bg-white"
                >
                  <option value="">-- Select Main Category --</option>
                  {masterData.main_categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading Multi-Selects */}
            <div className="bg-brand-light/50 p-5 rounded-xl border border-brand-peach/30 space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-brand-dark">Category</label>
                  <span className="text-xs font-semibold text-brand-blue bg-blue-50 px-2 py-1 rounded">Max 3</span>
                </div>
                {renderMultiSelectPills(categories, "category_ids")}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-brand-dark">Subcategory 1</label>
                  <span className="text-xs font-semibold text-brand-blue bg-blue-50 px-2 py-1 rounded">Max 3</span>
                </div>
                {renderMultiSelectPills(sub1, "subcategory_1_ids")}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-bold text-brand-dark">Subcategory 2</label>
                  <span className="text-xs font-semibold text-brand-blue bg-blue-50 px-2 py-1 rounded">Max 3</span>
                </div>
                {renderMultiSelectPills(sub2, "subcategory_2_ids")}
              </div>
            </div>

            {/* Other Attributes */}
            <div className="grid grid-cols-2 gap-6">
               <div>
                <label className="block text-sm font-bold text-brand-dark mb-2">Diamond Type</label>
                <select 
                  value={formData.diamond_type_id}
                  onChange={(e) => setFormData({...formData, diamond_type_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <option value="">-- Select --</option>
                  {masterData.diamond_types?.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-dark mb-2">Metal Type</label>
                <select 
                  value={formData.metal_type_id}
                  onChange={(e) => setFormData({...formData, metal_type_id: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg p-3 bg-white"
                >
                  <option value="">-- Select --</option>
                  {masterData.metal_types?.map((item: any) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* More Multi-Selects */}
            <div>
               <label className="block text-sm font-bold text-brand-dark mb-2">Shapes (Select multiple)</label>
               {renderMultiSelectPills(masterData.shapes, "shape_ids", 10)}
            </div>

            <div>
               <label className="block text-sm font-bold text-brand-dark mb-2">Colour Stones (Select multiple)</label>
               {renderMultiSelectPills(masterData.colour_stones, "colour_stone_ids", 10)}
            </div>

            {/* Submit */}
            <div className="pt-6 border-t">
              <button 
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center hover:bg-blue-600 transition-all shadow-md disabled:opacity-70"
              >
                {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Save className="w-6 h-6 mr-2"/> Save Metadata & Activate Product</>}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

// Temporary CheckCircle icon for empty state
function CheckCircle(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
}