import React, { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Home, 
  Settings, 
  FileText, 
  BarChart2, 
  MessageSquare,
  Users,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Brain
} from "lucide-react";
import logoImage from "@/assets/logo.png";

interface SidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  isMobile?: boolean;
}

const Sidebar = ({ collapsed = false, onToggle, isMobile = false }: SidebarProps) => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // Filter menu items based on user email (treating test@example.com as admin)
  const isAdmin = user?.email === "test@example.com";
  
  const menuItems = [
    { path: "/", icon: <Home size={20} />, label: "Home" },
    { path: "/chat", icon: <MessageSquare size={20} />, label: "Chat" },
    { path: "/files", icon: <FileText size={20} />, label: "Files" },
    { path: "/analytics", icon: <BarChart2 size={20} />, label: "Analytics" },
    { path: "/fine-tuning", icon: <Brain size={20} />, label: "Fine-Tuning" },
    { path: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];
  
  // Add admin-only items
  if (isAdmin) {
    menuItems.splice(5, 0, { path: "/users", icon: <Users size={20} />, label: "Users" });
  }

  // Handle sidebar width based on collapsed state and if it's mobile
  const sidebarWidth = collapsed ? "w-16" : "w-64";
  const sidebarClass = isMobile && collapsed ? "hidden" : sidebarWidth;
  
  // If sidebar is mobile and expanded, add overlay
  const mobileExpandedClass = isMobile && !collapsed ? "fixed inset-0 z-40" : "";
  
  return (
    <>
      {/* Mobile overlay */}
      {isMobile && !collapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30" 
          onClick={onToggle}
        />
      )}
    
      <div className={`${sidebarClass} ${mobileExpandedClass} bg-gray-900 text-white h-full flex flex-col transition-all duration-300 ease-in-out`}>
        <div className="p-5 border-b border-gray-800 flex justify-between items-center">
          {!collapsed ? (
            <>
              <div className="flex-1 flex items-center">
                <img 
                  src={logoImage} 
                  alt="CK Consulting Logo" 
                  className="h-10 w-10 mr-3"
                />
                <div>
                  <h2 className="text-xl font-bold">CK Assistant</h2>
                  <div className="text-sm text-gray-400 truncate">
                    {user?.email}
                  </div>
                </div>
              </div>
              {onToggle && (
                <button 
                  onClick={onToggle} 
                  className="ml-3 p-1.5 rounded-md text-sky-400 hover:bg-gray-800 hover:text-sky-300 transition-colors"
                  title="Collapse sidebar"
                >
                  <ChevronLeft size={20} />
                </button>
              )}
            </>
          ) : (
            <div className="w-full flex flex-col items-center justify-center">
              <img 
                src={logoImage} 
                alt="CK Consulting Logo" 
                className="h-8 w-8 mb-2"
              />
              {onToggle && (
                <button 
                  onClick={onToggle} 
                  className="p-1.5 rounded-md text-sky-400 hover:bg-gray-800 hover:text-sky-300 transition-colors"
                  title="Expand sidebar"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>
          )}
        </div>
        
        <nav className="flex-1 overflow-y-auto">
          <ul className={collapsed ? "p-2" : "p-3"}>
            {menuItems.map((item) => (
              <li key={item.path} className="mb-1">
                <Link href={item.path}>
                  <div
                    className={`flex items-center ${collapsed ? 'justify-center' : ''} p-3 rounded-md transition-colors cursor-pointer ${
                      isActive(item.path)
                        ? "bg-primary text-white"
                        : "text-gray-300 hover:bg-gray-800"
                    }`}
                  >
                    <span className={collapsed ? "" : "mr-3"}>{item.icon}</span>
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="p-3 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex items-center ${collapsed ? 'justify-center' : ''} w-full p-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors`}
          >
            <LogOut size={20} className={collapsed ? "" : "mr-3"} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;