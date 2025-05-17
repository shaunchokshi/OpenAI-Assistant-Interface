import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import logoImage from "@/assets/logo.png";
import AuthFooter from "@/components/layout/AuthFooter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (user) {
    return <Redirect to="/" />;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    registerMutation.mutate({ email, password });
  };

  return (
    <div className="flex min-h-screen">
      {/* Form section */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8">
        <div className="max-w-md mx-auto w-full">
          <div className="flex flex-col items-center mb-8">
            <img 
              src={logoImage} 
              alt="CK Consulting Logo" 
              className="h-16 w-16 mb-3"
            />
            <h1 className="text-3xl font-bold text-center">
              CeeK OpenAI API Assistant
            </h1>
          </div>
          
          <Tabs defaultValue="login" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2 border rounded bg-[#dddddd] text-black"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-2 border rounded bg-[#dddddd] text-black"
                  />
                </div>
                
                <div className="text-right">
                  <a href="/request-reset-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? "Logging in..." : "Login"}
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">
                      OR CONTINUE WITH
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <a 
                    href="/auth/github"
                    className="flex items-center justify-center gap-2 py-2 border rounded hover:bg-muted transition-colors"
                  >
                    <FaGithub className="h-5 w-5" />
                    <span>GitHub</span>
                  </a>
                  <a 
                    href="/auth/google"
                    className="flex items-center justify-center gap-2 py-2 border rounded hover:bg-muted transition-colors"
                  >
                    <FcGoogle className="h-5 w-5" />
                    <span>Google</span>
                  </a>
                </div>
              </form>
            </TabsContent>
            
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="register-email" className="block text-sm font-medium mb-1">
                    Email
                  </label>
                  <input
                    id="register-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full p-2 border rounded bg-[#dddddd] text-black"
                  />
                </div>
                
                <div>
                  <label htmlFor="register-password" className="block text-sm font-medium mb-1">
                    Password
                  </label>
                  <input
                    id="register-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full p-2 border rounded bg-[#dddddd] text-black"
                  />
                </div>
                
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium mb-1">
                    Confirm Password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="w-full p-2 border rounded bg-[#dddddd] text-black"
                  />
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? "Creating account..." : "Register"}
                </button>
                
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-background px-2 text-xs text-muted-foreground">
                      OR SIGN UP WITH
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <a 
                    href="/auth/github"
                    className="flex items-center justify-center gap-2 py-2 border rounded hover:bg-muted transition-colors"
                  >
                    <FaGithub className="h-5 w-5" />
                    <span>GitHub</span>
                  </a>
                  <a 
                    href="/auth/google"
                    className="flex items-center justify-center gap-2 py-2 border rounded hover:bg-muted transition-colors"
                  >
                    <FcGoogle className="h-5 w-5" />
                    <span>Google</span>
                  </a>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Hero section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary to-primary/60 items-center justify-center p-12">
        <div className="max-w-lg text-white">
          <h2 className="text-4xl font-bold mb-6">
            CeeK OpenAI API Assistant
          </h2>
          <p className="text-xl mb-8">
            Create, manage, and chat with your OpenAI assistants in one 
            convenient place. Unlock the power of AI with a personalized experience.
          </p>
          <ul className="space-y-3">
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              User-specific OpenAI API keys for privacy
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Manage multiple assistants per user
            </li>
            <li className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Secure conversation storage and management
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}