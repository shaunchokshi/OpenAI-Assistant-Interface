import React, { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import { Menu } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Toggle sidebar collapsed state
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };
  
  // Check window size to determine if mobile view
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is standard tablet breakpoint
      
      // Auto-collapse on mobile
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };
    
    // Initial check
    checkIfMobile();
    
    // Listen for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);
  
  return (
    <div className="flex h-screen bg-background relative">
      <Sidebar 
        collapsed={sidebarCollapsed} 
        onToggle={toggleSidebar} 
        isMobile={isMobile}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile menu toggle button - only visible on small screens when sidebar is collapsed */}
        {isMobile && sidebarCollapsed && (
          <button 
            onClick={toggleSidebar}
            className="fixed top-4 left-4 z-50 p-2 rounded-md bg-primary text-white shadow-md"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>
        )}
        <div className={`${isMobile ? 'p-4 pt-16' : 'p-6'} min-h-[calc(100vh-130px)]`}>
          {children}
        </div>
        <Footer />
      </main>
    </div>
  );
}