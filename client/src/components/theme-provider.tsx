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
      console.log("Applying background color:", customColors.backgroundColor);
      
      // Set CSS variable for Tailwind
      root.style.setProperty('--background', customColors.backgroundColor);
      
      // Apply directly to elements
      document.body.style.backgroundColor = customColors.backgroundColor;
      
      // Override Tailwind classes by selecting all elements with bg-background
      document.querySelectorAll('.bg-background').forEach(elem => {
        const backgroundColor = customColors.backgroundColor || '';
        (elem as HTMLElement).style.backgroundColor = backgroundColor;
      });
    } else {
      root.style.removeProperty('--background');
      document.body.style.removeProperty('background-color');
      
      // Reset element styles
      document.querySelectorAll('.bg-background').forEach(elem => {
        (elem as HTMLElement).style.removeProperty('background-color');
      });
    }
    
    if (customColors.foregroundColor) {
      console.log("Applying foreground color:", customColors.foregroundColor);
      
      // Set CSS variable for Tailwind
      root.style.setProperty('--foreground', customColors.foregroundColor);
      
      // Apply directly to elements - this applies to all text
      document.body.style.color = customColors.foregroundColor;
      
      // Target specific text elements to ensure consistent application
      document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6').forEach(elem => {
        // Don't override elements that have explicit color classes
        let hasExplicitColor = false;
        for (let i = 0; i < elem.classList.length; i++) {
          const cls = elem.classList[i];
          if (cls.startsWith('text-') && cls !== 'text-foreground') {
            hasExplicitColor = true;
            break;
          }
        }
        
        if (!hasExplicitColor) {
          (elem as HTMLElement).style.color = customColors.foregroundColor || '';
        }
      });
    } else {
      root.style.removeProperty('--foreground');
      document.body.style.removeProperty('color');
      
      // Reset text elements
      document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6').forEach(elem => {
        (elem as HTMLElement).style.removeProperty('color');
      });
    }
    
    // Apply primary color to primary UI elements like buttons
    const primaryColor = customColors.primaryColor || '';
    if (primaryColor) {
      console.log("Applying primary color:", primaryColor);
      root.style.setProperty('--primary', primaryColor);
      
      // Update all primary buttons globally
      document.querySelectorAll('.bg-primary').forEach(button => {
        (button as HTMLElement).style.backgroundColor = primaryColor;
      });
    } else {
      root.style.removeProperty('--primary');
      document.querySelectorAll('.bg-primary').forEach(button => {
        (button as HTMLElement).style.removeProperty('background-color');
      });
    }
    
    // Apply accent color (for highlights, active indicators, etc.)
    const accentColor = customColors.accentColor || '';
    if (accentColor) {
      console.log("Applying accent color:", accentColor);
      root.style.setProperty('--accent', accentColor);
      
      // Apply to accent-specific elements
      document.querySelectorAll('.text-primary, .border-primary').forEach(elem => {
        if (elem.classList.contains('text-primary')) {
          (elem as HTMLElement).style.color = accentColor;
        }
        if (elem.classList.contains('border-primary')) {
          (elem as HTMLElement).style.borderColor = accentColor;
        }
      });
      
      // Apply accent color to active nav items
      document.querySelectorAll('.active-nav-item').forEach(item => {
        (item as HTMLElement).style.color = accentColor;
        (item as HTMLElement).style.borderColor = accentColor;
      });
    } else {
      root.style.removeProperty('--accent');
      
      // Reset accent elements
      document.querySelectorAll('.text-primary, .border-primary').forEach(elem => {
        if (elem.classList.contains('text-primary')) {
          (elem as HTMLElement).style.removeProperty('color');
        }
        if (elem.classList.contains('border-primary')) {
          (elem as HTMLElement).style.removeProperty('border-color');
        }
      });
      
      document.querySelectorAll('.active-nav-item').forEach(item => {
        (item as HTMLElement).style.removeProperty('color');
        (item as HTMLElement).style.removeProperty('border-color');
      });
    }
    
    // Apply card color
    const cardColor = customColors.cardColor || '';
    if (cardColor) {
      console.log("Applying card color:", cardColor);
      root.style.setProperty('--card', cardColor);
      
      // Apply to all card elements - more general selector to catch all card-like elements
      document.querySelectorAll('.bg-card, [class*="card"], .rounded-md, .theme-preview-area .p-3').forEach(card => {
        // Don't override elements that have other background colors intentionally
        let hasOtherBgColor = false;
        
        // Skip processing if element doesn't have classList
        if (!card.classList) {
          (card as HTMLElement).style.backgroundColor = cardColor;
          return;
        }
        
        for (let i = 0; i < card.classList.length; i++) {
          const cls = card.classList[i];
          if (cls.startsWith('bg-') && !['bg-card', 'bg-background'].includes(cls)) {
            hasOtherBgColor = true;
            break;
          }
        }
        
        if (!hasOtherBgColor) {
          (card as HTMLElement).style.backgroundColor = cardColor;
        }
      });
    } else {
      root.style.removeProperty('--card');
      
      // Reset cards
      document.querySelectorAll('.bg-card, [class*="card"], .rounded-md, .theme-preview-area .p-3').forEach(card => {
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