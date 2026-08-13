"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Edit3, Loader2, Search, Filter, RefreshCw, X, Save, AlertCircle } from "lucide-react";

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

    // Safe helper parsers to handle empty inputs or cleared numbers gracefully
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
      fetchCatalog(); // Refresh catalog grid
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

        {/* FULL EDIT MODAL */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl max-w-3xl w-full p-8 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
              <button 
                onClick={() => setEditingProduct(null)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-bold text-brand-dark mb-6">Edit Product Details</h2>

              {errorBanner && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 text-sm">
                  <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 text-red-500" />
                  <span>{errorBanner}</span>
                </div>
              )}

              {modalLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="animate-spin text-brand-blue w-8 h-8" /></div>
              ) : (
                <div className="space-y-6">
                  {/* Style Number & Main Category */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Style Number *</label>
                      <input 
                        type="text" 
                        value={editingProduct.style_number || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, style_number: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Main Category *</label>
                      <select 
                        value={editingProduct.main_category_id || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, main_category_id: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none"
                      >
                        <option value="">-- Select --</option>
                        {masterData.main_categories?.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cascading Category Pills (Max 3) */}
                  <div className="bg-brand-light/50 p-4 rounded-xl border border-brand-peach/30 space-y-4">
                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-2">Categories (Max 3)</label>
                      <div className="flex flex-wrap gap-2">
                        {editCategories.map((cat: any) => {
                          const isSelected = editingProduct.category_ids?.includes(cat.id);
                          return (
                            <button
                              key={cat.id}
                              onClick={() => handleEditMultiSelect("category_ids", cat.id, 3)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                                isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                              }`}
                            >
                              {cat.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-2">Subcategory 1 (Max 3)</label>
                      <div className="flex flex-wrap gap-2">
                        {editSub1.map((sub: any) => {
                          const isSelected = editingProduct.subcategory_1_ids?.includes(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleEditMultiSelect("subcategory_1_ids", sub.id, 3)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                                isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-2">Subcategory 2 (Max 3)</label>
                      <div className="flex flex-wrap gap-2">
                        {editSub2.map((sub: any) => {
                          const isSelected = editingProduct.subcategory_2_ids?.includes(sub.id);
                          return (
                            <button
                              key={sub.id}
                              onClick={() => handleEditMultiSelect("subcategory_2_ids", sub.id, 3)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                                isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                              }`}
                            >
                              {sub.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Material, Diamond, Market, Designer */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Metal Type</label>
                      <select 
                        value={editingProduct.metal_type_id || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, metal_type_id: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none"
                      >
                        <option value="">-- Select --</option>
                        {masterData.metal_types?.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Diamond Type</label>
                      <select 
                        value={editingProduct.diamond_type_id || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, diamond_type_id: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none"
                      >
                        <option value="">-- Select --</option>
                        {masterData.diamond_types?.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Market</label>
                      <select 
                        value={editingProduct.market_id || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, market_id: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none"
                      >
                        <option value="">-- Select --</option>
                        {masterData.markets?.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-brand-dark mb-1">Designer</label>
                      <select 
                        value={editingProduct.designer_id || ""}
                        onChange={(e) => setEditingProduct({...editingProduct, designer_id: Number(e.target.value)})}
                        className="w-full border border-gray-300 rounded-lg p-3 bg-white outline-none"
                      >
                        <option value="">-- Select --</option>
                        {masterData.designers?.map((item: any) => (
                          <option key={item.id} value={item.id}>{item.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Total Weight */}
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-1">Total Weight (g)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      value={editingProduct.total_weight || ""}
                      onChange={(e) => setEditingProduct({...editingProduct, total_weight: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg p-3 outline-none focus:ring-2 focus:ring-brand-blue"
                      placeholder="e.g. 12.50"
                    />
                  </div>

                  {/* Shapes (Multi-select pills) */}
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Shapes (Select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {masterData.shapes?.map((opt: any) => {
                        const isSelected = editingProduct.shape_ids?.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleEditMultiSelect("shape_ids", opt.id, 10)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                              isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                            }`}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cuts (Multi-select pills) */}
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Cuts (Select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {masterData.cuts?.map((opt: any) => {
                        const isSelected = editingProduct.cut_ids?.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleEditMultiSelect("cut_ids", opt.id, 10)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                              isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                            }`}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Colour Stones (Multi-select pills) */}
                  <div>
                    <label className="block text-sm font-bold text-brand-dark mb-2">Colour Stones (Select multiple)</label>
                    <div className="flex flex-wrap gap-2">
                      {masterData.colour_stones?.map((opt: any) => {
                        const isSelected = editingProduct.colour_stone_ids?.includes(opt.id);
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleEditMultiSelect("colour_stone_ids", opt.id, 10)}
                            className={`px-3 py-1.5 text-sm font-medium rounded-full border transition-all ${
                              isSelected ? "bg-brand-blue border-brand-blue text-white" : "bg-white border-gray-300 text-brand-dark hover:border-brand-peach"
                            }`}
                          >
                            {opt.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4 border-t">
                    <button
                      onClick={() => setEditingProduct(null)}
                      className="flex-1 py-3 bg-gray-100 font-bold text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 py-3 bg-brand-blue text-white font-bold rounded-xl hover:bg-blue-600 transition-colors shadow-md flex items-center justify-center"
                    >
                      <Save className="w-5 h-5 mr-2" /> Save Changes
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}