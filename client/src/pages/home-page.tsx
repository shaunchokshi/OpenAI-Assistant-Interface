import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, FileText, BarChart2, Users } from "lucide-react";
import { Link } from "wouter";

export default function HomePage() {
  const { user } = useAuth();

  const features = [
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: "Chat with AI",
      description: "Interact with your personalized OpenAI assistant",
      link: "/chat"
    },
    {
      icon: <FileText className="h-8 w-8 text-primary" />,
      title: "Manage Files",
      description: "Upload and organize files for your assistants",
      link: "/files"
    },
    {
      icon: <BarChart2 className="h-8 w-8 text-primary" />,
      title: "Analytics",
      description: "Track your API usage and costs",
      link: "/analytics"
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: "User Management",
      description: "Manage user access and permissions",
      link: "/users"
    }
  ];

  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-2">Welcome, {user?.name || user?.email}</h1>
      <p className="text-gray-500 mb-8">Your AI Assistant Dashboard</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Link key={index} href={feature.link}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className="mb-2">{feature.icon}</div>
                <CardTitle>{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">{feature.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}