import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AnalyticsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [timeRange, setTimeRange] = useState<string>("7d");
  const [groupBy, setGroupBy] = useState<string>("day");
  const [date, setDate] = useState<Date | undefined>(undefined);
  
  // Calculate date range based on the selected timeRange
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
      case "1y":
        start.setFullYear(end.getFullYear() - 1);
        break;
      case "custom":
        if (date) {
          // When using a custom date, show 30 days from the selected date
          start = new Date(date);
          const customEnd = new Date(date);
          customEnd.setDate(start.getDate() + 30);
          return { start, end: customEnd };
        } else {
          start.setDate(end.getDate() - 30);
        }
        break;
      default:
        start.setDate(end.getDate() - 7);
    }
    
    return { start, end };
  };
  
  const { start: startDate, end: endDate } = getDateRange();
  
  // Fetch summary data for charts
  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: [
      "/api/analytics/summary", 
      {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        groupBy
      }
    ],
    enabled: !!user,
    retry: false,
    queryFn: ({ signal }) => 
      fetch(`/api/analytics/summary?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=${groupBy}`, {
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
        limit: 100
      }
    ],
    enabled: !!user,
    retry: false,
    queryFn: ({ signal }) => 
      fetch(`/api/analytics/usage?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&limit=100`, {
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

  // Format data for token usage chart
  const tokenChartData = summaryData?.periodSummaries.map((period: any) => ({
    name: formatPeriodLabel(period.period, groupBy),
    Tokens: period.tokens,
  })) || [];

  // Format data for cost chart
  const costChartData = summaryData?.periodSummaries.map((period: any) => ({
    name: formatPeriodLabel(period.period, groupBy),
    Cost: parseFloat((period.cost).toFixed(4))
  })) || [];

  // Format data for model distribution pie chart
  const getModelDistribution = () => {
    const modelData: Record<string, number> = {};
    
    if (summaryData?.periodSummaries) {
      summaryData.periodSummaries.forEach((period: any) => {
        Object.entries(period.models).forEach(([model, data]: [string, any]) => {
          if (!modelData[model]) {
            modelData[model] = 0;
          }
          modelData[model] += data.tokens;
        });
      });
    }
    
    return Object.entries(modelData).map(([name, value]) => ({
      name,
      value
    }));
  };
  
  const modelDistributionData = getModelDistribution();
  
  // Helper function to format period labels based on groupBy
  function formatPeriodLabel(period: string, groupBy: string) {
    if (groupBy === 'day') {
      // period is in format "YYYY-MM-DD"
      return format(new Date(period), 'MMM d');
    } else if (groupBy === 'week') {
      // period is the start of the week in format "YYYY-MM-DD"
      return format(new Date(period), 'MMM d');
    } else if (groupBy === 'month') {
      // period is in format "YYYY-MM"
      return format(new Date(period + '-01'), 'MMM yyyy');
    }
    return period;
  }
  
  // Calculate total cost and token usage
  const totalCost = summaryData?.totalCost ? 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summaryData.totalCost) : 
    '$0.00';
  
  const totalTokens = summaryData?.totalTokens ? 
    new Intl.NumberFormat('en-US').format(summaryData.totalTokens) : 
    '0';
  
  const costTrend = () => {
    if (!summaryData?.periodSummaries || summaryData.periodSummaries.length < 2) return 0;
    
    const periods = summaryData.periodSummaries;
    const lastPeriodCost = periods[periods.length - 1].cost;
    const previousPeriodCost = periods[periods.length - 2].cost;
    
    if (previousPeriodCost === 0) return 100; // If previous was 0, show 100% increase
    
    return ((lastPeriodCost - previousPeriodCost) / previousPeriodCost) * 100;
  };
  
  const tokenTrend = () => {
    if (!summaryData?.periodSummaries || summaryData.periodSummaries.length < 2) return 0;
    
    const periods = summaryData.periodSummaries;
    const lastPeriodTokens = periods[periods.length - 1].tokens;
    const previousPeriodTokens = periods[periods.length - 2].tokens;
    
    if (previousPeriodTokens === 0) return 100; // If previous was 0, show 100% increase
    
    return ((lastPeriodTokens - previousPeriodTokens) / previousPeriodTokens) * 100;
  };
  
  const calculatedCostTrend = costTrend();
  const calculatedTokenTrend = tokenTrend();
  
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
              <SelectItem value="1y">Last year</SelectItem>
              <SelectItem value="custom">Custom date</SelectItem>
            </SelectContent>
          </Select>
          
          {timeRange === "custom" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[180px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
          
          <Select
            value={groupBy}
            onValueChange={setGroupBy}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Group By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
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
                <p className="text-xs text-muted-foreground">
                  {Math.abs(calculatedCostTrend).toFixed(1)}% 
                  {calculatedCostTrend > 0 ? (
                    <span className="text-rose-500 flex items-center">
                      <ArrowUpRight className="h-4 w-4 ml-1" /> increase
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center">
                      <ArrowDownRight className="h-4 w-4 ml-1" /> decrease
                    </span>
                  )}
                </p>
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
                <p className="text-xs text-muted-foreground">
                  {Math.abs(calculatedTokenTrend).toFixed(1)}% 
                  {calculatedTokenTrend > 0 ? (
                    <span className="text-rose-500 flex items-center">
                      <ArrowUpRight className="h-4 w-4 ml-1" /> increase
                    </span>
                  ) : (
                    <span className="text-emerald-500 flex items-center">
                      <ArrowDownRight className="h-4 w-4 ml-1" /> decrease
                    </span>
                  )}
                </p>
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
          
          {/* Charts */}
          <Tabs defaultValue="tokens" className="space-y-4">
            <TabsList>
              <TabsTrigger value="tokens">Token Usage</TabsTrigger>
              <TabsTrigger value="cost">Cost Analysis</TabsTrigger>
              <TabsTrigger value="models">Model Distribution</TabsTrigger>
            </TabsList>
            
            <TabsContent value="tokens" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Token Usage Over Time</CardTitle>
                  <CardDescription>
                    Total tokens used across all models during the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={tokenChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="Tokens" 
                        stroke="#8884d8" 
                        activeDot={{ r: 8 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="cost" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cost Trend</CardTitle>
                  <CardDescription>
                    API cost over the selected time period
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={costChartData}
                      margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`$${value}`, 'Cost']}
                      />
                      <Legend />
                      <Bar dataKey="Cost" fill="#82ca9d" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="models" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Model Distribution</CardTitle>
                  <CardDescription>
                    Token usage distribution by model
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-96">
                  <div className="h-full flex items-center justify-center">
                    {modelDistributionData.length === 0 ? (
                      <p className="text-muted-foreground">No model data available for the selected period</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={modelDistributionData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={150}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {modelDistributionData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => [
                              `${new Intl.NumberFormat().format(value)} tokens`,
                              'Usage',
                            ]}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          
          {/* Detailed Usage Table */}
          <Card>
            <CardHeader>
              <CardTitle>Recent API Calls</CardTitle>
              <CardDescription>
                Detailed view of recent API usage
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4 font-medium">Date</th>
                      <th className="text-left py-2 px-4 font-medium">Model</th>
                      <th className="text-left py-2 px-4 font-medium">Request Type</th>
                      <th className="text-right py-2 px-4 font-medium">Prompt Tokens</th>
                      <th className="text-right py-2 px-4 font-medium">Completion Tokens</th>
                      <th className="text-right py-2 px-4 font-medium">Total Tokens</th>
                      <th className="text-right py-2 px-4 font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usageData?.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-4 text-muted-foreground">
                          No usage data available for the selected period
                        </td>
                      </tr>
                    ) : (
                      usageData?.map((usage: any) => (
                        <tr key={usage.id} className="border-b">
                          <td className="py-2 px-4">{format(new Date(usage.createdAt), 'MMM d, yyyy HH:mm')}</td>
                          <td className="py-2 px-4">{usage.modelId}</td>
                          <td className="py-2 px-4">{usage.requestType}</td>
                          <td className="py-2 px-4 text-right">{usage.promptTokens.toLocaleString()}</td>
                          <td className="py-2 px-4 text-right">{usage.completionTokens.toLocaleString()}</td>
                          <td className="py-2 px-4 text-right">{usage.totalTokens.toLocaleString()}</td>
                          <td className="py-2 px-4 text-right">${usage.estimatedCost.toFixed(4)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}