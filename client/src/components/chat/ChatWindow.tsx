import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  text: string;
}

interface ChatWindowProps {
  threadId: string;
}

export default function ChatWindow({ threadId }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || !threadId) return;
    
    const userMessage: Message = { role: "user", text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/chat", { threadId, message: input });
      const data = await res.json();
      
      if (data.text) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.text }]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="mb-4 overflow-hidden">
      <CardContent className="p-4 max-h-[600px] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Start a conversation with the assistant
          </div>
        ) : (
          messages.map((message, index) => (
            <div key={index} className="mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center",
                      message.role === "user"
                        ? "bg-gray-200"
                        : "bg-primary-100"
                    )}
                  >
                    {message.role === "user" ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-500"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-primary-600"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"
                          clipRule="evenodd"
                        />
                        <path
                          fillRule="evenodd"
                          d="M10 4a1 1 0 100 2 1 1 0 000-2zm0 8a1 1 0 100 2 1 1 0 000-2zm-3-5a1 1 0 100 2 1 1 0 000-2zm6 0a1 1 0 100 2 1 1 0 000-2z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
                <div
                  className={cn(
                    "ml-3 rounded-lg px-4 py-3 max-w-[80%]",
                    message.role === "user"
                      ? "bg-blue-50"
                      : "bg-gray-100"
                  )}
                >
                  <div className="text-sm text-gray-900">
                    <div
                      className={cn(
                        "font-medium mb-1",
                        message.role === "user"
                          ? "text-blue-700"
                          : "text-gray-700"
                      )}
                    >
                      {message.role === "user" ? "You" : "Assistant"}
                    </div>
                    <p className="whitespace-pre-line">{message.text}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <CardFooter className="border-t border-gray-200 p-4">
        <form onSubmit={handleSendMessage} className="flex items-start space-x-3 w-full">
          <Textarea
            placeholder="Type your message here..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Send className="h-5 w-5 mr-1" />
                Send
              </>
            )}
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
