import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, File, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">File Management</h2>
        <Button className="flex items-center gap-2">
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
              <div className="grid gap-4">
                {sampleFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded">
                        {getFileIcon(file.type)}
                      </div>
                      <div>
                        <h3 className="font-medium">{file.filename}</h3>
                        <p className="text-sm text-gray-500">
                          {file.size} • Uploaded on {file.date}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        Download
                      </Button>
                      <Button variant="outline" size="sm">
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}