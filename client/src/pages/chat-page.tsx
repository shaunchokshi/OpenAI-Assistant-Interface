import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Send, Bot, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";

// Define assistant type
interface Assistant {
  id: number;
  name: string;
  description: string | null;
  model: string;
  temperature: number;
  isDefault: boolean;
}

export default function ChatPage() {
  const { user } = useAuth();
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [selectedAssistantId, setSelectedAssistantId] = useState<number | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [isLoadingAssistants, setIsLoadingAssistants] = useState(false);
  const { toast } = useToast();

  // Function to handle starting a new chat
  const handleNewChat = () => {
    setIsNewChatOpen(true);
  };

  // Function to handle chat creation
  const handleCreateChat = () => {
    toast({
      title: "New Chat Created",
      description: `Started a new chat ${selectedAssistant ? `with ${selectedAssistant}` : ''}`,
    });
    setIsNewChatOpen(false);
    setActiveChatId(Date.now()); // Using timestamp as temp ID
    // Don't reset the selected assistant here to keep it for the new chat
  };

  // Function to handle clicking on a conversation
  const handleConversationClick = (id: number) => {
    setActiveChatId(id);
    toast({
      title: "Conversation Opened",
      description: `Opened conversation ${id}`,
    });
  };

  // Function to handle assistant selection
  const handleAssistantClick = (assistant: Assistant) => {
    setSelectedAssistant(assistant.name);
    setSelectedAssistantId(assistant.id);
    toast({
      title: "Assistant Selected",
      description: `Selected ${assistant.name}`,
    });
    setIsNewChatOpen(true);
  };
  
  // Function to fetch assistants from the API
  const fetchAssistants = async () => {
    if (!user) return;
    
    setIsLoadingAssistants(true);
    try {
      const response = await fetch('/api/assistants', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched assistants:', data);
        setAssistants(data);
      } else {
        console.error('Failed to fetch assistants:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching assistants:', error);
    } finally {
      setIsLoadingAssistants(false);
    }
  };
  
  // Fetch assistants when the component mounts
  useEffect(() => {
    fetchAssistants();
  }, [user]);

  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">Chat with AI</h2>
        <Button 
          className="flex items-center gap-2 w-full sm:w-auto"
          onClick={handleNewChat}
        >
          <Plus size={16} /> New Chat
        </Button>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Recent Conversations */}
        <Card className="col-span-1 lg:col-span-2 w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>
              Pick up where you left off or start a new conversation
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-4 min-w-[300px]">
              <div className="text-center py-8 text-muted-foreground">
                <p>No conversations yet</p>
                <p className="text-sm mt-2">Start a new chat to begin</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Assistants */}
        <Card className="w-full overflow-hidden">
          <CardHeader>
            <CardTitle>Your Assistants</CardTitle>
            <CardDescription>
              Available AI assistants you've configured
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <div className="space-y-4 min-w-[250px]">
              {isLoadingAssistants ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : assistants.length > 0 ? (
                <div className="grid gap-2">
                  {assistants.map((assistant) => (
                    <Button
                      key={assistant.id}
                      variant="outline"
                      className="w-full justify-start text-left h-auto py-3"
                      onClick={() => handleAssistantClick(assistant)}
                    >
                      <div className="flex items-start gap-3">
                        <Bot className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <div className="font-medium mb-1 flex items-center">
                            {assistant.name}
                            {assistant.isDefault && (
                              <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-sm">
                                Default
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground line-clamp-2">
                            Model: {assistant.model}
                          </div>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No assistants configured</p>
                  <p className="text-sm mt-2">Add an assistant in Settings</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog for creating a new chat */}
      <Dialog open={isNewChatOpen} onOpenChange={setIsNewChatOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Start New Chat</DialogTitle>
            <DialogDescription>
              Choose an assistant to start a new conversation or start with the default assistant.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select 
              value={selectedAssistantId?.toString() || ""} 
              onValueChange={(value) => {
                const assistant = assistants.find(a => a.id.toString() === value);
                if (assistant) {
                  setSelectedAssistant(assistant.name);
                  setSelectedAssistantId(assistant.id);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                {isLoadingAssistants ? (
                  <div className="flex justify-center p-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : assistants.length > 0 ? (
                  assistants.map((assistant) => (
                    <SelectItem key={assistant.id} value={assistant.id.toString()}>
                      {assistant.name} {assistant.isDefault ? "(Default)" : ""}
                    </SelectItem>
                  ))
                ) : (
                  <SelectItem value="no-assistants" disabled>
                    No assistants available
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsNewChatOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleCreateChat}>
              Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Active Chat Interface */}
      {activeChatId && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                <span>Conversation {activeChatId}</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setActiveChatId(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 mb-4">
              <div className="flex gap-3">
                <div className="bg-primary/10 p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 bg-muted p-3 rounded-lg">
                  <p>Hello! How can I assist you today?</p>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Input 
                placeholder="Type your message..." 
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="flex-1"
              />
              <Button size="icon">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}