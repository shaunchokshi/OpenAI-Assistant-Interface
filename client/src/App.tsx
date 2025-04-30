import React from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from "./hooks/use-auth";
import { Toaster } from "./components/ui/toaster";
import { ProtectedRoute } from "./lib/protected-route";

// Pages
import HomePage from "./pages/home-page";
import AuthPage from "./pages/auth-page";
import SettingsPage from "./pages/settings-page";
import FilesPage from "./pages/files-page";
import AnalyticsPage from "./pages/analytics-page";
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
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;