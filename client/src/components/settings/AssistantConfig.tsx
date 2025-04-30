import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiKeySchema } from "@/lib/validation";
import { Loader2 } from "lucide-react";
import { AssistantsList } from "./AssistantsList";
import { CreateAssistantForm } from "./CreateAssistantForm";

export default function AssistantConfig() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("api-key");

  // API Key Form
  const apiKeyForm = useForm({
    resolver: zodResolver(apiKeySchema),
    defaultValues: {
      apiKey: "",
    },
  });

  // API Key Mutation
  const saveApiKeyMutation = useMutation({
    mutationFn: async (apiKey: string) => {
      const res = await apiRequest("POST", "/api/settings/apikey", { apiKey });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "API Key saved",
        description: "Your OpenAI API key has been saved securely",
      });
      // Clear the form field for security
      apiKeyForm.reset({ apiKey: "" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save API Key",
        description: error.message || "An error occurred while saving your API key",
        variant: "destructive",
      });
    },
  });

  // Function to handle API key submission
  const onApiKeySubmit = (data: { apiKey: string }) => {
    saveApiKeyMutation.mutate(data.apiKey);
  };

  // For checking if the user has set up an API key
  const { isLoading: isCheckingApiKey, data: userConfig } = useQuery({
    queryKey: ["/api/user/config"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/user/config");
        return await res.json();
      } catch (error) {
        // If the API fails, just return a default object
        return { hasApiKey: false };
      }
    },
  });

  return (
    <div>
      <div className="pb-5 border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Assistant Configuration
        </h3>
        <p className="mt-2 max-w-4xl text-sm text-gray-500">
          Configure your OpenAI assistant settings and API credentials
        </p>
      </div>

      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="mt-8 max-w-4xl"
      >
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="api-key">API Key</TabsTrigger>
          <TabsTrigger value="assistants">Your Assistants</TabsTrigger>
          <TabsTrigger value="create-assistant">Create Assistant</TabsTrigger>
        </TabsList>

        {/* API Key Tab */}
        <TabsContent value="api-key">
          <Card>
            <CardContent className="pt-6">
              {isCheckingApiKey ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {userConfig?.hasApiKey && (
                    <div className="mb-6 p-4 bg-green-50 rounded-md border border-green-200">
                      <p className="text-green-700">
                        You currently have an API key set up. For security reasons, we don't display your existing key.
                        Enter a new key below only if you want to change it.
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={apiKeyForm.handleSubmit(onApiKeySubmit)} className="space-y-6">
                    <div>
                      <Label htmlFor="apiKey">OpenAI API Key</Label>
                      <div className="mt-1">
                        <Input
                          id="apiKey"
                          type="password"
                          autoComplete="off"
                          {...apiKeyForm.register("apiKey")}
                        />
                      </div>
                      {apiKeyForm.formState.errors.apiKey && (
                        <p className="text-sm text-red-500 mt-1">
                          {apiKeyForm.formState.errors.apiKey.message}
                        </p>
                      )}
                      <p className="mt-2 text-sm text-gray-500">
                        Your API key is stored securely and never shared. It's used to access the OpenAI API for your assistants.
                      </p>
                    </div>

                    <div className="pt-5">
                      <div className="flex justify-end">
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="mr-3" 
                          onClick={() => apiKeyForm.reset()}
                        >
                          Cancel
                        </Button>
                        <Button 
                          type="submit" 
                          disabled={saveApiKeyMutation.isPending}
                        >
                          {saveApiKeyMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            'Save API Key'
                          )}
                        </Button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assistants Tab */}
        <TabsContent value="assistants">
          <AssistantsList onCreateNew={() => setActiveTab("create-assistant")} />
        </TabsContent>

        {/* Create Assistant Tab */}
        <TabsContent value="create-assistant">
          <CreateAssistantForm 
            onSuccess={() => {
              setActiveTab("assistants");
              // Refresh the assistants list
              queryClient.invalidateQueries({ queryKey: ["/api/assistants"] });
            }} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
