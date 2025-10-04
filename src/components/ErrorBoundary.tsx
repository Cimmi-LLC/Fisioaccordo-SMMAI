
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Detect specific error types
    const isRadixSelectError = error.message.includes('Select.Item') || 
                               error.message.includes('value prop');
    const isFormControlError = error.message.includes('form') || 
                               error.message.includes('input') ||
                               error.message.includes('select');
    
    // Enhanced error logging
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorType: isRadixSelectError ? 'Radix Select Error' : 
                 isFormControlError ? 'Form Control Error' : 'Generic Error',
      timestamp: new Date().toISOString()
    });

    // Log specific guidance for common errors
    if (isRadixSelectError) {
      console.warn('💡 Fix: Ensure all <SelectItem> components have non-empty value props');
    }

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-4">
          <Card className="max-w-md w-full bg-card/80 border-border">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
              <CardTitle className="text-card-foreground">
                Oops! Qualcosa è andato storto
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                {this.state.error?.message.includes('Select.Item') || this.state.error?.message.includes('value prop')
                  ? 'Errore nel componente di selezione. Prova a ricaricare la pagina.'
                  : 'Si è verificato un errore imprevisto. Prova a ricaricare la sezione.'}
              </p>
              
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-left">
                  <summary className="text-xs text-muted-foreground cursor-pointer mb-2 hover:text-foreground transition-colors">
                    🔍 Debug Info (solo sviluppo)
                  </summary>
                  <pre className="text-xs text-destructive bg-muted/50 p-3 rounded overflow-auto max-h-40 border border-destructive/20">
                    <strong>Error:</strong> {this.state.error.message}
                    {this.state.error.stack && (
                      <>
                        {'\n\n'}
                        <strong>Stack:</strong>
                        {'\n'}
                        {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                      </>
                    )}
                  </pre>
                </details>
              )}
              
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button
                  onClick={this.handleReset}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Riprova
                </Button>
                <Button
                  onClick={() => window.location.reload()}
                  size="sm"
                  variant="default"
                >
                  Ricarica Pagina
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

export default ErrorBoundary;
