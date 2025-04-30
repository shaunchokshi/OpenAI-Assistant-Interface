import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { MessageSquare, FileText, Upload, Users, Settings, BarChart } from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    {
      name: "Chat",
      path: "/",
      icon: MessageSquare,
    },
    {
      name: "Files",
      path: "/files",
      icon: FileText,
    },
    {
      name: "Analytics",
      path: "/analytics",
      icon: BarChart,
    },
    {
      name: "Users",
      path: "/users",
      icon: Users,
    },
    {
      name: "Settings",
      path: "/settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-20 md:w-64 bg-white shadow-md">
      <div className="h-full flex flex-col">
        <nav className="mt-5 px-2 space-y-1">
          {navItems.map((item) => (
            <Link key={item.path} href={item.path}>
              <a
                className={cn(
                  "group flex items-center px-2 py-2 text-sm font-medium rounded-md",
                  location === item.path
                    ? "bg-primary-50 text-primary-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon className="mr-3 h-6 w-6" />
                <span className="hidden md:inline-block">{item.name}</span>
              </a>
            </Link>
          ))}
        </nav>
      </div>
    </aside>
  );
}
