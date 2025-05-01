import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Theme = "dark" | "light" | "system";

type CustomColors = {
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
};

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  customColors: CustomColors;
  setCustomColors: (colors: CustomColors) => void;
  isLoading: boolean;
};

const initialState: ThemeProviderState = {
  theme: "dark",
  setTheme: () => null,
  customColors: {},
  setCustomColors: () => null,
  isLoading: true
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "dark",
  storageKey = "vite-ui-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [customColors, setCustomColorsState] = useState<CustomColors>({});
  
  // Fetch user preferences from the server
  const { isLoading } = useQuery({
    queryKey: ['/api/settings/preferences'],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', '/api/settings/preferences');
        const data = await res.json();
        
        // Apply theme from server
        if (data.theme) {
          localStorage.setItem(storageKey, data.theme);
          setTheme(data.theme as Theme);
        }
        
        // Apply custom colors from server
        const colors: CustomColors = {};
        if (data.accentColor) colors.accentColor = data.accentColor;
        if (data.backgroundColor) colors.backgroundColor = data.backgroundColor;
        if (data.foregroundColor) colors.foregroundColor = data.foregroundColor;
        
        setCustomColorsState(colors);
        return data;
      } catch (error) {
        console.error("Error fetching theme preferences:", error);
        // Continue with whatever is in localStorage
        return null;
      }
    },
    // Only fetch once on mount, other updates are handled by mutations
    staleTime: Infinity,
    retry: false
  });

  // Apply theme classes and custom CSS properties
  useEffect(() => {
    const root = window.document.documentElement;

    // Apply theme classes
    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Apply custom CSS variables for colors if they exist
    if (customColors.backgroundColor) {
      root.style.setProperty('--background', customColors.backgroundColor);
    }
    
    if (customColors.foregroundColor) {
      root.style.setProperty('--foreground', customColors.foregroundColor);
    }
    
    if (customColors.accentColor) {
      root.style.setProperty('--primary', customColors.accentColor);
      // Also set it as accent
      root.style.setProperty('--accent', customColors.accentColor);
    }
    
    // Clean up function to remove custom properties when component unmounts
    return () => {
      if (customColors.backgroundColor) root.style.removeProperty('--background');
      if (customColors.foregroundColor) root.style.removeProperty('--foreground');
      if (customColors.accentColor) {
        root.style.removeProperty('--primary');
        root.style.removeProperty('--accent');
      }
    };
  }, [theme, customColors]);

  // Update custom colors, store in local storage, and will be synced to server in UserPreferences component
  const setCustomColors = (colors: CustomColors) => {
    setCustomColorsState(colors);
    // We don't actually store these in localStorage as they'll be persisted to the server
  };

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    customColors,
    setCustomColors,
    isLoading
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};