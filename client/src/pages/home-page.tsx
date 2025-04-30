import React from "react";
import { useAuth } from "@/hooks/use-auth";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Welcome to OpenAI Assistant</h1>
      <p className="mb-4">You are logged in as {user?.email}</p>
      <button 
        onClick={handleLogout}
        className="bg-primary text-white px-4 py-2 rounded"
      >
        Logout
      </button>
    </div>
  );
}