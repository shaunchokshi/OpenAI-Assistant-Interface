import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function RequestPasswordReset() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const resetRequestMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/reset-password/request", { email });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset email sent",
        description: "If an account exists with that email, you'll receive reset instructions shortly.",
      });
      setEmail("");
    },
    onError: (error: Error) => {
      toast({
        title: "Reset request failed",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    resetRequestMutation.mutate(email);
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Reset Your Password</h1>
      <p className="mb-4">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="reset-email" className="block text-sm font-medium mb-1">
            Email Address
          </label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full p-2 border rounded bg-[#dddddd] text-black"
            placeholder="your@email.com"
          />
        </div>
        
        <div className="flex flex-col gap-2">
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            disabled={resetRequestMutation.isPending}
          >
            {resetRequestMutation.isPending ? "Sending..." : "Send Reset Link"}
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