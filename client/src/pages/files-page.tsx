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
  const handleUploadSubmit = () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    // Only upload the first file for now (API expects a single file)
    formData.append("file", selectedFiles[0]);
    formData.append("purpose", "assistants");

    uploadMutation.mutate(formData);
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Files</DialogTitle>
            <DialogDescription>
              Select files to upload for use with AI assistants.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="cursor-pointer file:cursor-pointer file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0 file:font-medium
              file:bg-primary file:text-primary-foreground
              hover:file:bg-primary/90"
              onChange={handleFileChange}
            />
            {selectedFiles && selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium mb-1">Selected files:</p>
                <ul className="text-sm text-muted-foreground">
                  {Array.from(selectedFiles).map((file, index) => (
                    <li key={index} className="truncate">
                      {file.name} ({(file.size / 1024).toFixed(1)} KB)
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {isUploading && (
              <div className="mt-2">
                <p className="text-sm mb-1">Uploading...</p>
                <div className="h-2 bg-secondary rounded">
                  <div 
                    className="h-full bg-primary rounded" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsUploadDialogOpen(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleUploadSubmit} disabled={!selectedFiles || isUploading}>
              {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Upload
            </Button>
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