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
  X,
  ChevronRight
} from "lucide-react";

const Sidebar = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const isActive = (path: string) => {
    return location === path;
  };

  // Filter menu items based on user role
  const isAdmin = user?.role === "admin" || user?.email === "test@example.com"; // Temporarily making test user an admin
  
  const menuItems = [
    { path: "/", icon: <Home size={20} />, label: "Home" },
    { path: "/chat", icon: <MessageSquare size={20} />, label: "Chat" },
    { path: "/files", icon: <FileText size={20} />, label: "Files" },
    { path: "/analytics", icon: <BarChart2 size={20} />, label: "Analytics" },
    { path: "/settings", icon: <Settings size={20} />, label: "Settings" },
  ];
  
  // Add admin-only items
  if (isAdmin) {
    menuItems.splice(4, 0, { path: "/users", icon: <Users size={20} />, label: "Users" });
  }

  return (
    <div className="w-64 bg-gray-900 text-white h-full flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <h2 className="text-xl font-bold">OpenAI Assistant</h2>
        <div className="text-sm mt-2 text-gray-400">
          {user?.email}
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto">
        <ul className="p-2">
          {menuItems.map((item) => (
            <li key={item.path} className="mb-1">
              <Link href={item.path}>
                <div
                  className={`flex items-center p-3 rounded-md transition-colors cursor-pointer ${
                    isActive(item.path)
                      ? "bg-primary text-white"
                      : "text-gray-300 hover:bg-gray-800"
                  }`}
                >
                  <span className="mr-3">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="flex items-center w-full p-3 text-gray-300 hover:bg-gray-800 rounded-md transition-colors"
        >
          <LogOut size={20} className="mr-3" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;