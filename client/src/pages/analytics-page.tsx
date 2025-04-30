import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>("7d");
  
  // Get date range for queries
  const getDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (timeRange) {
      case "7d":
        start.setDate(end.getDate() - 7);
        break;
      case "30d":
        start.setDate(end.getDate() - 30);
        break;
      case "90d":
        start.setDate(end.getDate() - 90);
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    
    return { start, end };
  };
  
  const { start: startDate, end: endDate } = getDateRange();
  
  // Fetch summary data
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: [
      "/api/analytics/summary", 
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy: "day"
      }
    ],
    enabled: !!user,
    retry: false,
    queryFn: ({ signal }) => 
      fetch(`/api/analytics/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=day`, {
        signal,
        headers: { "Content-Type": "application/json" },
      }).then(res => {
        if (!res.ok) throw new Error("Failed to fetch analytics data");
        return res.json();
      })
      .catch(error => {
        toast({
          title: "Error fetching analytics",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      })
  });
  
  // Fetch detailed usage data
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: [
      "/api/analytics/usage", 
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        limit: 20
      }
    ],
    enabled: !!user,
    retry: false,
    queryFn: ({ signal }) => 
      fetch(`/api/analytics/usage?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=20`, {
        signal,
        headers: { "Content-Type": "application/json" },
      }).then(res => {
        if (!res.ok) throw new Error("Failed to fetch usage data");
        return res.json();
      })
      .catch(error => {
        toast({
          title: "Error fetching usage data",
          description: error.message,
          variant: "destructive"
        });
        throw error;
      })
  });
  
  // Calculate total cost and token usage
  const totalCost = summaryData?.totalCost ? 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryData.totalCost) : 
    '$0.00';
  
  const totalTokens = summaryData?.totalTokens ? 
    new Intl.NumberFormat('en-US').format(summaryData.totalTokens) : 
    '0';
  
  // Is the app still loading data?
  const isLoading = summaryLoading || usageLoading;
  
  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center space-x-2">
          <Select
            value={timeRange}
            onValueChange={setTimeRange}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center h-80">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Cost
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCost}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Tokens
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalTokens}</div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Requests
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <rect width="20" height="14" x="2" y="5" rx="2" />
                  <path d="M2 10h20" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData?.totalRequests || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Cost per Request
                </CardTitle>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  className="h-4 w-4 text-muted-foreground"
                >
                  <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                </svg>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryData?.totalRequests && summaryData?.totalCost
                    ? `$${(summaryData.totalCost / summaryData.totalRequests).toFixed(4)}`
                    : "$0.00"}
                </div>
                <p className="text-xs text-muted-foreground">
                  Per API call
                </p>
              </CardContent>
            </Card>
          </div>
          
          {/* Recent Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent API Usage</CardTitle>
              <CardDescription>
                Most recent API calls and their token usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usageData && usageData.length > 0 ? (
                <div className="space-y-4">
                  {usageData.slice(0, 10).map((usage: any) => (
                    <div key={usage.id} className="border-b pb-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-medium">{usage.modelId}</span>
                        <span className="text-sm text-muted-foreground">
                          {new Date(usage.createdAt).toLocaleDateString()} 
                          {' '}
                          {new Date(usage.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">
                          {usage.promptTokens + usage.completionTokens} tokens
                        </span>
                        <span className="text-sm">
                          ${usage.estimatedCost.toFixed(4)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">No recent usage data</p>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Model Usage Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Model Usage Breakdown</CardTitle>
              <CardDescription>
                Distribution of usage across different models
              </CardDescription>
            </CardHeader>
            <CardContent>
              {summaryData?.periodSummaries && summaryData.periodSummaries.length > 0 ? (
                <div className="space-y-4">
                  {Object.entries(
                    summaryData.periodSummaries.reduce((acc: Record<string, {tokens: number, cost: number}>, period: any) => {
                      Object.entries(period.models || {}).forEach(([model, data]: [string, any]) => {
                        if (!acc[model]) acc[model] = {tokens: 0, cost: 0};
                        acc[model].tokens += data.tokens;
                        acc[model].cost += data.cost;
                      });
                      return acc;
                    }, {})
                  )
                    .sort(([_, a], [__, b]) => (b as any).tokens - (a as any).tokens)
                    .map(([model, data]) => (
                      <div key={model} className="border-b pb-2">
                        <h4 className="font-medium">{model}</h4>
                        <div className="flex justify-between">
                          <span className="text-sm">
                            {new Intl.NumberFormat('en-US').format((data as any).tokens)} tokens
                          </span>
                          <span className="text-sm">
                            ${(data as any).cost.toFixed(4)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="flex justify-center items-center h-40">
                  <p className="text-muted-foreground">No model data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}