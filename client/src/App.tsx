import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Toaster } from "./components/ui/toaster";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "./components/theme-provider";

// Pages
import HomePage from "./pages/home-page";
import AuthPage from "./pages/auth-page";
import SettingsPage from "./pages/settings-page";
import FilesPage from "./pages/files-page";
import AnalyticsPage from "./pages/analytics-page";
import ChatPage from "./pages/chat-page";
import UsersPage from "./pages/users-page";
import FineTuningPage from "./pages/fine-tuning-page";
import NotFound from "./pages/not-found";

// Auth Components
import RequestPasswordReset from "./components/auth/RequestPasswordReset";
import ResetPassword from "./components/auth/ResetPassword";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/files" component={FilesPage} />
      <ProtectedRoute path="/analytics" component={AnalyticsPage} />
      <ProtectedRoute path="/chat" component={ChatPage} />
      <ProtectedRoute path="/fine-tuning" component={FineTuningPage} />
      <ProtectedRoute path="/users" component={UsersPage} />
      <Route path="/auth">
        <AuthPage />
      </Route>
      <Route path="/request-reset-password">
        <RequestPasswordReset />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route>
        <NotFound />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="app-theme">
        <AuthProvider>
          <Router />
          <Toaster />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;