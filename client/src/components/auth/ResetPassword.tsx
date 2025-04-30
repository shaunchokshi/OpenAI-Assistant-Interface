import React, { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Link, useLocation } from "wouter";

// Form validation schema
const formSchema = z.object({
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password is too long"),
  confirmPassword: z.string()
    .min(8, "Password must be at least 8 characters"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormValues = z.infer<typeof formSchema>;

export function ResetPassword() {
  const { toast } = useToast();
  const [location, setLocation] = useLocation();
  
  // Parse URL parameters
  const params = new URLSearchParams(window.location.search);
  const userId = params.get("userId");
  const token = params.get("token");
  
  // Validate URL parameters
  const isValidRequest = userId && token;
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });
  
  const resetMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/reset-password", {
        userId: Number(userId),
        token,
        newPassword: values.newPassword,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "Your password has been updated. You can now log in with your new password.",
      });
      form.reset();
      // Redirect to login page after successful reset
      setTimeout(() => setLocation("/auth"), 1500);
    },
    onError: (error: Error) => {
      toast({
        title: "Reset failed",
        description: error.message || "Invalid or expired reset link. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Show error if URL parameters are invalid
  useEffect(() => {
    if (!isValidRequest) {
      toast({
        title: "Invalid reset link",
        description: "The password reset link is invalid or has expired. Please request a new one.",
        variant: "destructive",
      });
    }
  }, [isValidRequest, toast]);
  
  function onSubmit(values: FormValues) {
    if (!isValidRequest) return;
    resetMutation.mutate(values);
  }
  
  if (!isValidRequest) {
    return (
      <div className="space-y-4 max-w-md mx-auto text-center">
        <h1 className="text-2xl font-bold">Invalid Reset Link</h1>
        <p className="text-muted-foreground">
          The password reset link is invalid or has expired.
        </p>
        <Button asChild className="mt-4">
          <Link href="/auth/request-reset">Request New Reset Link</Link>
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Reset Your Password</h1>
        <p className="text-muted-foreground mt-2">
          Enter your new password below.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Enter new password" 
                    type="password" 
                    {...field} 
                    disabled={resetMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Confirm new password" 
                    type="password" 
                    {...field} 
                    disabled={resetMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={resetMutation.isPending}
          >
            {resetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}