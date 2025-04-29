import React, { useState } from "react";
import axios from "axios";

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [dir, setDir] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const uploadSingle = async () => {
    if (!file) {
      setStatus({ type: "error", message: "Please select a file" });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await axios.post("/api/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setStatus({ 
        type: "success", 
        message: `File uploaded successfully. ${response.data.uploaded} files added.` 
      });
      setFile(null);
    } catch (error) {
      setStatus({ 
        type: "error", 
        message: error.response?.data?.error || "Upload failed" 
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadDir = async () => {
    if (!dir) {
      setStatus({ type: "error", message: "Please enter a directory path" });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const response = await axios.post("/api/upload-directory", { dir });
      setStatus({ 
        type: "success", 
        message: `Directory uploaded successfully. ${response.data.uploaded} files added.` 
      });
      setDir("");
    } catch (error) {
      setStatus({ 
        type: "error", 
        message: error.response?.data?.error || "Directory upload failed" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 p-4 border rounded">
      <h2 className="font-semibold mb-2">File Upload</h2>
      
      {status && (
        <div className={`mb-4 p-2 rounded ${
          status.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }`}>
          {status.message}
        </div>
      )}
      
      <div className="mb-3">
        <label className="block mb-1">Upload Single File</label>
        <div className="flex">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])} 
            className="flex-grow"
            disabled={loading}
          />
          <button 
            onClick={uploadSingle} 
            className={`ml-2 px-3 py-1 bg-green-500 text-white rounded ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-green-600"
            }`}
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload File"}
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-1">
          Allowed: .txt, .pdf, .csv, .jsonl, .docx (max 20MB)
        </div>
      </div>
      
      <div>
        <label className="block mb-1">Upload Directory</label>
        <div className="flex">
          <input
            type="text"
            placeholder="Directory path"
            value={dir}
            onChange={(e) => setDir(e.target.value)}
            className="flex-grow border p-1 rounded"
            disabled={loading}
          />
          <button 
            onClick={uploadDir} 
            className={`ml-2 px-3 py-1 bg-indigo-500 text-white rounded ${
              loading ? "opacity-50 cursor-not-allowed" : "hover:bg-indigo-600"
            }`}
            disabled={loading}
          >
            {loading ? "Uploading..." : "Upload Directory"}
          </button>
        </div>
      </div>
    </div>
  );
}