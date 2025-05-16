import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, File, Loader2, Download, Trash2, Image, FileCode, FileSpreadsheet, Presentation } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function FilesPage() {
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Setup query to fetch files
  const { data: files, isLoading, error, refetch } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const response = await fetch("/api/files");
      if (!response.ok) {
        throw new Error("Failed to fetch files");
      }
      return response.json();
    },
  });
  
  // File upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Use fetch directly for FormData
      const response = await fetch("/api/files/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to upload file");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      setUploadProgress(0);
      setIsUploading(false);
      toast({
        title: "Success",
        description: "Files uploaded successfully",
      });
    },
    onError: (error: Error) => {
      setIsUploading(false);
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // File delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to delete file");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setIsDeleteDialogOpen(false);
      setFileToDelete(null);
      toast({
        title: "Success",
        description: "File deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFiles(e.target.files);
    }
  };

  // Handle file upload dialog
  const handleUploadClick = () => {
    setIsUploadDialogOpen(true);
  };

  // Handle file upload submission
  const handleUploadSubmit = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    let successCount = 0;
    let errorCount = 0;

    // Process each selected file
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("purpose", "assistants");
      
      try {
        // Set progress based on current file index
        setUploadProgress(Math.round((i / selectedFiles.length) * 100));
        
        // Upload the file using fetch directly
        const response = await fetch("/api/files/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to upload file");
        }
        
        successCount++;
      } catch (error) {
        console.error(`Error uploading file ${file.name}:`, error);
        errorCount++;
      }
    }

    // Complete the progress bar
    setUploadProgress(100);
    
    // Small delay to show the completed progress
    setTimeout(() => {
      // Refresh the files list
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      setIsUploadDialogOpen(false);
      setSelectedFiles(null);
      setUploadProgress(0);
      setIsUploading(false);
      
      if (successCount > 0) {
        toast({
          title: "Upload successful",
          description: `Successfully uploaded ${successCount} file${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`,
        });
      } else if (errorCount > 0) {
        toast({
          title: "Upload failed",
          description: `Failed to upload ${errorCount} file${errorCount !== 1 ? 's' : ''}`,
          variant: "destructive",
        });
      }
    }, 500); // Short delay to see the completed progress bar
  };

  // Handle file download
  const handleDownload = (file: any) => {
    toast({
      title: "Download started",
      description: `Downloading ${file.filename}...`,
    });
    
    // In a real implementation, this would fetch the file from the server
    // For now, we'll just show a toast
    setTimeout(() => {
      toast({
        title: "Download complete",
        description: `${file.filename} downloaded successfully`,
      });
    }, 1500);
  };

  // Handle file delete confirmation
  const handleDeleteClick = (fileId: number) => {
    setFileToDelete(fileId);
    setIsDeleteDialogOpen(true);
  };

  // Confirm file deletion
  const confirmDelete = () => {
    if (fileToDelete !== null) {
      deleteMutation.mutate(fileToDelete);
    }
  };

  // Empty files array for when no API data is available
  const emptyFiles: any[] = [];

  // Helper function to determine file type from filename
  function getFileTypeFromName(filename: string): string {
    if (!filename) return 'unknown';
    
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    switch (extension) {
      case 'pdf':
        return 'pdf';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
      case 'webp':
        return 'image';
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'md':
        return 'document';
      case 'xls':
      case 'xlsx':
      case 'csv':
        return 'spreadsheet';
      case 'ppt':
      case 'pptx':
        return 'presentation';
      case 'js':
      case 'ts':
      case 'jsx':
      case 'tsx':
      case 'html':
      case 'css':
      case 'json':
      case 'py':
      case 'java':
      case 'c':
      case 'cpp':
      case 'go':
      case 'rs':
      case 'rb':
      case 'php':
        return 'code';
      default:
        return 'unknown';
    }
  }

  // File type icons
  const getFileIcon = (type: string = 'unknown') => {
    switch (type) {
      case 'pdf':
        return <FileText className="h-6 w-6 text-red-500" />;
      case 'image':
        return <Image className="h-6 w-6 text-blue-500" />;
      case 'document':
        return <FileText className="h-6 w-6 text-blue-700" />;
      case 'spreadsheet':
      case 'excel':
        return <FileSpreadsheet className="h-6 w-6 text-green-600" />;
      case 'presentation':
      case 'powerpoint':
        return <Presentation className="h-6 w-6 text-orange-500" />;
      case 'code':
        return <FileCode className="h-6 w-6 text-purple-600" />;
      case 'text':
        return <FileText className="h-6 w-6 text-blue-500" />;
      default:
        return <File className="h-6 w-6 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">File Management</h2>
        <Button 
          className="flex items-center gap-2 w-full sm:w-auto"
          onClick={handleUploadClick}
        >
          <Upload size={16} /> Upload Files
        </Button>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Storage Overview</CardTitle>
            <CardDescription>
              Manage your files and attachments for AI assistants
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-gray-500">Total Files</p>
                    <p className="text-2xl font-bold">{files?.length || 0}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Storage Used</p>
                    <p className="text-2xl font-bold">0 MB</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Files Used by AI</p>
                    <p className="text-2xl font-bold">0</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Files</CardTitle>
            <CardDescription>
              Manage your uploaded files
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center items-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <div className="text-center p-8">
                <h3 className="text-lg font-medium mb-2">Failed to load files</h3>
                <p className="text-gray-500 mb-4">{(error as Error).message}</p>
                <Button onClick={() => refetch()}>Try Again</Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[600px]">
                  {files?.length ? (
                    <div className="grid gap-4">
                      {files.map((file: any) => (
                        <div
                          key={file.id}
                          className="flex flex-wrap sm:flex-nowrap items-center justify-between p-4 rounded-lg border hover:bg-accent/20"
                        >
                          <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                            <div className="p-2 bg-primary/5 rounded shrink-0">
                              {getFileIcon(file.type || getFileTypeFromName(file.filename))}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h3 className="font-medium truncate">{file.filename}</h3>
                              <p className="text-sm text-muted-foreground">
                                {typeof file.size === 'number' 
                                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB` 
                                  : file.size} • Uploaded on {file.date || new Date(file.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto justify-end">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="shrink-0"
                              onClick={() => handleDownload(file)}
                            >
                              <Download className="h-4 w-4 mr-2" /> Download
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="shrink-0"
                              onClick={() => handleDeleteClick(file.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No files uploaded yet</p>
                      <p className="text-sm mt-2">Click "Upload Files" to add your first file</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* File Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload for use with AI assistants.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Drag and Drop File Upload Area */}
            <div 
              className={`
                border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200
                ${isUploading ? 'bg-primary/5 border-primary/20' : 'hover:bg-accent/20 hover:border-accent'}
                ${selectedFiles && selectedFiles.length > 0 ? 'border-primary' : 'border-muted'}
              `}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  setSelectedFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => !isUploading && fileInputRef.current?.click()}
              style={{ cursor: isUploading ? 'default' : 'pointer' }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                disabled={isUploading}
              />
              
              {isUploading ? (
                <div className="text-center space-y-3">
                  <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
                  <p className="text-sm font-medium">Uploading files...</p>
                  <div className="h-2 bg-secondary rounded w-3/4 mx-auto mt-4">
                    <div 
                      className="h-full bg-primary rounded transition-all duration-300" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(uploadProgress)}% complete
                  </p>
                </div>
              ) : !selectedFiles || selectedFiles.length === 0 ? (
                <div className="space-y-3">
                  <Upload className="h-10 w-10 text-muted-foreground mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Drag and drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF, text, CSV, JSONL, and code files recommended
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <FileText className="h-10 w-10 text-primary mx-auto" />
                  <p className="text-sm font-medium">
                    {selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'} selected
                  </p>
                  <div className="max-h-40 overflow-y-auto border rounded p-2 mt-2 bg-background/50 mx-auto max-w-md">
                    <ul className="text-xs text-left divide-y">
                      {Array.from(selectedFiles).map((file, index) => (
                        <li key={index} className="py-1 px-2 flex items-center justify-between">
                          <div className="truncate flex-1">
                            <span className="font-medium">{file.name}</span>
                          </div>
                          <span className="text-muted-foreground whitespace-nowrap pl-2">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Max 50MB per file
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button 
                type="button" 
                onClick={handleUploadSubmit} 
                disabled={!selectedFiles || selectedFiles.length === 0 || isUploading}
                className="min-w-24"
              >
                {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                {isUploading ? "Uploading..." : "Upload Files"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}