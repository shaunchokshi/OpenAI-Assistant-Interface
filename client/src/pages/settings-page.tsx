import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SessionsManager from "@/components/settings/SessionsManager";
import ProfileInfo from "@/components/settings/ProfileInfo";
import ApiKeyManager from "@/components/settings/ApiKeyManager";
import UserPreferences from "@/components/settings/UserPreferences";

export default function SettingsPage() {
  return (
    <div className="flex-1 p-8">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      
      <div className="max-w-5xl">
        <Tabs defaultValue="account" className="space-y-6">
          <TabsList>
            <TabsTrigger value="account">Account</TabsTrigger>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>
          
          <TabsContent value="account">
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  Manage your account details and password
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ProfileInfo />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="sessions">
            <Card>
              <CardHeader>
                <CardTitle>Session Management</CardTitle>
                <CardDescription>
                  View and manage your active login sessions across devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SessionsManager />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="api-keys">
            <Card>
              <CardHeader>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage your OpenAI API key and other integrations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyManager />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>User Preferences</CardTitle>
                <CardDescription>
                  Customize your application experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <UserPreferences />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}