import React, { useState, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Upload, File, X, Check } from "lucide-react";

type FileUploaderProps = {
  onUploadStart: () => void;
  onUploadComplete: () => void;
  onUploadError: (message: string) => void;
};

const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadStart,
  onUploadComplete,
  onUploadError,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [purpose, setPurpose] = useState<string>("assistants");
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  // File upload mutation
  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, purpose }: { file: File; purpose: string }) => {
      onUploadStart();
      setIsUploading(true);
      setUploadError(null);
      setProgress(0);
      
      // Create FormData object
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", purpose);
      
      // Use XMLHttpRequest to track upload progress
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setProgress(percentComplete);
          }
        });
        
        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              const errorResponse = JSON.parse(xhr.responseText);
              reject(new Error(errorResponse.error || "Upload failed"));
            } catch (e) {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });
        
        xhr.addEventListener("error", () => {
          reject(new Error("Network error occurred during upload"));
        });
        
        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"));
        });
        
        xhr.open("POST", "/api/files/upload");
        xhr.withCredentials = true;
        xhr.send(formData);
      });
    },
    onSuccess: () => {
      setUploadSuccess(true);
      setIsUploading(false);
      setTimeout(() => {
        setFile(null);
        setProgress(0);
        setUploadSuccess(false);
        onUploadComplete();
      }, 1500);
    },
    onError: (error: Error) => {
      setIsUploading(false);
      setUploadError(error.message);
      onUploadError(error.message);
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      // Validate file size
      if (selectedFile.size > 50 * 1024 * 1024) { // 50MB limit
        setUploadError("File size exceeds 50MB limit");
        return;
      }
      setFile(selectedFile);
      setUploadError(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      // Validate file size
      if (droppedFile.size > 50 * 1024 * 1024) { // 50MB limit
        setUploadError("File size exceeds 50MB limit");
        return;
      }
      setFile(droppedFile);
      setUploadError(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setUploadError("Please select a file to upload");
      return;
    }
    
    uploadFileMutation.mutate({ file, purpose });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const removeFile = () => {
    setFile(null);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  if (uploadSuccess) {
    return (
      <div className="flex flex-col items-center justify-center py-6 text-center">
        <div className="bg-green-50 rounded-full p-3 mb-4">
          <Check className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="text-lg font-medium mb-1">Upload Complete</h3>
        <p className="text-muted-foreground">
          Your file has been successfully uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {file ? (
        <div className="border rounded-md p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <File className="h-5 w-5" />
              <div className="truncate max-w-[200px]">
                <p className="font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={removeFile}
              className="text-muted-foreground hover:text-foreground"
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          {isUploading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-center text-muted-foreground">
                Uploading... {progress}%
              </p>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={triggerFileInput}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">Choose a file or drag & drop</h3>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              PDF, text files, and code files work best. Maximum file size is 50MB.
            </p>
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerFileInput();
              }}
            >
              Browse Files
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="purpose">Purpose</Label>
          <Select value={purpose} onValueChange={setPurpose}>
            <SelectTrigger id="purpose">
              <SelectValue placeholder="Select purpose" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="assistants">Assistants (default)</SelectItem>
              <SelectItem value="fine-tuning">Fine-tuning</SelectItem>
              <SelectItem value="assistants_output">Assistants output</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">
            Choose how you want to use this file with OpenAI.
          </p>
        </div>
        
        {uploadError && (
          <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
            <p>{uploadError}</p>
          </div>
        )}
        
        <Button
          type="button"
          className="w-full"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            'Upload File'
          )}
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;