"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Edit3, Loader2, Search, Filter, RefreshCw, X, Save, AlertCircle, Image as ImageIcon } from "lucide-react";

interface DropdownOption {
  id: number;
  name: string;
}

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [selectedSub1, setSelectedSub1] = useState("");
  const [selectedMetal, setSelectedMetal] = useState("");
  const [selectedDesigner, setSelectedDesigner] = useState("");

  // Cascading Filter Dropdown Options
  const [filterCategories, setFilterCategories] = useState<DropdownOption[]>([]);
  const [filterSub1, setFilterSub1] = useState<DropdownOption[]>([]);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  
  // Edit Form Cascading Options
  const [editCategories, setEditCategories] = useState<DropdownOption[]>([]);
  const [editSub1, setEditSub1] = useState<DropdownOption[]>([]);
  const [editSub2, setEditSub2] = useState<DropdownOption[]>([]);

  // 1. Fetch Master Data
  useEffect(() => {
    axios.get("http://localhost:8000/api/metadata/dropdowns/master")
      .then(res => setMasterData(res.data))
      .catch(err => console.error("Failed to load master dropdowns", err));
  }, []);

  // 2. Fetch Filtered Catalog Data
  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedMainCat) params.append("main_category_id", selectedMainCat);
      if (selectedMetal) params.append("metal_type_id", selectedMetal);
      if (selectedDesigner) params.append("designer_id", selectedDesigner);

      const res = await axios.get(`http://localhost:8000/api/metadata/active-products?${params.toString()}`);
      
      let filtered = res.data;
      if (selectedCat) {
        filtered = filtered.filter((p: any) => p.metadata?.category_ids?.includes(Number(selectedCat)));
      }
      if (selectedSub1) {
        filtered = filtered.filter((p: any) => p.metadata?.subcategory_1_ids?.includes(Number(selectedSub1)));
      }

      setProducts(filtered);
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedMainCat, selectedCat, selectedSub1, selectedMetal, selectedDesigner]);

  // Handle Filter Cascades
  useEffect(() => {
    if (!selectedMainCat) {
      setFilterCategories([]);
      setSelectedCat("");
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/categories?main_category_id=${selectedMainCat}`)
      .then(res => setFilterCategories(res.data));
  }, [selectedMainCat]);

  useEffect(() => {
    if (!selectedCat) {
      setFilterSub1([]);
      setSelectedSub1("");
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories1?category_ids=${selectedCat}`)
      .then(res => setFilterSub1(res.data));
  }, [selectedCat]);

  // Handle Edit Form Cascades
  useEffect(() => {
    if (!editingProduct?.main_category_id) {
      setEditCategories([]);
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/categories?main_category_id=${editingProduct.main_category_id}`)
      .then(res => setEditCategories(res.data));
  }, [editingProduct?.main_category_id]);

  useEffect(() => {
    if (!editingProduct?.category_ids || editingProduct.category_ids.length === 0) {
      setEditSub1([]);
      setEditSub2([]);
      return;
    }
    const params = new URLSearchParams();
    editingProduct.category_ids.forEach((id: number) => params.append("category_ids", id.toString()));

    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories1?${params.toString()}`)
      .then(res => setEditSub1(res.data));
    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories2?${params.toString()}`)
      .then(res => setEditSub2(res.data));
  }, [editingProduct?.category_ids]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedMainCat("");
    setSelectedCat("");
    setSelectedSub1("");
    setSelectedMetal("");
    setSelectedDesigner("");
  };

  // Open Edit Modal & Load Product Data
  const openEditModal = async (croppedProductId: number) => {
    setErrorBanner(null);
    setModalLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/api/metadata/products/${croppedProductId}/details`);
      setEditingProduct({
        ...res.data,
        category_ids: res.data.category_ids || [],
        subcategory_1_ids: res.data.subcategory_1_ids || [],
        subcategory_2_ids: res.data.subcategory_2_ids || [],
        shape_ids: res.data.shape_ids || [],
        cut_ids: res.data.cut_ids || [],
        colour_stone_ids: res.data.colour_stone_ids || [],
      });
    } catch (err) {
      alert("Failed to load product details for editing.");
    } finally {
      setModalLoading(false);
    }
  };

  const handleEditMultiSelect = (field: string, id: number, max: number = 3) => {
    setEditingProduct((prev: any) => {
      const current = prev[field] || [];
      if (current.includes(id)) {
        return { ...prev, [field]: current.filter((item: number) => item !== id) };
      } else {
        if (current.length >= max) return prev;
        return { ...prev, [field]: [...current, id] };
      }
    });
  };

  const handleSaveEdit = async () => {
    setErrorBanner(null);
    if (!editingProduct.style_number || !editingProduct.main_category_id) {
      setErrorBanner("Style Number and Main Category are required fields.");
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

    const payload = {
      style_number: editingProduct.style_number.trim(),
      main_category_id: Number(editingProduct.main_category_id),
      category_ids: editingProduct.category_ids || [],
      subcategory_1_ids: editingProduct.subcategory_1_ids || [],
      subcategory_2_ids: editingProduct.subcategory_2_ids || [],
      diamond_type_id: parseId(editingProduct.diamond_type_id),
      shape_ids: editingProduct.shape_ids || [],
      cut_ids: editingProduct.cut_ids || [],
      colour_stone_ids: editingProduct.colour_stone_ids || [],
      market_id: parseId(editingProduct.market_id),
      metal_type_id: parseId(editingProduct.metal_type_id),
      designer_id: parseId(editingProduct.designer_id),
      total_weight: parseWeight(editingProduct.total_weight),
    };

    try {
      await axios.put(`http://localhost:8000/api/metadata/products/${editingProduct.cropped_product_id}`, payload);
      setEditingProduct(null);
      fetchCatalog();
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      let errorMessage = "Failed to update product metadata.";

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
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product entirely?")) return;
    try {
      await axios.delete(`http://localhost:8000/api/metadata/products/${id}`);
      setProducts(products.filter(p => p.cropped_product_id !== id));
    } catch (err) {
      alert("Failed to delete product.");
    }
  };

  const activeImage = editingProduct 
    ? products.find(p => p.cropped_product_id === editingProduct.cropped_product_id)?.image_path 
    : null;

  return (
    <div className="min-h-screen bg-brand-light p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark mb-1">Product Catalog</h1>
          <p className="text-gray-500">Search, filter, edit, and manage your active jewelry inventory.</p>
        </div>

        {/* Filter Bar */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-8 space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center text-brand-dark font-bold">
              <Filter className="w-5 h-5 mr-2 text-brand-blue" />
              Advanced Multi-Filters
            </div>
            <button 
              onClick={handleClearFilters}
              className="text-sm text-gray-500 hover:text-brand-blue flex items-center transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-1" /> Reset Filters
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Style Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
              />
            </div>

            <select
              value={selectedMainCat}
              onChange={(e) => setSelectedMainCat(e.target.value)}
              className="py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Main Categories</option>
              {masterData.main_categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              disabled={!selectedMainCat}
              className="py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none disabled:opacity-50"
            >
              <option value="">All Categories</option>
              {filterCategories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={selectedSub1}
              onChange={(e) => setSelectedSub1(e.target.value)}
              disabled={!selectedCat}
              className="py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none disabled:opacity-50"
            >
              <option value="">All Subcategory 1</option>
              {filterSub1.map((sub: any) => (
                <option key={sub.id} value={sub.id}>{sub.name}</option>
              ))}
            </select>

            <select
              value={selectedMetal}
              onChange={(e) => setSelectedMetal(e.target.value)}
              className="py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Metal Types</option>
              {masterData.metal_types?.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            <select
              value={selectedDesigner}
              onChange={(e) => setSelectedDesigner(e.target.value)}
              className="py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Designers</option>
              {masterData.designers?.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="animate-spin text-brand-blue w-8 h-8" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {products.map((item) => (
              <div key={item.cropped_product_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="h-48 bg-gray-50 border-b border-gray-100 p-4 flex items-center justify-center">
                  <img 
                    src={`http://localhost:8000/${item.image_path}`} 
                    alt="Jewelry Sketch" 
                    className="max-h-full max-w-full object-contain drop-shadow"
                  />
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-lg text-brand-dark">{item.metadata?.style_number}</h3>
                      <span className="bg-blue-50 text-brand-blue text-xs font-bold px-2.5 py-1 rounded-md">ACTIVE</span>
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mb-4">
                      {item.metadata?.description || "No description provided."}
                    </p>
                  </div>
                  <div className="flex justify-end space-x-2 pt-4 border-t border-gray-100">
                    <button 
                      onClick={() => openEditModal(item.cropped_product_id)}
                      className="p-2 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Product"
                    >
                      <Edit3 className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.cropped_product_id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Product"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-20 bg-white rounded-2xl border border-gray-100 shadow-sm">
            <p className="text-gray-400 font-medium">No products match your selected filters.</p>
          </div>
        )}

        {/* FULL EDIT SLIDE-OVER DRAWER: DASHBOARD GRID */}
        {editingProduct && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
            
            <div 
              className="bg-brand-light w-full max-w-[85vw] h-full shadow-2xl flex flex-col transform transition-transform duration-300 outline-none"
              tabIndex={0}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveEdit();
                }
              }}
            >
              {/* Drawer Header */}
              <div className="bg-white px-6 py-4 border-b border-gray-200 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-brand-dark">Edit Product Metadata</h2>
                  <p className="text-xs text-gray-500">Press <kbd className="bg-gray-100 px-1 rounded border">Ctrl + Enter</kbd> to save instantly.</p>
                </div>
                <button 
                  onClick={() => setEditingProduct(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Drawer Content Area */}
              <div className="flex-1 overflow-hidden flex min-h-0">
                
                {/* Left Side: Pinned Image */}
                <div className="w-[300px] bg-gray-50 border-r border-gray-200 p-6 flex flex-col items-center flex-shrink-0">
                  <div className="w-full bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4 h-64 flex items-center justify-center">
                    {activeImage ? (
                      <img 
                        src={`http://localhost:8000/${activeImage}`} 
                        alt="Editing Sketch" 
                        className="max-h-full max-w-full object-contain drop-shadow"
                      />
                    ) : (
                      <ImageIcon className="w-10 h-10 text-gray-300" />
                    )}
                  </div>
                  <div className="text-center w-full">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Editing</span>
                    <h3 className="text-xl font-bold text-brand-dark truncate mt-1">
                      {editingProduct.style_number || "Draft"}
                    </h3>
                  </div>
                </div>

                {/* Right Side: Ultra-Dense Dashboard Grid */}
                <div className="flex-1 flex flex-col bg-brand-light p-5 overflow-hidden">
                  
                  {errorBanner && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 text-xs shadow-sm flex-shrink-0">
                      <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0 text-red-500" />
                      <span>{errorBanner}</span>
                    </div>
                  )}

                  {modalLoading ? (
                    <div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-brand-blue w-8 h-8" /></div>
                  ) : (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex flex-col flex-1 min-h-0 space-y-4 overflow-y-auto">
                      
                      {/* TOP SECTION: Core 4-Column Grid */}
                      <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50/50 rounded-lg border border-gray-100 flex-shrink-0">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Style Number *</label>
                          <input 
                            type="text" 
                            value={editingProduct.style_number || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, style_number: e.target.value})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Main Category *</label>
                          <select 
                            value={editingProduct.main_category_id || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, main_category_id: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Select --</option>
                            {masterData.main_categories?.map((cat: any) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Metal Type</label>
                          <select 
                            value={editingProduct.metal_type_id || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, metal_type_id: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Select --</option>
                            {masterData.metal_types?.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Total Weight (g)</label>
                          <input 
                            type="number" 
                            step="0.01"
                            value={editingProduct.total_weight || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, total_weight: e.target.value})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue bg-white"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Designer</label>
                          <select 
                            value={editingProduct.designer_id || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, designer_id: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Select --</option>
                            {masterData.designers?.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Market</label>
                          <select 
                            value={editingProduct.market_id || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, market_id: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Select --</option>
                            {masterData.markets?.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Diamond Type</label>
                          <select 
                            value={editingProduct.diamond_type_id || ""}
                            onChange={(e) => setEditingProduct({...editingProduct, diamond_type_id: Number(e.target.value)})}
                            className="w-full border border-gray-300 rounded-md p-2 text-sm bg-white outline-none focus:ring-2 focus:ring-brand-blue"
                          >
                            <option value="">-- Select --</option>
                            {masterData.diamond_types?.map((item: any) => (
                              <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* BOTTOM SECTION: 2-Column Split for Pills */}
                      <div className="flex-1 flex gap-4 min-h-0">
                        
                        {/* LEFT SPLIT: Classifications */}
                        <div className="w-1/2 flex flex-col space-y-4 p-4 border border-gray-100 rounded-xl overflow-y-auto custom-scrollbar">
                          <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wider border-b border-gray-100 pb-2">Classifications</h3>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Category <span className="font-normal">(Max 3)</span></label>
                            <div className="flex flex-wrap gap-1.5">
                              {editCategories.map((cat: any) => {
                                const isSelected = editingProduct.category_ids?.includes(cat.id);
                                return (
                                  <button key={cat.id} onClick={() => handleEditMultiSelect("category_ids", cat.id, 3)}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                      isSelected ? "bg-brand-blue border-brand-blue text-white shadow-sm" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                    }`}>
                                    {cat.name}
                                  </button>
                                );
                              })}
                              {editCategories.length === 0 && <span className="text-[11px] text-gray-400 italic">Select a Main Category first.</span>}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Subcategory 1 <span className="font-normal">(Max 3)</span></label>
                            <div className="flex flex-wrap gap-1.5">
                              {editSub1.map((sub: any) => {
                                const isSelected = editingProduct.subcategory_1_ids?.includes(sub.id);
                                return (
                                  <button key={sub.id} onClick={() => handleEditMultiSelect("subcategory_1_ids", sub.id, 3)}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                      isSelected ? "bg-brand-blue border-brand-blue text-white shadow-sm" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                    }`}>
                                    {sub.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Subcategory 2 <span className="font-normal">(Max 3)</span></label>
                            <div className="flex flex-wrap gap-1.5">
                              {editSub2.map((sub: any) => {
                                const isSelected = editingProduct.subcategory_2_ids?.includes(sub.id);
                                return (
                                  <button key={sub.id} onClick={() => handleEditMultiSelect("subcategory_2_ids", sub.id, 3)}
                                    className={`px-2.5 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                      isSelected ? "bg-brand-blue border-brand-blue text-white shadow-sm" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                    }`}>
                                    {sub.name}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* RIGHT SPLIT: Gems */}
                        <div className="w-1/2 flex flex-col space-y-4 p-4 border border-gray-100 rounded-xl overflow-y-auto custom-scrollbar">
                          <h3 className="text-xs font-bold text-brand-dark uppercase tracking-wider border-b border-gray-100 pb-2">Materials & Gems</h3>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Shapes</label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                              {masterData.shapes?.map((opt: any) => (
                                <button key={opt.id} onClick={() => handleEditMultiSelect("shape_ids", opt.id, 10)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                    editingProduct.shape_ids?.includes(opt.id) ? "bg-brand-blue border-brand-blue text-white" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                  }`}>
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Cuts</label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                              {masterData.cuts?.map((opt: any) => (
                                <button key={opt.id} onClick={() => handleEditMultiSelect("cut_ids", opt.id, 10)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                    editingProduct.cut_ids?.includes(opt.id) ? "bg-brand-blue border-brand-blue text-white" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                  }`}>
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-gray-500 mb-1.5">Colour Stones</label>
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2 custom-scrollbar">
                              {masterData.colour_stones?.map((opt: any) => (
                                <button key={opt.id} onClick={() => handleEditMultiSelect("colour_stone_ids", opt.id, 10)}
                                  className={`px-2 py-1 text-[11px] font-medium rounded-full border transition-all ${
                                    editingProduct.colour_stone_ids?.includes(opt.id) ? "bg-brand-blue border-brand-blue text-white" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-brand-peach"
                                  }`}>
                                  {opt.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="bg-white px-6 py-4 border-t border-gray-200 flex justify-end items-center shadow-lg flex-shrink-0">
                <button onClick={() => setEditingProduct(null)} className="px-6 py-2.5 bg-gray-100 font-bold text-gray-600 rounded-xl hover:bg-gray-200 transition-colors mr-3">
                  Cancel
                </button>
                <button onClick={handleSaveEdit} className="px-8 py-2.5 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center">
                  <Save className="w-4 h-4 mr-2" /> Save Changes
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}