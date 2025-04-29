import { useState } from "react";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

export default function FileUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [directoryPath, setDirectoryPath] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUploadSingleFile = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await fetch("/api/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      toast({
        title: "File uploaded",
        description: "File has been uploaded successfully",
      });
      setFile(null);
    } catch (error) {
      console.error("Error uploading file:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadDirectory = async () => {
    if (!directoryPath) {
      toast({
        title: "No directory specified",
        description: "Please enter a directory path",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      await apiRequest("POST", "/api/upload-directory", { dir: directoryPath });
      
      toast({
        title: "Directory uploaded",
        description: "Directory files have been uploaded successfully",
      });
      setDirectoryPath("");
    } catch (error) {
      console.error("Error uploading directory:", error);
      toast({
        title: "Upload failed",
        description: "Failed to upload directory. Please check the path and try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <CardTitle className="text-lg font-medium text-gray-900 mb-4">Upload Files</CardTitle>
        
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Single File</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <Input
                type="file"
                onChange={handleFileChange}
                disabled={isUploading}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleUploadSingleFile}
              disabled={!file || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Upload
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Upload Directory</h4>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-grow">
              <Input
                type="text"
                placeholder="/path/to/directory"
                value={directoryPath}
                onChange={(e) => setDirectoryPath(e.target.value)}
                disabled={isUploading}
                className="w-full"
              />
            </div>
            <Button
              onClick={handleUploadDirectory}
              disabled={!directoryPath || isUploading}
              className="w-full sm:w-auto"
            >
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Upload
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
