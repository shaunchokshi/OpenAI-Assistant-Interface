import { createContext, useContext, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

type Theme = "dark" | "light" | "system";

type CustomColors = {
  accentColor?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primaryColor?: string;
  cardColor?: string;
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
        if (data.primaryColor) colors.primaryColor = data.primaryColor;
        if (data.cardColor) colors.cardColor = data.cardColor;
        
        // Log to confirm we're loading colors correctly
        console.log("Loaded custom colors from server:", colors);
        
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

  // Helper function to convert hex to hsl if needed
  const hexToHsl = (hex: string): string => {
    // If already in hsl format, return as is
    if (hex.startsWith('hsl')) return hex;
    
    // Remove # if present
    hex = hex.replace('#', '');
    
    // Convert hex to rgb
    let r = 0, g = 0, b = 0;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length === 6) {
      r = parseInt(hex.substring(0, 2), 16);
      g = parseInt(hex.substring(2, 4), 16);
      b = parseInt(hex.substring(4, 6), 16);
    } else {
      // If invalid hex, return black
      return '0 0% 0%';
    }
    
    // Convert rgb to hsl
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0, l = (max + min) / 2;
    
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      
      h /= 6;
    }
    
    h = Math.round(h * 360);
    s = Math.round(s * 100);
    l = Math.round(l * 100);
    
    return `${h} ${s}% ${l}%`;
  };

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
    
    // Apply direct CSS style overrides using hex values
    if (customColors.backgroundColor) {
      root.style.setProperty('--background-color', customColors.backgroundColor);
      // For background we'll use the actual color directly to override Tailwind
      document.body.style.backgroundColor = customColors.backgroundColor;
    } else {
      root.style.removeProperty('--background-color');
      document.body.style.removeProperty('background-color');
    }
    
    if (customColors.foregroundColor) {
      root.style.setProperty('--foreground-color', customColors.foregroundColor);
      // For text color we'll use the actual color directly to override Tailwind
      document.body.style.color = customColors.foregroundColor;
    } else {
      root.style.removeProperty('--foreground-color');
      document.body.style.removeProperty('color');
    }
    
    // Apply accent/primary color
    const accentColor = customColors.accentColor || '';
    if (accentColor) {
      root.style.setProperty('--accent-color', accentColor);
      
      // Update primary button colors
      const buttons = document.querySelectorAll('.bg-primary');
      buttons.forEach(button => {
        (button as HTMLElement).style.backgroundColor = accentColor;
      });
      
      // Update selected items, borders, etc.
      const primaryElems = document.querySelectorAll('.text-primary, .border-primary, .hover\\:text-primary');
      primaryElems.forEach(elem => {
        if (elem.classList.contains('text-primary')) {
          (elem as HTMLElement).style.color = accentColor;
        }
        if (elem.classList.contains('border-primary')) {
          (elem as HTMLElement).style.borderColor = accentColor;
        }
      });
    } else {
      root.style.removeProperty('--accent-color');
      
      // Reset elements
      const buttons = document.querySelectorAll('.bg-primary');
      buttons.forEach(button => {
        (button as HTMLElement).style.removeProperty('background-color');
      });
      
      const primaryElems = document.querySelectorAll('.text-primary, .border-primary, .hover\\:text-primary');
      primaryElems.forEach(elem => {
        if (elem.classList.contains('text-primary')) {
          (elem as HTMLElement).style.removeProperty('color');
        }
        if (elem.classList.contains('border-primary')) {
          (elem as HTMLElement).style.removeProperty('border-color');
        }
      });
    }
    
    // Apply primary color (might be different from accent)
    const primaryColor = customColors.primaryColor || '';
    if (primaryColor) {
      root.style.setProperty('--primary-color', primaryColor);
      
      // Find an appropriate element to style with the primary color
      const buttons = document.querySelectorAll('.bg-primary');
      buttons.forEach(button => {
        (button as HTMLElement).style.backgroundColor = primaryColor;
      });
    } else {
      root.style.removeProperty('--primary-color');
    }
    
    // Apply card color
    const cardColor = customColors.cardColor || '';
    if (cardColor) {
      root.style.setProperty('--card-color', cardColor);
      
      // Apply to all card elements
      const cards = document.querySelectorAll('.bg-card, .theme-preview-area .rounded-md');
      cards.forEach(card => {
        (card as HTMLElement).style.backgroundColor = cardColor;
      });
    } else {
      root.style.removeProperty('--card-color');
      
      // Reset cards
      const cards = document.querySelectorAll('.bg-card, .theme-preview-area .rounded-md');
      cards.forEach(card => {
        (card as HTMLElement).style.removeProperty('background-color');
      });
    }
    
    // Clean up function to remove custom properties when component unmounts
    return () => {
      // Reset all properties
      const properties = [
        '--background-color', '--foreground-color', 
        '--accent-color', '--primary-color', '--card-color'
      ];
      properties.forEach(prop => root.style.removeProperty(prop));
      
      // Reset direct style overrides
      document.body.style.removeProperty('background-color');
      document.body.style.removeProperty('color');
      
      // Reset elements
      const buttons = document.querySelectorAll('.bg-primary');
      buttons.forEach(button => {
        (button as HTMLElement).style.removeProperty('background-color');
      });
      
      const primaryElems = document.querySelectorAll('.text-primary, .border-primary, .hover\\:text-primary');
      primaryElems.forEach(elem => {
        if (elem.classList.contains('text-primary')) {
          (elem as HTMLElement).style.removeProperty('color');
        }
        if (elem.classList.contains('border-primary')) {
          (elem as HTMLElement).style.removeProperty('border-color');
        }
      });
      
      // Reset card elements
      const cards = document.querySelectorAll('.bg-card, .theme-preview-area .rounded-md');
      cards.forEach(card => {
        (card as HTMLElement).style.removeProperty('background-color');
      });
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