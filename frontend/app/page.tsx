"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { UploadCloud, Loader2, FileText } from "lucide-react";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a PDF file first.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      // Call our FastAPI ingestion endpoint
      const response = await axios.post("http://localhost:8000/api/ingestion/upload-pdf", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Save the OpenCV coordinates and page images to session storage
      // so we can use them on the Manual Cropping page
      sessionStorage.setItem("pdfProcessingData", JSON.stringify(response.data));
      
      // Send the user to Page 2
      router.push("/review");
      
    } catch (err) {
      console.error(err);
      setError("Failed to process the PDF. Ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-brand-light flex flex-col items-center justify-center p-6">
      
      <div className="w-full max-w-xl bg-brand-white rounded-2xl shadow-xl p-10 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-brand-dark mb-2">Upload Jewelry Catalog</h1>
          <p className="text-gray-500">Upload a PDF to automatically extract product sketches.</p>
        </div>

        {/* Upload Box */}
        <div className="border-2 border-dashed border-brand-blue/50 rounded-xl bg-blue-50/30 p-10 flex flex-col items-center justify-center transition-all hover:bg-blue-50/50">
          {file ? (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-peach rounded-full flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-brand-dark" />
              </div>
              <p className="text-lg font-medium text-brand-dark">{file.name}</p>
              <p className="text-sm text-gray-500 mb-6">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              <button 
                onClick={() => setFile(null)}
                className="text-sm text-red-500 hover:underline"
              >
                Remove file
              </button>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 bg-brand-peach/40 rounded-full flex items-center justify-center mb-4">
                <UploadCloud className="w-8 h-8 text-brand-blue" />
              </div>
              <p className="text-brand-dark font-medium mb-1">Click to browse or drag and drop</p>
              <p className="text-sm text-gray-500 mb-6">PDF files only (Max 50MB)</p>
              
              <label className="bg-brand-white border border-gray-200 text-brand-dark px-6 py-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors shadow-sm">
                Select PDF
                <input 
                  type="file" 
                  accept="application/pdf" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </>
          )}
        </div>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleUpload}
          disabled={!file || loading}
          className={`mt-8 w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center transition-all shadow-md
            ${!file || loading 
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
              : 'bg-brand-blue text-brand-white hover:bg-blue-600 hover:shadow-lg'}`}
        >
          {loading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin mr-3" />
              Scanning pages with OpenCV...
            </>
          ) : (
            "Process Catalog"
          )}
        </button>

      </div>
    </main>
  );
}