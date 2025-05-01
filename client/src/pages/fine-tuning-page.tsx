import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, Info, Check, X, AlertTriangle, Play, Pause, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";

// Define the model information structure
interface ModelInfo {
  description: string;
  context_length: number;
  training_cost_per_1k: number;
  input_cost_per_1k: number;
  output_cost_per_1k: number;
}

// Define job type
interface FineTuningJob {
  id: number;
  userId: number;
  openaiJobId: string;
  name: string;
  baseModel: string;
  trainingFileId: number;
  validationFileId: number | null;
  status: string;
  fineTunedModelName: string | null;
  trainedTokens: number;
  hyperparameters: Record<string, any>;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

// Define fine-tuned model type
interface FineTunedModel {
  id: number;
  userId: number;
  jobId: number;
  openaiModelId: string;
  name: string;
  baseModel: string;
  isActive: boolean;
  createdAt: string;
}

// Define file type
interface FileData {
  id: number;
  userId: number;
  assistantId: number | null;
  openaiFileId: string;
  filename: string;
  purpose: string;
  bytes: number;
  createdAt: string;
}

// Job creation form schema
const createJobSchema = z.object({
  name: z.string().min(1, "Name is required"),
  baseModel: z.string().min(1, "Base model is required"),
  trainingFileId: z.number().positive("Training file is required"),
  validationFileId: z.number().nullable(),
  hyperparameters: z.record(z.any()).optional()
});

// Job status badge color mapping
const statusColorMap: Record<string, string> = {
  created: "bg-blue-500",
  running: "bg-yellow-500",
  succeeded: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-500",
  validating_files: "bg-purple-500",
};

const FineTuningPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("jobs");
  const [createJobOpen, setCreateJobOpen] = useState(false);

