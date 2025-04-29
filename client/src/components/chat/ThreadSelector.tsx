import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";

interface ThreadSelectorProps {
  threadId: string;
  setThreadId: (id: string) => void;
  isLoading: boolean;
}

export default function ThreadSelector({ threadId, setThreadId, isLoading }: ThreadSelectorProps) {
  const handleNewThread = async () => {
    try {
      const res = await apiRequest("POST", "/api/thread/new");
      const data = await res.json();
      setThreadId(data.threadId);
    } catch (error) {
      console.error("Failed to create new thread:", error);
    }
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Thread</h3>
            <p className="mt-1 text-sm text-gray-500 flex items-center">
              <span>Current Thread ID: </span>
              <code className="ml-2 bg-gray-100 px-2 py-1 rounded text-xs font-mono">
                {isLoading ? "Loading..." : threadId}
              </code>
            </p>
          </div>
          <Button 
            onClick={handleNewThread}
            disabled={isLoading}
          >
            New Thread
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
