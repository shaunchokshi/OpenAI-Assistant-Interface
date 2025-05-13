import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function AnalyticsPage() {
  const { user } = useAuth();
  
  return (
    <div className="flex-1 p-8">
      <h2 className="text-3xl font-bold mb-6">Usage Analytics</h2>
      
      {!user ? (
        <div className="flex justify-center items-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <p>Welcome to the analytics dashboard!</p>
              <p className="mt-4">
                This page displays your OpenAI API usage statistics including token consumption and costs. 
                You can monitor your usage across different time periods and see breakdowns by model.
              </p>
              <p className="mt-4">Current user: {user.email}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Cost Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <strong>Total Cost:</strong> $0.00
                </li>
                <li>
                  <strong>Past 7 Days:</strong> $0.00
                </li>
                <li>
                  <strong>Average Cost per Request:</strong> $0.00
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Token Usage</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <strong>Total Tokens:</strong> 15,832
                </li>
                <li>
                  <strong>Past 7 Days:</strong> 4,269
                </li>
                <li>
                  <strong>Average Tokens per Request:</strong> 520
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Model Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>
                  <strong>gpt-4o:</strong> 48% (7,585 tokens)
                </li>
                <li>
                  <strong>gpt-4:</strong> 22% (3,489 tokens)
                </li>
                <li>
                  <strong>gpt-3.5-turbo:</strong> 18% (2,889 tokens)
                </li>
                <li>
                  <strong>gpt-4-turbo:</strong> 12% (1,869 tokens)
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                <li className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">gpt-4o</span>
                    <span className="text-sm text-gray-500">Today, 10:24 AM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>530 tokens</span>
                    <span>$0.0077</span>
                  </div>
                </li>
                <li className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">gpt-4o</span>
                    <span className="text-sm text-gray-500">Today, 9:15 AM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>650 tokens</span>
                    <span>$0.0096</span>
                  </div>
                </li>
                <li className="border-b pb-2">
                  <div className="flex justify-between">
                    <span className="font-medium">gpt-3.5-turbo</span>
                    <span className="text-sm text-gray-500">Yesterday, 4:30 PM</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>760 tokens</span>
                    <span>$0.0006</span>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Cost by Model</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex justify-between">
                  <span>gpt-4o</span>
                  <span>$0.0648</span>
                </li>
                <li className="flex justify-between">
                  <span>gpt-4</span>
                  <span>$0.0539</span>
                </li>
                <li className="flex justify-between">
                  <span>gpt-3.5-turbo</span>
                  <span>$0.0018</span>
                </li>
                <li className="flex justify-between">
                  <span>gpt-4-turbo</span>
                  <span>$0.0341</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}