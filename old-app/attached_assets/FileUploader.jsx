import React, { useState } from "react";
import axios from "axios";

export default function FileUploader() {
  const [file, setFile] = useState(null);
  const [dir, setDir] = useState("");

  const uploadSingle = async () => {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    await axios.post("/api/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    alert("File uploaded");
  };

  const uploadDir = async () => {
    if (!dir) return;
    await axios.post("/api/upload-directory", { dir });
    alert("Directory uploaded");
  };

  return (
    <div className="mb-4">
      <h2 className="font-semibold mb-2">File Upload</h2>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <button onClick={uploadSingle} className="ml-2 px-3 bg-green-500 text-white rounded">
        Upload File
      </button>
      <div className="mt-2">
        <input
          type="text"
          placeholder="Directory path"
          value={dir}
          onChange={(e) => setDir(e.target.value)}
          className="border p-1"
        />
        <button onClick={uploadDir} className="ml-2 px-3 bg-indigo-500 text-white rounded">
          Upload Directory
        </button>
      </div>
    </div>
  );
}
