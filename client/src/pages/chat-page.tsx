import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex-1 p-4 md:p-6 lg:p-8 max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">Chat with AI</h2>
        <Button className="flex items-center gap-2 w-full sm:w-auto">
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
              {[1, 2, 3].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 sm:gap-4 p-3 sm:p-4 rounded-lg border hover:bg-accent/20 cursor-pointer transition-colors"
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
                  className="flex items-center gap-2 sm:gap-3 p-3 rounded-lg border hover:bg-accent/20 cursor-pointer transition-colors"
                >
                  <div className="bg-primary/10 p-2 rounded-full shrink-0">
                    <MessageSquare className="h-5 w-5 text-primary" />
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
    </div>
  );
}