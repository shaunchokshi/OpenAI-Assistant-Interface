import React, { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  Monitor,
  Moon,
  Sun,
  Settings,
  BellRing,
  Volume2,
  VolumeX
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  
  // These would eventually come from an API call to get user preferences
  const [darkMode, setDarkMode] = useState(theme === "dark");
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<string>(theme);
  const [isLoading, setIsLoading] = useState(false);
  
  // Initialize the UI with the current theme state
  useEffect(() => {
    setDarkMode(theme === "dark");
    setSelectedTheme(theme);
  }, [theme]);
  
  // For demonstration purposes, simulate saving preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      // This would be an actual API call in the real implementation
      setIsLoading(true);
      
      // Apply the theme changes immediately on save
      setTheme(preferences.theme as "light" | "dark" | "system");
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For now, just return success
      return { success: true };
    },
    onSuccess: () => {
      setIsLoading(false);
      toast({
        title: "Preferences Saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: (error: Error) => {
      setIsLoading(false);
      toast({
        title: "Failed to Save Preferences",
        description: error.message || "An error occurred while saving your preferences.",
        variant: "destructive",
      });
    },
  });

  const handleThemeChange = (value: string) => {
    setSelectedTheme(value);
    // Apply theme immediately for better user experience
    setTheme(value as "light" | "dark" | "system");
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    // Update selected theme based on dark mode toggle and apply immediately
    const newTheme = checked ? "dark" : "light";
    setSelectedTheme(newTheme);
    setTheme(newTheme);
  };

  const handleToggleNotifications = (checked: boolean) => {
    setNotificationsEnabled(checked);
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
  };

  const handleSavePreferences = () => {
    savePreferencesMutation.mutate({
      darkMode,
      notificationsEnabled,
      soundEnabled,
      theme: selectedTheme
    });
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="appearance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appearance">Appearance</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>
        
        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Appearance Settings
              </CardTitle>
              <CardDescription>
                Customize how the application looks and feels
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Dark Mode</Label>
                    <div className="text-sm text-muted-foreground">
                      Toggle between light and dark themes
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Sun className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={darkMode}
                      onCheckedChange={handleToggleDarkMode}
                    />
                    <Moon className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base" htmlFor="theme">Theme</Label>
                  <div className="text-sm text-muted-foreground mb-3">
                    Choose how the application determines its color theme
                  </div>
                  <RadioGroup 
                    value={selectedTheme} 
                    onValueChange={handleThemeChange}
                    className="grid grid-cols-1 gap-2 sm:grid-cols-3"
                  >
                    <div>
                      <RadioGroupItem
                        value="light"
                        id="theme-light"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="theme-light"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Sun className="mb-3 h-6 w-6" />
                        Light
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="dark"
                        id="theme-dark"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="theme-dark"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Moon className="mb-3 h-6 w-6" />
                        Dark
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="system"
                        id="theme-system"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="theme-system"
                        className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                      >
                        <Monitor className="mb-3 h-6 w-6" />
                        System
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Manage your notification preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Enable Notifications</Label>
                    <div className="text-sm text-muted-foreground">
                      Receive notifications about activity and updates
                    </div>
                  </div>
                  <Switch
                    checked={notificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Sound Effects</Label>
                    <div className="text-sm text-muted-foreground">
                      Play sounds for notifications and events
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <VolumeX className="h-4 w-4 text-muted-foreground" />
                    <Switch
                      checked={soundEnabled}
                      onCheckedChange={handleToggleSound}
                    />
                    <Volume2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Advanced Settings
              </CardTitle>
              <CardDescription>
                Configure advanced application settings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Advanced settings will be available in a future update.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      <div className="flex justify-end">
        <Button 
          onClick={handleSavePreferences}
          disabled={savePreferencesMutation.isPending || isLoading}
        >
          {savePreferencesMutation.isPending || isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </Button>
      </div>
    </div>
  );
}