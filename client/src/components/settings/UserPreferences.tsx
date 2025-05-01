import React, { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { 
  Loader2, 
  Monitor,
  Moon,
  Sun,
  Settings,
  BellRing,
  Volume2,
  VolumeX,
  Palette as PaletteIcon
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserPreferences() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme, customColors: providerCustomColors, setCustomColors: setProviderCustomColors } = useTheme();
  
  // Get current theme preferences directly from the theme provider
  // Using useState to track UI state, but actual theme is managed by ThemeProvider
  const [darkMode, setDarkMode] = useState(
    theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches)
  );
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState<"light" | "dark" | "system">(
    theme as "light" | "dark" | "system"
  );
  const [isLoading, setIsLoading] = useState(false);
  
  // Advanced theme options (custom colors)
  const [customColors, setCustomColors] = useState({
    background: providerCustomColors.backgroundColor || "",
    foreground: providerCustomColors.foregroundColor || "",
    primary: "",
    accent: providerCustomColors.accentColor || "",
    card: ""
  });
  
  // Track if custom colors are enabled
  const [customColorsEnabled, setCustomColorsEnabled] = useState(
    !!providerCustomColors.backgroundColor || 
    !!providerCustomColors.foregroundColor || 
    !!providerCustomColors.accentColor
  );
  
  // Fetch user preferences from the server
  const { data: preferences } = useQuery({
    queryKey: ['/api/settings/preferences'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/settings/preferences');
      const data = await res.json();
      
      // Update UI state with preferences from server
      if (data.theme) {
        setSelectedTheme(data.theme as "light" | "dark" | "system");
        setTheme(data.theme); // Update the actual theme in the provider
        setDarkMode(data.theme === "dark" || (data.theme === "system" && 
          window.matchMedia("(prefers-color-scheme: dark)").matches));
      }
      
      // Update notification preferences
      if (data.notificationsEnabled !== undefined) {
        setNotificationsEnabled(data.notificationsEnabled);
      }
      
      if (data.soundEnabled !== undefined) {
        setSoundEnabled(data.soundEnabled);
      }
      
      // Update custom colors
      const hasCustomColors = data.customColors === true && 
        !!(data.accentColor || data.backgroundColor || data.foregroundColor);
      
      setCustomColorsEnabled(hasCustomColors);
      
      if (hasCustomColors) {
        // Update local state for the form
        setCustomColors({
          background: data.backgroundColor || "",
          foreground: data.foregroundColor || "",
          primary: data.primaryColor || "",
          accent: data.accentColor || "",
          card: data.cardColor || ""
        });
        
        // Apply to the provider so it takes effect immediately
        setProviderCustomColors({
          backgroundColor: data.backgroundColor,
          foregroundColor: data.foregroundColor,
          accentColor: data.accentColor
        });
        
        console.log("Applied custom colors from DB:", {
          backgroundColor: data.backgroundColor,
          foregroundColor: data.foregroundColor,
          accentColor: data.accentColor
        });
      } else {
        // Clear provider custom colors when not enabled
        setProviderCustomColors({});
      }
      
      return data;
    },
    staleTime: 60000 // 1 minute
  });
  
  // Initialize the UI with the current theme state and keep it in sync
  useEffect(() => {
    console.log("Theme from provider:", theme); // Debug output
    
    const isDark = theme === "dark" || 
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    setDarkMode(isDark);
    setSelectedTheme(theme as "light" | "dark" | "system");
    
    // Add a media query listener for system theme changes
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        setDarkMode(e.matches);
      };
      
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);
  
  // Sync custom colors from provider
  useEffect(() => {
    if (providerCustomColors.backgroundColor || providerCustomColors.foregroundColor || providerCustomColors.accentColor) {
      setCustomColorsEnabled(true);
      setCustomColors({
        ...customColors,
        background: providerCustomColors.backgroundColor || customColors.background,
        foreground: providerCustomColors.foregroundColor || customColors.foreground,
        accent: providerCustomColors.accentColor || customColors.accent
      });
    }
  }, [providerCustomColors]);
  
  // Save preferences to the server
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: any) => {
      setIsLoading(true);
      const res = await apiRequest('POST', '/api/settings/preferences', preferences);
      return await res.json();
    },
    onSuccess: (data) => {
      setIsLoading(false);
      
      // Apply custom colors to the provider so they're available globally
      if (customColorsEnabled) {
        setProviderCustomColors({
          backgroundColor: customColors.background,
          foregroundColor: customColors.foreground,
          accentColor: customColors.accent
        });
      } else {
        // If custom colors are disabled, reset to defaults
        setProviderCustomColors({});
      }
      
      toast({
        title: "Preferences Saved",
        description: "Your preferences have been updated successfully.",
      });
      
      // Invalidate the preferences query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/settings/preferences'] });
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
    const themeValue = value as "light" | "dark" | "system";
    setSelectedTheme(themeValue);
    // Apply theme immediately for better user experience
    setTheme(themeValue);
    
    // Update dark mode state to match
    setDarkMode(themeValue === "dark" || (themeValue === "system" && 
      window.matchMedia("(prefers-color-scheme: dark)").matches));
      
    // Show success toast
    toast({
      title: "Theme Updated",
      description: `Theme changed to ${themeValue}. Your preference has been saved.`,
    });
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
    // Update selected theme based on dark mode toggle and apply immediately
    const newTheme = checked ? "dark" : "light";
    setSelectedTheme(newTheme);
    setTheme(newTheme);
    
    // Show success toast
    toast({
      title: "Dark Mode " + (checked ? "Enabled" : "Disabled"),
      description: `Theme changed to ${newTheme}. Your preference has been saved.`,
    });
  };

  const handleToggleNotifications = (checked: boolean) => {
    setNotificationsEnabled(checked);
  };

  const handleToggleSound = (checked: boolean) => {
    setSoundEnabled(checked);
  };

  const handleSavePreferences = () => {
    const preferencesData: Record<string, any> = {
      theme: selectedTheme,
      notificationsEnabled,
      soundEnabled,
      customColors: customColorsEnabled
    };
    
    // Add custom colors if enabled
    if (customColorsEnabled) {
      preferencesData.backgroundColor = customColors.background;
      preferencesData.foregroundColor = customColors.foreground;
      preferencesData.accentColor = customColors.accent;
      // Also store current values for other fields in case they're used later
      if (customColors.primary) preferencesData.primaryColor = customColors.primary;
      if (customColors.card) preferencesData.cardColor = customColors.card;
    } else {
      // If custom colors aren't enabled, ensure we clear any existing values
      preferencesData.backgroundColor = null;
      preferencesData.foregroundColor = null;
      preferencesData.accentColor = null;
      preferencesData.primaryColor = null;
      preferencesData.cardColor = null;
    }
    
    // Apply changes immediately via theme provider
    setProviderCustomColors(customColorsEnabled ? {
      backgroundColor: customColors.background, 
      foregroundColor: customColors.foreground,
      accentColor: customColors.accent,
      primaryColor: customColors.primary,
      cardColor: customColors.card
    } : {});
    
    // Log what we're saving to help with debugging
    console.log("Saving custom colors:", {
      background: customColors.background,
      foreground: customColors.foreground,
      accent: customColors.accent,
      primary: customColors.primary,
      card: customColors.card
    });
    
    savePreferencesMutation.mutate(preferencesData);
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
                Advanced Theme Customization
              </CardTitle>
              <CardDescription>
                Customize the application's colors to your preference
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Custom Colors</Label>
                    <div className="text-sm text-muted-foreground">
                      Use custom colors instead of theme defaults
                    </div>
                  </div>
                  <Switch
                    checked={customColorsEnabled}
                    onCheckedChange={setCustomColorsEnabled}
                  />
                </div>
                
                {customColorsEnabled && (
                  <div className="space-y-4 p-4 border rounded-md">
                    <div className="space-y-2">
                      <Label htmlFor="background-color">Background Color</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          id="background-color"
                          value={customColors.background || "#000000"} 
                          onChange={(e) => setCustomColors({...customColors, background: e.target.value})}
                          className="h-8 w-12 rounded-md"
                        />
                        <Input 
                          value={customColors.background || "#000000"} 
                          onChange={(e) => setCustomColors({...customColors, background: e.target.value})}
                          placeholder="#000000"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="foreground-color">Text Color</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          id="foreground-color"
                          value={customColors.foreground || "#ffffff"} 
                          onChange={(e) => setCustomColors({...customColors, foreground: e.target.value})}
                          className="h-8 w-12 rounded-md"
                        />
                        <Input 
                          value={customColors.foreground || "#ffffff"} 
                          onChange={(e) => setCustomColors({...customColors, foreground: e.target.value})}
                          placeholder="#ffffff"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="primary-color">Primary Color</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          id="primary-color"
                          value={customColors.primary || "#3b82f6"} 
                          onChange={(e) => setCustomColors({...customColors, primary: e.target.value})}
                          className="h-8 w-12 rounded-md"
                        />
                        <Input 
                          value={customColors.primary || "#3b82f6"} 
                          onChange={(e) => setCustomColors({...customColors, primary: e.target.value})}
                          placeholder="#3b82f6"
                          className="flex-1"
                        />
                        <div 
                          className="h-8 w-8 rounded-full border" 
                          style={{backgroundColor: customColors.primary || "#3b82f6"}}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="accent-color">Accent Color</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          id="accent-color"
                          value={customColors.accent || "#f97316"} 
                          onChange={(e) => setCustomColors({...customColors, accent: e.target.value})}
                          className="h-8 w-12 rounded-md"
                        />
                        <Input 
                          value={customColors.accent || "#f97316"} 
                          onChange={(e) => setCustomColors({...customColors, accent: e.target.value})}
                          placeholder="#f97316"
                          className="flex-1"
                        />
                        <div 
                          className="h-8 w-8 rounded-full border" 
                          style={{backgroundColor: customColors.accent || "#f97316"}}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="card-color">Card Background</Label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="color" 
                          id="card-color"
                          value={customColors.card || "#1e1e1e"} 
                          onChange={(e) => setCustomColors({...customColors, card: e.target.value})}
                          className="h-8 w-12 rounded-md"
                        />
                        <Input 
                          value={customColors.card || "#1e1e1e"} 
                          onChange={(e) => setCustomColors({...customColors, card: e.target.value})}
                          placeholder="#1e1e1e"
                          className="flex-1"
                        />
                      </div>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap justify-between">
                      <Button 
                        variant="destructive"
                        className="mt-2"
                        onClick={() => {
                          // Reset color inputs
                          setCustomColors({
                            background: "",
                            foreground: "",
                            primary: "",
                            accent: "",
                            card: ""
                          });
                          
                          // Clear custom colors from the provider
                          setProviderCustomColors({});
                          
                          toast({
                            title: "Colors Reset",
                            description: "Custom colors have been reset to theme defaults.",
                          });
                        }}
                      >
                        Reset to Theme Defaults
                      </Button>
                      
                      <Button 
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          // Apply ALL custom colors for the preview
                          setProviderCustomColors({
                            backgroundColor: customColors.background,
                            foregroundColor: customColors.foreground,
                            accentColor: customColors.accent,
                            primaryColor: customColors.primary,
                            cardColor: customColors.card
                          });
                          
                          // Force re-render with temporary element styling
                          const previewArea = document.querySelector('.theme-preview-area');
                          if (previewArea) {
                            // Apply to card example
                            const cardExample = previewArea.querySelector('.bg-card');
                            if (cardExample && customColors.card) {
                              (cardExample as HTMLElement).style.backgroundColor = customColors.card;
                            }
                            
                            // Apply to primary button
                            const primaryButton = previewArea.querySelector('.bg-primary');
                            if (primaryButton && customColors.primary) {
                              (primaryButton as HTMLElement).style.backgroundColor = customColors.primary;
                            }
                            
                            // Apply to background
                            if (customColors.background) {
                              (previewArea as HTMLElement).style.backgroundColor = customColors.background;
                            }
                            
                            // Apply to text
                            if (customColors.foreground) {
                              Array.from(previewArea.querySelectorAll('p, h4, button')).forEach(
                                el => (el as HTMLElement).style.color = customColors.foreground
                              );
                            }
                          }
                          
                          toast({
                            title: "Colors Applied",
                            description: "Custom colors have been applied as a preview. Save preferences to keep these changes.",
                          });
                        }}
                      >
                        Preview Colors
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 p-4 bg-muted rounded-md theme-preview-area">
                  <div className="flex items-center">
                    <PaletteIcon className="h-5 w-5 mr-2 text-amber-500" />
                    <span className="text-sm font-medium">Theme Preview</span>
                  </div>
                  <div className="mt-3 space-y-3">
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Primary</Button>
                      <Button size="sm" variant="secondary">Secondary</Button>
                      <Button size="sm" variant="destructive">Alert</Button>
                    </div>
                    <div className="p-3 rounded-md bg-card text-card-foreground border">
                      <h4 className="text-sm font-medium">Card Example</h4>
                      <p className="text-xs text-muted-foreground mt-1">This shows how cards will appear with current colors.</p>
                    </div>
                  </div>
                </div>
              </div>
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