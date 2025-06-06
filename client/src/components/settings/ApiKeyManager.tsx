import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Key, ShieldCheck, ShieldAlert } from "lucide-react";

// Type for user configuration response
type UserConfig = {
  hasApiKey: boolean;
  apiKeyAddedAt: string | null;
  defaultAssistantId: number | null;
  assistantsCount: number;
};

export default function ApiKeyManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apiKey, setApiKey] = useState("");
  const [isHidden, setIsHidden] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [userConfig, setUserConfig] = useState<UserConfig | null>(null);
  const [localHasApiKey, setLocalHasApiKey] = useState(false);

  // Fetch user configuration
  useEffect(() => {
    async function fetchUserConfig() {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const response = await fetch("/api/user/config", {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log("User config received:", data);
          setUserConfig(data);
          setLocalHasApiKey(data.hasApiKey || false);
        } else {
          console.error("Failed to fetch user config:", response.statusText);
        }
      } catch (error) {
        console.error("Error fetching user config:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchUserConfig();
  }, [user]);

  // Mutation to update the user's API key
  const updateKeyMutation = useMutation({
    mutationFn: async (key: string) => {
      const res = await apiRequest("POST", "/api/settings/apikey", { apiKey: key });
      return await res.json();
    },
    onSuccess: async () => {
      // Update local state immediately
      setLocalHasApiKey(true);
      
      // Fetch updated config
      try {
        const response = await fetch("/api/user/config", {
          credentials: "include"
        });
        
        if (response.ok) {
          const data = await response.json();
          setUserConfig(data);
        }
      } catch (error) {
        console.error("Error fetching updated user config:", error);
      }
      
      toast({
        title: "API Key Updated",
        description: "Your OpenAI API key has been securely stored.",
      });
      
      // We'll keep the API key visible for user confirmation
      // but we'll set a timeout to clear it after a few seconds
      setTimeout(() => {
        setApiKey("");
      }, 3000);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update API key",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your OpenAI API key.",
        variant: "destructive",
      });
      return;
    }
    
    updateKeyMutation.mutate(apiKey);
  };

  const toggleVisibility = () => {
    setIsHidden(!isHidden);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use our local state that's updated immediately after save
  const hasApiKey = localHasApiKey || (userConfig?.hasApiKey || false);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            OpenAI API Key
          </CardTitle>
          <CardDescription>
            Your API key is required to use OpenAI's services. It is securely stored and never shared.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-md">
              {hasApiKey ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-500" />
                  <div className="text-sm">
                    <span className="font-medium">API Key is set</span>
                    <p className="text-muted-foreground">Your OpenAI API key is securely stored.</p>
                    {userConfig?.apiKeyAddedAt && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Added on: {new Date(userConfig.apiKeyAddedAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <ShieldAlert className="h-5 w-5 text-amber-500" />
                  <div className="text-sm">
                    <span className="font-medium">No API Key set</span>
                    <p className="text-muted-foreground">You need to add your OpenAI API key to use AI features.</p>
                  </div>
                </>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Input
                    type={isHidden ? "password" : "text"}
                    placeholder="Enter your OpenAI API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="pr-20"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 text-xs font-medium"
                    onClick={toggleVisibility}
                  >
                    {isHidden ? "Show" : "Hide"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Your API key should begin with "sk-" and is available in the 
                  <a 
                    href="https://platform.openai.com/api-keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline ml-1"
                  >
                    OpenAI dashboard
                  </a>.
                </p>
              </div>
              
              <Button
                type="submit"
                disabled={updateKeyMutation.isPending}
                className="w-full"
              >
                {updateKeyMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save API Key'
                )}
              </Button>
            </form>
          </div>
        </CardContent>
        <CardFooter className="border-t bg-muted/50 px-6 py-3">
          <p className="text-xs text-muted-foreground">
            Your API key is securely stored as a one-way hash. The actual key is never stored in our database.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}