import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, UploadCloud } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type FileUploaderProps = {
  onUploadStart: () => void;
  onUploadComplete: () => void;
  onUploadError: (message: string) => void;
  assistantId?: number;
  purpose?: "assistants" | "fine-tuning" | "assistants_output";
};

export default function FileUploader({
  onUploadStart,
  onUploadComplete,
  onUploadError,
  assistantId,
  purpose = "assistants"
}: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadMutation = useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: string }) => {
      onUploadStart();
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", purpose);
      
      if (assistantId) {
        formData.append("assistantId", assistantId.toString());
      }
      
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });
      
      // Return a promise that resolves when upload completes
      return new Promise((resolve, reject) => {
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4) {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const response = JSON.parse(xhr.responseText);
                resolve(response);
              } catch (e) {
                reject(new Error("Invalid server response"));
              }
            } else {
              try {
                const errorData = JSON.parse(xhr.responseText);
                reject(new Error(errorData.error || "Upload failed"));
              } catch (e) {
                reject(new Error(`Upload failed with status ${xhr.status}`));
              }
            }
          }
        };
        
        xhr.open("POST", "/api/files/upload", true);
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      setFile(null);
      setUploadProgress(0);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onUploadComplete();
    },
    onError: (error: Error) => {
      onUploadError(error.message);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleUpload = () => {
    if (file) {
      uploadMutation.mutate({ file, purpose });
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center ${
          file ? "border-primary" : "border-gray-300"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <input
          type="file"
          className="hidden"
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={uploadMutation.isPending}
        />
        
        {!file ? (
          <div className="space-y-3">
            <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-medium">
                Drag and drop a file or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports text files, PDFs, and other formats compatible with OpenAI
              </p>
            </div>
            <Button 
              variant="secondary" 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadMutation.isPending}
            >
              Select File
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-sm font-medium truncate max-w-full px-4">
              {file.name}
            </div>
            <p className="text-xs text-muted-foreground">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            
            {uploadMutation.isPending ? (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  Uploading... {uploadProgress}%
                </p>
              </div>
            ) : (
              <div className="space-x-2">
                <Button 
                  variant="default" 
                  onClick={handleUpload}
                >
                  Upload
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {uploadMutation.isPending && (
        <div className="flex items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Uploading to OpenAI...
        </div>
      )}
    </div>
  );
}