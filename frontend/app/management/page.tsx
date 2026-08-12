"use client";

import { useState, useEffect } from "react";
import axios from "axios";
import { Trash2, Plus, List, Layers, Loader2 } from "lucide-react";

// --- Types ---
interface DropdownOption {
  id: number;
  name: string;
}

export default function ManagementPage() {
  const [activeTab, setActiveTab] = useState<"simple" | "cascading">("simple");
  const [loading, setLoading] = useState(true);
  const [masterData, setMasterData] = useState<any>({});

  // Simple Options State
  const [selectedTable, setSelectedTable] = useState("designer");
  const [newSimpleOption, setNewSimpleOption] = useState("");

  // Cascading Options State
  const [selectedMainCat, setSelectedMainCat] = useState("");
  const [categories, setCategories] = useState<DropdownOption[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [sub1, setSub1] = useState<DropdownOption[]>([]);
  const [sub2, setSub2] = useState<DropdownOption[]>([]);
  
  const [newCatName, setNewCatName] = useState("");
  const [newSub1Name, setNewSub1Name] = useState("");
  const [newSub2Name, setNewSub2Name] = useState("");

  // --- Data Fetching ---
  const fetchMasterData = async () => {
    try {
      const res = await axios.get("http://localhost:8000/api/metadata/dropdowns/master");
      setMasterData(res.data);
    } catch (error) {
      console.error("Failed to load master data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMasterData();
  }, []);

  // Fetch Categories when Main Category changes
  useEffect(() => {
    if (!selectedMainCat) {
      setCategories([]);
      setSelectedCat("");
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/categories`, {
      params: { main_category_id: selectedMainCat }
    }).then(res => setCategories(res.data));
  }, [selectedMainCat]);

  // Fetch Subcategories when Category changes
  useEffect(() => {
    if (!selectedCat) {
      setSub1([]);
      setSub2([]);
      return;
    }
    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories1?category_ids=${selectedCat}`)
      .then(res => setSub1(res.data));
    axios.get(`http://localhost:8000/api/metadata/dropdowns/subcategories2?category_ids=${selectedCat}`)
      .then(res => setSub2(res.data));
  }, [selectedCat]);

  // --- Handlers ---
  const handleAddSimpleOption = async () => {
    if (!newSimpleOption.trim()) return;
    try {
      await axios.post("http://localhost:8000/api/management/add-simple-option", {
        target_table: selectedTable,
        name: newSimpleOption.trim()
      });
      setNewSimpleOption("");
      fetchMasterData(); // Refresh the lists
    } catch (error: any) {
      alert(error.response?.data?.detail || "Failed to add option.");
    }
  };

  const handleDeleteOption = async (targetTable: string, id: number) => {
    if (!confirm("Are you sure you want to delete this option?")) return;
    try {
      await axios.delete("http://localhost:8000/api/management/delete-option", {
        data: { target_table: targetTable, item_id: id }
      });
      
      // Refresh the appropriate lists
      if (["category", "subcategory1", "subcategory2"].includes(targetTable)) {
        // Trigger a re-fetch of the cascading dropdowns by faking a state change
        const currentMain = selectedMainCat;
        const currentCat = selectedCat;
        setSelectedMainCat(""); setTimeout(() => setSelectedMainCat(currentMain), 50);
        if (currentCat) {
          setSelectedCat(""); setTimeout(() => setSelectedCat(currentCat), 50);
        }
      } else {
        fetchMasterData();
      }
    } catch (error) {
      alert("Failed to delete option.");
    }
  };

  const handleAddCascading = async (type: "category" | "subcategory1" | "subcategory2", name: string, parentId: string) => {
    if (!name.trim() || !parentId) return;
    try {
      await axios.post(`http://localhost:8000/api/management/add-${type}`, {
        name: name.trim(),
        parent_id: Number(parentId)
      });
      
      // Reset inputs and refresh
      if (type === "category") {
        setNewCatName("");
        const currentMain = selectedMainCat;
        setSelectedMainCat(""); setTimeout(() => setSelectedMainCat(currentMain), 50);
      }
      if (type === "subcategory1") {
        setNewSub1Name("");
        const currentCat = selectedCat;
        setSelectedCat(""); setTimeout(() => setSelectedCat(currentCat), 50);
      }
      if (type === "subcategory2") {
        setNewSub2Name("");
        const currentCat = selectedCat;
        setSelectedCat(""); setTimeout(() => setSelectedCat(currentCat), 50);
      }
    } catch (error) {
      alert("Failed to add cascading option.");
    }
  };

  // --- UI Helpers ---
  const simpleTables = [
    { value: "designer", label: "Designers" },
    { value: "metal_type", label: "Metal Types" },
    { value: "colour_stone", label: "Colour Stones" },
    { value: "shape", label: "Diamond Shapes" },
    { value: "cut", label: "Diamond Cuts" },
    { value: "diamond_type", label: "Diamond Types" },
    { value: "market", label: "Markets" },
  ];

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-blue w-8 h-8" /></div>;

  return (
    <div className="min-h-screen bg-brand-light p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Master Data Management</h1>
          <p className="text-gray-500">Add, edit, or remove dropdown options for the metadata system.</p>
        </div>

        {/* Custom Tabs */}
        <div className="flex space-x-2 mb-6">
          <button
            onClick={() => setActiveTab("simple")}
            className={`flex items-center px-6 py-3 rounded-t-xl font-bold transition-colors ${
              activeTab === "simple" 
                ? "bg-white text-brand-blue border-t-4 border-brand-blue shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" 
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <List className="w-5 h-5 mr-2" />
            Simple Dropdowns
          </button>
          <button
            onClick={() => setActiveTab("cascading")}
            className={`flex items-center px-6 py-3 rounded-t-xl font-bold transition-colors ${
              activeTab === "cascading" 
              ? "bg-white text-brand-peach border-t-4 border-brand-peach shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]" 
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            <Layers className="w-5 h-5 mr-2" />
            Cascading Categories
          </button>
        </div>

        {/* TAB 1: Simple Dropdowns */}
        {activeTab === "simple" && (
          <div className="bg-white rounded-b-xl rounded-tr-xl shadow-sm border border-gray-100 p-8">
            <div className="flex space-x-8">
              
              {/* Left Column: Select Table */}
              <div className="w-1/3 border-r pr-8">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Select Field</h3>
                <div className="space-y-2">
                  {simpleTables.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setSelectedTable(t.value)}
                      className={`w-full text-left px-4 py-3 rounded-lg font-medium transition-all ${
                        selectedTable === t.value 
                          ? "bg-brand-blue text-white shadow-md" 
                          : "bg-gray-50 text-brand-dark hover:bg-blue-50 hover:text-brand-blue"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Right Column: Manage Data */}
              <div className="w-2/3 pl-4">
                <h2 className="text-xl font-bold text-brand-dark mb-6">
                  Managing: {simpleTables.find(t => t.value === selectedTable)?.label}
                </h2>
                
                {/* Add New Input */}
                <div className="flex space-x-3 mb-8">
                  <input 
                    type="text" 
                    value={newSimpleOption}
                    onChange={(e) => setNewSimpleOption(e.target.value)}
                    placeholder="Type new option name..."
                    className="flex-1 border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-blue outline-none"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSimpleOption()}
                  />
                  <button 
                    onClick={handleAddSimpleOption}
                    className="bg-brand-blue text-white px-6 py-3 rounded-lg font-bold flex items-center hover:bg-blue-600 transition-colors shadow-sm"
                  >
                    <Plus className="w-5 h-5 mr-1" /> Add
                  </button>
                </div>

                {/* List Existing Items */}
                <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                  <div className="max-h-96 overflow-y-auto p-2">
                    {masterData[`${selectedTable}s`]?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center p-3 hover:bg-white rounded-lg group transition-colors">
                        <span className="font-medium text-brand-dark">{item.name}</span>
                        <button 
                          onClick={() => handleDeleteOption(selectedTable, item.id)}
                          className="text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {masterData[`${selectedTable}s`]?.length === 0 && (
                      <p className="text-gray-400 text-center py-6">No options found. Add one above.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* TAB 2: Cascading Categories */}
        {activeTab === "cascading" && (
          <div className="bg-white rounded-b-xl rounded-tl-xl shadow-sm border border-gray-100 p-8">
            <p className="text-gray-500 mb-8 border-b pb-6">
              Cascading data depends on parent selections. Select a parent on the left to reveal and manage its child options.
            </p>

            <div className="grid grid-cols-3 gap-6">
              
              {/* Column 1: Main Categories */}
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <h3 className="font-bold text-brand-dark mb-4 border-b pb-2">1. Main Category</h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {masterData.main_categories?.map((cat: any) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedMainCat(cat.id.toString())}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedMainCat === cat.id.toString()
                          ? "bg-brand-peach text-brand-dark shadow-sm border border-brand-peach"
                          : "bg-white text-gray-600 border border-gray-200 hover:border-brand-peach"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column 2: Categories */}
              <div className={`bg-gray-50 rounded-xl p-5 border transition-all ${selectedMainCat ? 'border-brand-peach/50 shadow-sm' : 'border-gray-200 opacity-50'}`}>
                <h3 className="font-bold text-brand-dark mb-4 border-b pb-2">2. Category</h3>
                {selectedMainCat ? (
                  <>
                    <div className="flex mb-4">
                      <input type="text" value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} placeholder="New Category" className="w-full text-sm border p-2 rounded-l-md outline-none" />
                      <button onClick={() => handleAddCascading("category", newCatName, selectedMainCat)} className="bg-brand-dark text-white px-3 rounded-r-md"><Plus className="w-4 h-4"/></button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                      {categories.map((cat: any) => (
                        <div key={cat.id} className="flex gap-1">
                          <button
                            onClick={() => setSelectedCat(cat.id.toString())}
                            className={`flex-1 text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              selectedCat === cat.id.toString() ? "bg-brand-peach text-brand-dark" : "bg-white text-gray-600 border border-gray-200"
                            }`}
                          >
                            {cat.name}
                          </button>
                          <button onClick={() => handleDeleteOption("category", cat.id)} className="px-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-gray-400 text-center mt-10">Select a Main Category first.</p>
                )}
              </div>

              {/* Column 3: Subcategories */}
              <div className={`space-y-6 transition-all ${selectedCat ? '' : 'opacity-50'}`}>
                
                {/* Subcategory 1 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="font-bold text-brand-dark mb-4 border-b pb-2">3A. Subcategory 1</h3>
                  {selectedCat ? (
                    <>
                      <div className="flex mb-4">
                        <input type="text" value={newSub1Name} onChange={(e)=>setNewSub1Name(e.target.value)} placeholder="New Subcategory 1" className="w-full text-sm border p-2 rounded-l-md outline-none" />
                        <button onClick={() => handleAddCascading("subcategory1", newSub1Name, selectedCat)} className="bg-brand-dark text-white px-3 rounded-r-md"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {sub1.map((sub: any) => (
                          <div key={sub.id} className="flex justify-between bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm">
                            <span>{sub.name}</span>
                            <button onClick={() => handleDeleteOption("subcategory1", sub.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center">Select a Category first.</p>
                  )}
                </div>

                {/* Subcategory 2 */}
                <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                  <h3 className="font-bold text-brand-dark mb-4 border-b pb-2">3B. Subcategory 2</h3>
                  {selectedCat ? (
                    <>
                      <div className="flex mb-4">
                        <input type="text" value={newSub2Name} onChange={(e)=>setNewSub2Name(e.target.value)} placeholder="New Subcategory 2" className="w-full text-sm border p-2 rounded-l-md outline-none" />
                        <button onClick={() => handleAddCascading("subcategory2", newSub2Name, selectedCat)} className="bg-brand-dark text-white px-3 rounded-r-md"><Plus className="w-4 h-4"/></button>
                      </div>
                      <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                        {sub2.map((sub: any) => (
                          <div key={sub.id} className="flex justify-between bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-sm">
                            <span>{sub.name}</span>
                            <button onClick={() => handleDeleteOption("subcategory2", sub.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center">Select a Category first.</p>
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}