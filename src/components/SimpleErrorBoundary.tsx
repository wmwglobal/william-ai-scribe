import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class SimpleErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  handleRefresh = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-background/80 backdrop-blur-sm">
            <CardContent className="p-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="flex justify-center">
                  <AlertTriangle className="w-16 h-16 text-red-500" />
                </div>
                <h1 className="text-xl font-bold">Something went wrong</h1>
                <p className="text-muted-foreground text-sm">
                  We encountered an unexpected error. Please try refreshing the page.
                </p>
                {this.state.error && (
                  <details className="text-xs text-left bg-muted p-2 rounded">
                    <summary>Error details</summary>
                    <pre className="mt-2 text-xs">{this.state.error.message}</pre>
                  </details>
                )}
              </div>
              
              <div className="space-y-2">
                <Button 
                  onClick={this.handleRefresh}
                  className="w-full"
                  size="lg"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Page
                </Button>
                <Button 
                  onClick={this.handleRetry}
                  variant="outline"
                  className="w-full"
                >
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}