import React from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, LogOut, Trash2 } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";

type Session = {
  id: number;
  userAgent: string;
  ipAddress: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
};

export default function SessionsManager() {
  const { toast } = useToast();
  
  const { data: sessions, isLoading, error } = useQuery<Session[]>({
    queryKey: ["/api/user/sessions"],
    staleTime: 60000, // 1 minute
    queryFn: async () => {
      // Sample session data for demonstration until backend is fully implemented
      return [
        {
          id: 1,
          userAgent: navigator.userAgent,
          ipAddress: "127.0.0.1",
          lastActive: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isCurrent: true
        },
        {
          id: 2,
          userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.3 Mobile/15E148 Safari/604.1",
          ipAddress: "192.168.1.5",
          lastActive: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
          createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), // 3 days ago
          isCurrent: false
        }
      ];
    }
  });
  
  const terminateSessionMutation = useMutation({
    mutationFn: async (sessionId: number) => {
      await apiRequest("DELETE", `/api/user/sessions/${sessionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/sessions"] });
      toast({
        title: "Session terminated",
        description: "The selected session has been terminated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to terminate session",
        description: error.message || "An error occurred while terminating the session.",
        variant: "destructive",
      });
    },
  });
  
  const terminateAllSessionsMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/user/sessions");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/sessions"] });
      toast({
        title: "All sessions terminated",
        description: "All other sessions have been terminated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to terminate sessions",
        description: error.message || "An error occurred while terminating sessions.",
        variant: "destructive",
      });
    },
  });
  
  // Helper function to format the user agent string
  const formatUserAgent = (userAgent: string): string => {
    if (!userAgent) return "Unknown device";
    
    // Extract browser information
    let browser = "Unknown browser";
    let os = "Unknown OS";
    
    if (userAgent.includes("Firefox")) {
      browser = "Firefox";
    } else if (userAgent.includes("Chrome")) {
      browser = "Chrome";
    } else if (userAgent.includes("Safari")) {
      browser = "Safari";
    } else if (userAgent.includes("Edge")) {
      browser = "Edge";
    }
    
    // Extract OS information
    if (userAgent.includes("Windows")) {
      os = "Windows";
    } else if (userAgent.includes("Mac OS")) {
      os = "MacOS";
    } else if (userAgent.includes("Linux")) {
      os = "Linux";
    } else if (userAgent.includes("Android")) {
      os = "Android";
    } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
      os = "iOS";
    }
    
    return `${browser} on ${os}`;
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-4 text-destructive">
        Error loading sessions: {error.message}
      </div>
    );
  }
  
  if (!sessions || sessions.length === 0) {
    return (
      <div className="py-4 text-muted-foreground">
        No active sessions found.
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Active Sessions</h3>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => terminateAllSessionsMutation.mutate()}
          disabled={terminateAllSessionsMutation.isPending || sessions.length <= 1}
        >
          {terminateAllSessionsMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <LogOut className="h-4 w-4 mr-2" />
          )}
          Sign out all other devices
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sessions.map((session) => (
          <Card key={session.id} className={session.isCurrent ? "border-primary" : ""}>
            <CardHeader className="pb-2">
              <CardTitle className="text-md flex justify-between">
                <span>{formatUserAgent(session.userAgent)}</span>
                {session.isCurrent && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full">
                    Current
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                First signed in {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 text-sm text-muted-foreground">
              <div>
                Last active: {formatDistanceToNow(new Date(session.lastActive), { addSuffix: true })}
              </div>
              <div>
                IP: {session.ipAddress || "Unknown"}
              </div>
              <div>
                Sign-in date: {format(new Date(session.createdAt), 'PPP')}
              </div>
            </CardContent>
            <CardFooter>
              {!session.isCurrent && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => terminateSessionMutation.mutate(session.id)}
                  disabled={terminateSessionMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Sign out
                </Button>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}