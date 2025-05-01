import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageSquare, Plus, Send, Bot, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function ChatPage() {
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [activeChatId, setActiveChatId] = useState<number | null>(null);
  const [selectedAssistant, setSelectedAssistant] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState("");
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
    setSelectedAssistant(null);
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
  const handleAssistantClick = (name: string) => {
    setSelectedAssistant(name);
    toast({
      title: "Assistant Selected",
      description: `Selected ${name}`,
    });
    setIsNewChatOpen(true);
  };

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
              {[1, 2, 3].map((id, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-accent/20 cursor-pointer transition-colors ${activeChatId === id ? 'bg-accent/20 border-primary' : ''}`}
                  onClick={() => handleConversationClick(id)}
                >
                  <div className="bg-primary/10 p-2 sm:p-3 rounded-full shrink-0">
                    <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium">Conversation {i + 1}</h3>
                    <p className="text-sm text-muted-foreground truncate">
                      The last message from this conversation will appear here
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              ))}
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
              {["General Assistant", "Code Helper", "Research Assistant"].map((name, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 sm:gap-3 p-3 rounded-lg border hover:bg-accent/20 cursor-pointer transition-colors ${selectedAssistant === name ? 'bg-accent/20 border-primary' : ''}`}
                  onClick={() => handleAssistantClick(name)}
                >
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{name}</h3>
                  </div>
                </div>
              ))}
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
              value={selectedAssistant || ""} 
              onValueChange={setSelectedAssistant}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an assistant" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="General Assistant">General Assistant</SelectItem>
                <SelectItem value="Code Helper">Code Helper</SelectItem>
                <SelectItem value="Research Assistant">Research Assistant</SelectItem>
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