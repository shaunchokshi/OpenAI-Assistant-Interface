import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";
import ThreadSelector from "@/components/chat/ThreadSelector";
import ChatWindow from "@/components/chat/ChatWindow";
import FileUploader from "@/components/chat/FileUploader";
import { apiRequest } from "@/lib/queryClient";

export default function ChatPage() {
  const [threadId, setThreadId] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const initThreadMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/thread/new");
      return res.json();
    },
    onSuccess: (data) => {
      setThreadId(data.threadId);
      setIsLoading(false);
    },
    onError: (error) => {
      console.error("Failed to initialize thread:", error);
      setIsLoading(false);
    },
  });

  useEffect(() => {
    initThreadMutation.mutate();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1 flex">
        <Sidebar />
        <main className="flex-1 p-6 bg-gray-50">
          <div className="max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Assistant Conversation</h1>
            <ThreadSelector 
              threadId={threadId} 
              setThreadId={setThreadId} 
              isLoading={isLoading}
            />
            <ChatWindow threadId={threadId} />
            <FileUploader />
          </div>
        </main>
      </div>
    </div>
  );
}