  // Fetch available models
  const { data: availableModels, isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/fine-tuning/models"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fine-tuning/models");
      return await res.json() as Record<string, ModelInfo>;
    }
  });

  // Fetch user's fine-tuning jobs
  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/fine-tuning/jobs"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fine-tuning/jobs");
      return await res.json() as FineTuningJob[];
    }
  });

  // Fetch user's fine-tuned models
  const { data: models, isLoading: modelsDataLoading } = useQuery({
    queryKey: ["/api/fine-tuning/models/custom"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/fine-tuning/models/custom");
      return await res.json() as FineTunedModel[];
    }
  });

  // Fetch user's files
  const { data: files, isLoading: filesLoading } = useQuery({
    queryKey: ["/api/files"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/files");
      return await res.json() as FileData[];
    }
  });

  // Create job mutation
  const createJobMutation = useMutation({
    mutationFn: async (jobData: z.infer<typeof createJobSchema>) => {
      const res = await apiRequest("POST", "/api/fine-tuning/jobs", jobData);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fine-tuning job created successfully",
        variant: "default",
      });
      form.reset();
      setCreateJobOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/fine-tuning/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create fine-tuning job",
        variant: "destructive",
      });
    }
  });

  // Cancel job mutation
  const cancelJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const res = await apiRequest("POST", `/api/fine-tuning/jobs/${jobId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Fine-tuning job cancelled successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fine-tuning/jobs"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to cancel fine-tuning job",
        variant: "destructive",
      });
    }
  });

  // Toggle model status mutation
  const toggleModelStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number, isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/fine-tuning/models/custom/${id}`, { isActive });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Model status updated successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fine-tuning/models/custom"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update model status",
        variant: "destructive",
      });
    }
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: number) => {
      const res = await apiRequest("DELETE", `/api/fine-tuning/models/custom/${modelId}`);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Model deleted successfully",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/fine-tuning/models/custom"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete model",
        variant: "destructive",
      });
    }
  });

  // Setup form
  const form = useForm<z.infer<typeof createJobSchema>>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      name: "",
      baseModel: "",
      trainingFileId: 0,
      validationFileId: null,
      hyperparameters: {}
    }
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof createJobSchema>) => {
    createJobMutation.mutate(values);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Please log in to access fine-tuning features.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Fine-Tuning Management</h1>
        <Button onClick={() => setCreateJobOpen(true)}>Create Fine-Tuning Job</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="jobs">Fine-Tuning Jobs</TabsTrigger>
          <TabsTrigger value="models">Fine-Tuned Models</TabsTrigger>
        </TabsList>
        
        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Fine-Tuning Jobs</CardTitle>
              <CardDescription>
                View and manage your fine-tuning jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              {jobsLoading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : jobs && jobs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Base Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.name}</TableCell>
                        <TableCell>{job.baseModel}</TableCell>
                        <TableCell>
                          <Badge className={statusColorMap[job.status] || "bg-gray-500"}>
                            {job.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(job.createdAt), "PPP")}</TableCell>
                        <TableCell>
                          {["created", "running", "validating_files"].includes(job.status) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => cancelJobMutation.mutate(job.id)}
                              disabled={cancelJobMutation.isPending}
                            >
                              {cancelJobMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <X className="h-4 w-4 mr-1" />
                              )}
                              Cancel
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  <div className="mb-2">
                    <Info className="h-12 w-12 mx-auto text-gray-400" />
                  </div>
                  <p>No fine-tuning jobs found.</p>
                  <p className="text-sm mt-2">
                    Fine-tune a model by uploading a training file and creating a job.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Fine-Tuned Models</CardTitle>
              <CardDescription>
                View and manage your fine-tuned models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {modelsDataLoading ? (
                <div className="flex justify-center p-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : models && models.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Base Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {models.map((model) => (
                      <TableRow key={model.id}>
                        <TableCell className="font-medium">{model.name}</TableCell>
                        <TableCell>{model.baseModel}</TableCell>
                        <TableCell>
                          <Badge className={model.isActive ? "bg-green-500" : "bg-gray-500"}>
                            {model.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>{format(new Date(model.createdAt), "PPP")}</TableCell>
                        <TableCell className="space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleModelStatusMutation.mutate({
                              id: model.id,
                              isActive: !model.isActive
                            })}
                            disabled={toggleModelStatusMutation.isPending}
                          >
                            {toggleModelStatusMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : model.isActive ? (
                              <Pause className="h-4 w-4 mr-1" />
                            ) : (
                              <Play className="h-4 w-4 mr-1" />
                            )}
                            {model.isActive ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => deleteModelMutation.mutate(model.id)}
                            disabled={deleteModelMutation.isPending}
                          >
                            {deleteModelMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash className="h-4 w-4 mr-1" />
                            )}
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center p-6 text-gray-500">
                  <div className="mb-2">
                    <Info className="h-12 w-12 mx-auto text-gray-400" />
                  </div>
                  <p>No fine-tuned models found.</p>
                  <p className="text-sm mt-2">
                    Create a fine-tuning job to generate custom models.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Fine-Tuning Job Dialog */}
      <Dialog open={createJobOpen} onOpenChange={setCreateJobOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Fine-Tuning Job</DialogTitle>
            <DialogDescription>
              Create a new fine-tuning job by providing the details below.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="My Fine-Tuned Model" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseModel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Model</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {modelsLoading ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          availableModels && Object.entries(availableModels).map(([id, info]) => (
                            <SelectItem key={id} value={id}>
                              {id} - {info.description.substring(0, 30)}...
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    {field.value && availableModels && (
                      <FormDescription>
                        Training cost: ${availableModels[field.value]?.training_cost_per_1k} per 1K tokens
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="trainingFileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Training File</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(parseInt(value))} 
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a file" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filesLoading ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          files && files.map((file) => (
                            <SelectItem key={file.id} value={file.id.toString()}>
                              {file.filename}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The file must be in JSONL format with prompt-completion pairs
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="validationFileId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Validation File (Optional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value ? parseInt(value) : null)} 
                      defaultValue={field.value ? field.value.toString() : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a file (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {filesLoading ? (
                          <div className="flex justify-center p-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          files && files.map((file) => (
                            <SelectItem key={file.id} value={file.id.toString()}>
                              {file.filename}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Used to evaluate the model during training
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={createJobMutation.isPending || form.formState.isSubmitting}
                >
                  {createJobMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...</>
                  ) : (
                    "Create Job"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FineTuningPage;