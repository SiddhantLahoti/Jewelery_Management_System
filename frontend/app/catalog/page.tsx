"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Loader2, Search, Filter, RefreshCw } from "lucide-react";

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>({});

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMainCat, setSelectedMainCat] = useState("");
  const [selectedMetal, setSelectedMetal] = useState("");
  const [selectedDesigner, setSelectedDesigner] = useState("");
  const [selectedDiamond, setSelectedDiamond] = useState("");

  // Fetch Master Data for filter dropdowns
  useEffect(() => {
    axios.get("http://localhost:8000/api/metadata/dropdowns/master")
      .then(res => setMasterData(res.data))
      .catch(err => console.error("Failed to load master dropdowns", err));
  }, []);

  // Fetch Filtered Catalog Data
  const fetchCatalog = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (selectedMainCat) params.append("main_category_id", selectedMainCat);
      if (selectedMetal) params.append("metal_type_id", selectedMetal);
      if (selectedDesigner) params.append("designer_id", selectedDesigner);
      if (selectedDiamond) params.append("diamond_type_id", selectedDiamond);

      const res = await axios.get(`http://localhost:8000/api/metadata/active-products?${params.toString()}`);
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to load catalog", err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger fetch when filters change
  useEffect(() => {
    fetchCatalog();
  }, [searchQuery, selectedMainCat, selectedMetal, selectedDesigner, selectedDiamond]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSelectedMainCat("");
    setSelectedMetal("");
    setSelectedDesigner("");
    setSelectedDiamond("");
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-brand-dark mb-1">Product Catalog</h1>
            <p className="text-gray-500">Search, filter, and manage your active jewelry inventory.</p>
          </div>
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Style Number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-brand-light border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            {/* Main Category Filter */}
            <select
              value={selectedMainCat}
              onChange={(e) => setSelectedMainCat(e.target.value)}
              className="w-full py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Main Categories</option>
              {masterData.main_categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            {/* Metal Type Filter */}
            <select
              value={selectedMetal}
              onChange={(e) => setSelectedMetal(e.target.value)}
              className="w-full py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Metal Types</option>
              {masterData.metal_types?.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            {/* Designer Filter */}
            <select
              value={selectedDesigner}
              onChange={(e) => setSelectedDesigner(e.target.value)}
              className="w-full py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Designers</option>
              {masterData.designers?.map((item: any) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>

            {/* Diamond Type Filter */}
            <select
              value={selectedDiamond}
              onChange={(e) => setSelectedDiamond(e.target.value)}
              className="w-full py-2 px-3 bg-brand-light border border-gray-200 rounded-xl text-sm outline-none"
            >
              <option value="">All Diamond Types</option>
              {masterData.diamond_types?.map((item: any) => (
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
                  <div className="flex justify-end pt-4 border-t border-gray-100">
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

      </div>
    </div>
  );
}