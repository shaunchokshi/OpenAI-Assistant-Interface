import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo });
    
    // Log error to server in production
    if (process.env.NODE_ENV === 'production') {
      console.error('Uncaught error:', error, errorInfo);
      
      // Optionally send to server error logging endpoint
      try {
        fetch('/api/log-error', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: error.message,
            stack: error.stack,
            componentStack: errorInfo.componentStack,
          }),
        });
      } catch (err) {
        console.error('Failed to report error to server:', err);
      }
    }
  }
  
  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
          <div className="max-w-md w-full bg-card shadow-lg rounded-lg p-6 space-y-6">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>
            
            <div className="space-y-2">
              <p className="text-muted-foreground">
                An unexpected error occurred. Our team has been notified.
              </p>
              {this.state.error && (
                <div className="p-3 bg-muted rounded text-sm overflow-auto">
                  <p className="font-medium">{this.state.error.toString()}</p>
                  {process.env.NODE_ENV !== 'production' && this.state.errorInfo && (
                    <pre className="mt-2 text-xs">{this.state.errorInfo.componentStack}</pre>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-3">
              <Button variant="default" onClick={this.handleReset}>
                Return to Home
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children || null;
  }
}

export default ErrorBoundary;