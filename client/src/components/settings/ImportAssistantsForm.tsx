import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { Loader2, Download, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

// Define the schema for API key input form
const apiKeyImportSchema = z.object({
  apiKey: z.string().min(1, "API Key is required")
});

// Define types for API responses
interface OpenAIAssistant {
  id: string;
  name: string;
  description: string | null;
  model: string;
  instructions: string | null;
  fileIds?: string[];
  // Add other fields as needed
}

interface ImportAssistantsFormProps {
  onSuccess: () => void;
}

export function ImportAssistantsForm({ onSuccess }: ImportAssistantsFormProps) {
  const { toast } = useToast();
  const [assistants, setAssistants] = useState<OpenAIAssistant[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAssistants, setSelectedAssistants] = useState<string[]>([]);
  const [importStep, setImportStep] = useState<'enter-key' | 'select-assistants' | 'importing'>('enter-key');

  // Form for API key
  const form = useForm({
    resolver: zodResolver(apiKeyImportSchema),
    defaultValues: {
      apiKey: ""
    }
  });

  // Fetch assistants mutation
  const fetchAssistantsMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("POST", "/api/assistants/fetch-from-openai", { apiKey });
      return res.json() as Promise<OpenAIAssistant[]>;
    },
    onSuccess: (data) => {
      setAssistants(data);
      setImportStep('select-assistants');
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to fetch assistants",
        description: error.message || "Could not connect to OpenAI API. Please check your API key.",
        variant: "destructive",
      });
    }
  });

  // Import assistants mutation
  const importAssistantsMutation = useMutation({
    mutationFn: async ({ assistantIds, apiKey }: { assistantIds: string[], apiKey: string }) => {
      const res = await apiRequest("POST", "/api/assistants/import-batch-from-openai", { 
        assistantIds, 
        apiKey 
      });
      return res.json();
    },
    onSuccess: (data) => {
      const { imported, failed } = data;
      
      toast({
        title: "Assistants imported",
        description: `Successfully imported ${imported.length} assistant${imported.length !== 1 ? 's' : ''}${failed.length > 0 ? ` (${failed.length} failed)` : ''}.`,
        variant: failed.length > 0 ? "default" : "default",
      });
      
      // Reset form and state
      form.reset();
      setAssistants([]);
      setSelectedAssistants([]);
      setImportStep('enter-key');
      
      // Call parent success callback
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to import assistants",
        description: error.message || "An error occurred while importing assistants",
        variant: "destructive",
      });
    }
  });

  const onSubmitApiKey = (data: { apiKey: string }) => {
    fetchAssistantsMutation.mutate(data.apiKey);
  };

  const handleImportSelected = () => {
    if (selectedAssistants.length === 0) {
      toast({
        title: "No assistants selected",
        description: "Please select at least one assistant to import",
        variant: "destructive",
      });
      return;
    }

    setImportStep('importing');
    const apiKey = form.getValues("apiKey");
    importAssistantsMutation.mutate({ 
      assistantIds: selectedAssistants, 
      apiKey 
    });
  };

  const toggleAssistant = (assistantId: string) => {
    setSelectedAssistants(prev => 
      prev.includes(assistantId)
        ? prev.filter(id => id !== assistantId)
        : [...prev, assistantId]
    );
  };

  const toggleAllAssistants = () => {
    if (selectedAssistants.length === assistants.length) {
      // If all are selected, unselect all
      setSelectedAssistants([]);
    } else {
      // Otherwise, select all
      setSelectedAssistants(assistants.map(a => a.id));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Assistants from OpenAI</CardTitle>
        <CardDescription>
          Import your existing assistants from the OpenAI platform into this application
        </CardDescription>
      </CardHeader>
      <CardContent>
        {importStep === 'enter-key' && (
          <form id="import-api-key-form" onSubmit={form.handleSubmit(onSubmitApiKey)} className="space-y-4">
            <div>
              <Label htmlFor="apiKey">Your OpenAI API Key</Label>
              <Input
                id="apiKey"
                type="password"
                autoComplete="off"
                className="mt-1"
                {...form.register("apiKey")}
              />
              {form.formState.errors.apiKey && (
                <p className="text-sm text-red-500 mt-1">
                  {form.formState.errors.apiKey.message}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Your API key is only used for this import operation and won't be stored. For security, we need you to enter it again for this specific task.
              </p>
            </div>
          </form>
        )}

        {importStep === 'select-assistants' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium">Available Assistants</h3>
              <div className="flex items-center gap-2">
                <Checkbox 
                  id="select-all"
                  checked={selectedAssistants.length === assistants.length && assistants.length > 0}
                  onCheckedChange={toggleAllAssistants}
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer">
                  {selectedAssistants.length === assistants.length && assistants.length > 0 
                    ? "Deselect All" 
                    : "Select All"}
                </label>
              </div>
            </div>

            {assistants.length === 0 ? (
              <div className="text-center py-8">
                <p>No assistants found in your OpenAI account.</p>
              </div>
            ) : (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Select</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead className="hidden md:table-cell">Description</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assistants.map((assistant) => (
                      <TableRow key={assistant.id}>
                        <TableCell>
                          <Checkbox 
                            checked={selectedAssistants.includes(assistant.id)}
                            onCheckedChange={() => toggleAssistant(assistant.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{assistant.name || "Unnamed Assistant"}</TableCell>
                        <TableCell>{assistant.model}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          {assistant.description ? (
                            <span className="line-clamp-1">{assistant.description}</span>
                          ) : (
                            <span className="text-muted-foreground italic">No description</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div className="text-sm text-muted-foreground mt-2">
              Selected {selectedAssistants.length} of {assistants.length} assistants
            </div>
          </div>
        )}

        {importStep === 'importing' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p>Importing selected assistants...</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        {importStep === 'enter-key' && (
          <Button 
            type="submit" 
            form="import-api-key-form"
            disabled={fetchAssistantsMutation.isPending}
          >
            {fetchAssistantsMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Fetch Assistants
              </>
            )}
          </Button>
        )}

        {importStep === 'select-assistants' && (
          <>
            <Button 
              variant="outline" 
              onClick={() => setImportStep('enter-key')}
            >
              Back
            </Button>
            <Button 
              onClick={handleImportSelected}
              disabled={selectedAssistants.length === 0 || importAssistantsMutation.isPending}
            >
              {importAssistantsMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Import Selected
                </>
              )}
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
}