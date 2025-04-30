import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Trash2, 
  Plus, 
  Edit, 
  Star, 
  Check, 
  Loader2,
  AlertTriangle
} from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Assistant } from "@shared/schema";

// We need to extend the Assistant type to include the isDefault flag
// that our backend adds
interface AssistantWithDefault extends Assistant {
  isDefault: boolean;
}

interface AssistantsListProps {
  onCreateNew: () => void;
}

export function AssistantsList({ onCreateNew }: AssistantsListProps) {
  const { toast } = useToast();

  // Fetch all user assistants
  const { 
    data: assistants, 
    isLoading, 
    error, 
    refetch 
  } = useQuery<AssistantWithDefault[]>({
    queryKey: ["/api/assistants"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/assistants");
      return res.json();
    },
  });

  // Mutation for setting default assistant
  const setDefaultMutation = useMutation({
    mutationFn: async (assistantId: number) => {
      const res = await apiRequest("POST", "/api/settings/default-assistant", { assistantId });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Default assistant updated",
        description: "Your default assistant has been updated successfully",
      });
      // Refresh the assistants list to show the updated default status
      queryClient.invalidateQueries({ queryKey: ["/api/assistants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update default assistant",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mutation for deleting an assistant
  const deleteAssistantMutation = useMutation({
    mutationFn: async (assistantId: number) => {
      await apiRequest("DELETE", `/api/assistants/${assistantId}`);
    },
    onSuccess: () => {
      toast({
        title: "Assistant deleted",
        description: "The assistant has been deleted successfully",
      });
      // Refresh the assistants list
      queryClient.invalidateQueries({ queryKey: ["/api/assistants"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to delete assistant",
        description: error.message || "An error occurred. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center p-4">
            <AlertTriangle className="h-12 w-12 text-destructive mb-2" />
            <h3 className="text-lg font-medium mb-2">Failed to load assistants</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error instanceof Error ? error.message : "An error occurred while loading your assistants."}
            </p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!assistants || assistants.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center text-center p-4">
            <h3 className="text-lg font-medium mb-2">No assistants found</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You haven't created any assistants yet. Create your first assistant to get started.
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Assistant
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Your Assistants</h3>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create New
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {assistants.map((assistant) => (
          <Card key={assistant.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-semibold truncate">
                  {assistant.name}
                </CardTitle>
                {assistant.isDefault && (
                  <Badge variant="default" className="ml-2 h-6">
                    <Check className="h-3 w-3 mr-1" /> Default
                  </Badge>
                )}
              </div>
              {assistant.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {assistant.description}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Model:</span>
                  <span className="font-medium">{assistant.model}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Temperature:</span>
                  <span className="font-medium">{assistant.temperature}</span>
                </div>
                {assistant.openaiAssistantId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OpenAI ID:</span>
                    <span className="font-mono text-xs truncate max-w-[150px]">
                      {assistant.openaiAssistantId}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 pt-3 pb-3 px-6 flex justify-between">
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {/* Handle edit - will be implemented later */}}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Assistant</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this assistant? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteAssistantMutation.mutate(assistant.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        {deleteAssistantMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          "Delete"
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              
              {!assistant.isDefault && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setDefaultMutation.mutate(assistant.id)}
                  disabled={setDefaultMutation.isPending}
                >
                  {setDefaultMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Star className="h-4 w-4 mr-1" />
                      Set Default
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}