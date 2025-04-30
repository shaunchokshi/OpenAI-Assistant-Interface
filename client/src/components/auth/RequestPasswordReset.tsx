import React from "react";
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

const formSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type FormValues = z.infer<typeof formSchema>;

export function RequestPasswordReset() {
  const { toast } = useToast();
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
    },
  });
  
  const requestResetMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const res = await apiRequest("POST", "/api/request-password-reset", values);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Check your email",
        description: "If that email exists in our system, we've sent a password reset link.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Request failed",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    requestResetMutation.mutate(values);
  }
  
  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold">Reset Your Password</h1>
        <p className="text-muted-foreground mt-2">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="you@example.com" 
                    type="email" 
                    {...field} 
                    disabled={requestResetMutation.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button 
            type="submit" 
            className="w-full" 
            disabled={requestResetMutation.isPending}
          >
            {requestResetMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}