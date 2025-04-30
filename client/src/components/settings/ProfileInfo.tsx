import React from "react";
import { useAuth } from "@/hooks/use-auth";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FaGoogle, FaGithub } from "react-icons/fa";
import { format } from "date-fns";

export default function ProfileInfo() {
  const { user } = useAuth();

  if (!user) {
    return null;
  }

  // Determine login method
  const hasPassword = !!user.password;
  // These would need to come from an API endpoint that returns linked providers
  // Since we don't have direct access to oauth profiles in the user object
  const isGoogleLinked = false; // Would be determined from linked profiles
  const isGithubLinked = false; // Would be determined from linked profiles

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Account information */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your basic account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium">Email Address</div>
              <div className="text-base">{user.email}</div>
            </div>
            
            {user.name && (
              <div>
                <div className="text-sm font-medium">Name</div>
                <div className="text-base">{user.name}</div>
              </div>
            )}
            
            <div>
              <div className="text-sm font-medium">Account Created</div>
              <div className="text-base">
                {user.createdAt ? (
                  format(new Date(user.createdAt), 'PPP')
                ) : (
                  "Unknown"
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Authentication methods */}
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Login Methods</CardTitle>
            <CardDescription>Your authentication methods</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-foreground/5 p-2 rounded-full">
                  <svg 
                    className="h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg" 
                    viewBox="0 0 24 24" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  >
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium">Password</div>
                  <div className="text-sm text-muted-foreground">
                    {hasPassword ? "Password set" : "No password set"}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" disabled={!hasPassword}>
                {hasPassword ? "Change" : "Set Password"}
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-foreground/5 p-2 rounded-full">
                  <FaGoogle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <div className="font-medium">Google</div>
                  <div className="text-sm text-muted-foreground">
                    {isGoogleLinked ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <Button 
                variant={isGoogleLinked ? "outline" : "default"} 
                size="sm"
                asChild
              >
                <a href="/auth/google">
                  {isGoogleLinked ? "Disconnect" : "Connect"}
                </a>
              </Button>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="bg-foreground/5 p-2 rounded-full">
                  <FaGithub className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-medium">GitHub</div>
                  <div className="text-sm text-muted-foreground">
                    {isGithubLinked ? "Connected" : "Not connected"}
                  </div>
                </div>
              </div>
              <Button 
                variant={isGithubLinked ? "outline" : "default"}
                size="sm"
                asChild
              >
                <a href="/auth/github">
                  {isGithubLinked ? "Disconnect" : "Connect"}
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}