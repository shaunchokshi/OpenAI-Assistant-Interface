import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Redirect, useLocation } from "wouter";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetComplete, setResetComplete] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Extract token and userId from URL query params
  const searchParams = new URLSearchParams(window.location.search);
  const token = searchParams.get("token");
  const userId = searchParams.get("userId");

  const resetMutation = useMutation({
    mutationFn: async ({ 
      password, 
      userId, 
      token 
    }: { 
      password: string; 
      userId: string; 
      token: string 
    }) => {
      const res = await apiRequest("POST", "/api/reset-password/reset", {
        password,
        userId: parseInt(userId, 10),
        token,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. Please log in with your new password.",
      });
      setResetComplete(true);
      // Redirect to login after 2 seconds
      setTimeout(() => {
        setLocation("/auth");
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: "Password reset failed",
        description: error.message || "Invalid or expired reset token. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords match.",
        variant: "destructive",
      });
      return;
    }
    
    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }
    
    if (!token || !userId) {
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or has expired.",
        variant: "destructive",
      });
      return;
    }
    
    resetMutation.mutate({ password, userId, token });
  };

  // Redirect to login if reset is already complete
  if (resetComplete) {
    return <Redirect to="/auth" />;
  }

  // Validate token and userId are present
  if (!token || !userId) {
    return (
      <div className="max-w-md mx-auto p-6">
        <h1 className="text-2xl font-bold mb-6">Invalid Reset Link</h1>
        <p className="mb-4">
          The password reset link is invalid or has expired. Please request a new password reset link.
        </p>
        <a 
          href="/request-reset-password" 
          className="text-primary hover:underline"
        >
          Request new reset link
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reset Your Password</h1>
      <p className="mb-4">
        Please enter your new password below.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="new-password" className="block text-sm font-medium mb-1">
            New Password
          </label>
          <input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full p-2 border rounded bg-[#dddddd] text-black"
            placeholder="Minimum 8 characters"
            minLength={8}
          />
        </div>
        
        <div>
          <label htmlFor="confirm-new-password" className="block text-sm font-medium mb-1">
            Confirm New Password
          </label>
          <input
            id="confirm-new-password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            className="w-full p-2 border rounded bg-[#dddddd] text-black"
            placeholder="Confirm your password"
            minLength={8}
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? "Resetting..." : "Reset Password"}
          </button>
          
          <a 
            href="/auth" 
            className="text-center text-sm text-primary hover:underline"
          >
            Back to login
          </a>
        </div>
      </form>
    </div>
  );
}