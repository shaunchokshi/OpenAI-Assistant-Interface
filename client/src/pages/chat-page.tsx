import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex-1 p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Chat with AI</h2>
        <Button className="flex items-center gap-2">
          <Plus size={16} /> New Chat
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Conversations */}
        <Card className="col-span-full lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Conversations</CardTitle>
            <CardDescription>
              Pick up where you left off or start a new conversation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-4 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="bg-primary/10 p-3 rounded-full">
                    <MessageSquare className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">Conversation {i + 1}</h3>
                    <p className="text-sm text-gray-500 truncate">
                      The last message from this conversation will appear here
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date().toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Assistants */}
        <Card>
          <CardHeader>
            <CardTitle>Your Assistants</CardTitle>
            <CardDescription>
              Available AI assistants you've configured
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {["General Assistant", "Code Helper", "Research Assistant"].map((name, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <div className="bg-primary/10 p-2 rounded-full">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">{name}</h3>
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