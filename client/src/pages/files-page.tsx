import React, { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, File, Loader2, Download, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function FilesPage() {
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

  // Sample files for demonstration
  const sampleFiles = [
    { id: 1, filename: "product_catalog.pdf", size: "2.3 MB", date: "2025-04-28", type: "pdf" },
    { id: 2, filename: "quarterly_report.xlsx", size: "1.8 MB", date: "2025-04-25", type: "excel" },
    { id: 3, filename: "presentation.pptx", size: "4.5 MB", date: "2025-04-20", type: "powerpoint" },
    { id: 4, filename: "instructions.txt", size: "12 KB", date: "2025-04-18", type: "text" },
    { id: 5, filename: "image.jpg", size: "3.2 MB", date: "2025-04-15", type: "image" },
  ];

  // File type icons
  const getFileIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <File className="text-red-500" />;
      case "excel":
        return <File className="text-green-500" />;
      case "powerpoint":
        return <File className="text-orange-500" />;
      case "text":
        return <FileText className="text-blue-500" />;
      case "image":
        return <File className="text-purple-500" />;
      default:
        return <File className="text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">File Management</h2>
        <Button className="flex items-center gap-2 w-full sm:w-auto">
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
                    <p className="text-2xl font-bold">{sampleFiles.length}</p>
                  </div>
                </div>
              </div>
              <div className="bg-blue-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500">Storage Used</p>
                    <p className="text-2xl font-bold">11.8 MB</p>
                  </div>
                </div>
              </div>
              <div className="bg-green-100 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500">Files Used by AI</p>
                    <p className="text-2xl font-bold">3</p>
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
                <div className="grid gap-4 min-w-[600px]">
                  {sampleFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex flex-wrap sm:flex-nowrap items-center justify-between p-4 rounded-lg border hover:bg-accent/20"
                    >
                      <div className="flex items-center gap-3 w-full sm:w-auto mb-3 sm:mb-0">
                        <div className="p-2 bg-primary/5 rounded shrink-0">
                          {getFileIcon(file.type)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="font-medium truncate">{file.filename}</h3>
                          <p className="text-sm text-muted-foreground">
                            {file.size} • Uploaded on {file.date}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto justify-end">
                        <Button variant="ghost" size="sm" className="shrink-0">
                          Download
                        </Button>
                        <Button variant="outline" size="sm" className="shrink-0">
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}