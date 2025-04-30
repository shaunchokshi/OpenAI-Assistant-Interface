import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialog } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Loader2,
  File,
  FileText,
  FileCode,
  FileImage,
  FilePlus,
  FileX,
  MoreVertical,
  Download,
  Trash2,
  Search,
  Info,
  Link,
  Check,
  X
} from "lucide-react";
import FileUploader from "./FileUploader";

// Type for file objects returned from API
type FileObject = {
  id: number;
  openaiFileId: string;
  userId: number;
  filename: string;
  purpose: string;
  bytes: number;
  assistantId: number | null;
  createdAt: string;
  status?: string;
};

// Helper function to format file size
const formatBytes = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Helper function to determine icon based on filename
const getFileIcon = (filename: string) => {
  const extension = filename.split('.').pop()?.toLowerCase();
  
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension as string)) {
    return <FileImage className="h-5 w-5" />;
  }
  
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'c', 'cpp', 'go', 'rb', 'php', 'html', 'css'].includes(extension as string)) {
    return <FileCode className="h-5 w-5" />;
  }
  
  if (['txt', 'md', 'pdf', 'doc', 'docx', 'rtf'].includes(extension as string)) {
    return <FileText className="h-5 w-5" />;
  }
  
  return <File className="h-5 w-5" />;
};

export default function FileManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<FileObject | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch user files
  const {
    data: files = [],
    isLoading,
    isError,
    error,
  } = useQuery<FileObject[], Error>({
    queryKey: ["/api/files"],
    enabled: !!user, // Only fetch if user is logged in
  });

  // File deletion mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const res = await apiRequest("DELETE", `/api/files/${fileId}`);
      return await res.json();
    },
    onSuccess: () => {
      // Invalidate files cache to refresh list
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      
      toast({
        title: "File deleted",
        description: "The file has been removed from your account.",
      });
      
      // Close the delete dialog
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete file",
        description: error.message || "There was an error deleting the file.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (file: FileObject) => {
    setSelectedFile(file);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedFile) {
      deleteFileMutation.mutate(selectedFile.id);
    }
  };

  const handleFileUploaded = () => {
    // Refresh file list
    queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    // Close dialog
    setIsUploadDialogOpen(false);
    setIsUploading(false);
  };

  if (isError) {
    return (
      <div className="p-8 text-center">
        <div className="mb-4 text-red-500">
          <X className="mx-auto h-12 w-12" />
        </div>
        <h3 className="text-lg font-medium">Failed to load files</h3>
        <p className="text-muted-foreground mb-4">
          {error instanceof Error ? error.message : "An unknown error occurred."}
        </p>
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/files"] })}
        >
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Files</h2>
        <Button onClick={() => setIsUploadDialogOpen(true)}>
          <FilePlus className="mr-2 h-4 w-4" />
          Upload File
        </Button>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          // Loading state
          <Card>
            <CardContent className="p-6">
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-[250px]" />
                      <Skeleton className="h-4 w-[200px]" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : files.length === 0 ? (
          // Empty state
          <Card>
            <CardContent className="p-10 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No files uploaded</h3>
              <p className="text-muted-foreground mb-4">
                Upload files to use with your OpenAI assistants.
              </p>
              <Button onClick={() => setIsUploadDialogOpen(true)}>
                <FilePlus className="mr-2 h-4 w-4" />
                Upload your first file
              </Button>
            </CardContent>
          </Card>
        ) : (
          // File list
          <Card>
            <CardHeader>
              <CardTitle>Your Files</CardTitle>
              <CardDescription>
                Manage files uploaded to OpenAI for use with assistants.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {files.map((file) => (
                      <TableRow key={file.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center space-x-2">
                            {getFileIcon(file.filename)}
                            <span className="truncate max-w-[200px]">
                              {file.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {file.purpose}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatBytes(file.bytes)}</TableCell>
                        <TableCell>
                          {new Date(file.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(file)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
            <CardFooter className="border-t p-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>
                  Files are stored on OpenAI's servers and subject to their usage policies.
                </span>
              </div>
            </CardFooter>
          </Card>
        )}
      </div>

      {/* File Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload a file to use with your OpenAI assistants.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <FileUploader 
              onUploadStart={() => setIsUploading(true)}
              onUploadComplete={handleFileUploaded}
              onUploadError={(errorMsg: string) => {
                toast({
                  title: "Upload failed",
                  description: errorMsg,
                  variant: "destructive",
                });
                setIsUploading(false);
              }}
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-between">
            <div className="text-xs text-muted-foreground mb-4 sm:mb-0">
              <div className="flex items-center gap-1">
                <Info className="h-3 w-3" />
                <span>Max file size: 50MB. PDF, text, and code files recommended.</span>
              </div>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <span className="font-semibold">{selectedFile?.filename}</span>{" "}
              from your account and OpenAI. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteFileMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleteFileMutation.isPending}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {deleteFileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}