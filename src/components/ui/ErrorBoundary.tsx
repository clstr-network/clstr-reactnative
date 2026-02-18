import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { handleApiError } from '@/lib/errorHandler';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Custom fallback UI component */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** Callback when an error occurs */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary component that catches React render errors
 * and displays a fallback UI instead of crashing the entire app
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error using our error handler
    handleApiError(error, {
      operation: 'componentRender',
      details: {
        componentStack: errorInfo.componentStack,
      },
      showToast: false, // Don't show toast for render errors
    });

    // Call the optional onError callback
    this.props.onError?.(error, errorInfo);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🔴 React Error Boundary');
      console.error('Error:', error);
      console.error('Component Stack:', errorInfo.componentStack);
      console.groupEnd();
    }
  }

  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  handleRefresh = (): void => {
    this.resetError();
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.resetError();
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.resetError);
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0a0a0a] to-[#111111] p-4">
          <div className="max-w-md w-full bg-white/[0.04] rounded-lg shadow-xl p-8 space-y-6">
            {/* Icon */}
            <div className="flex justify-center">
              <div className="rounded-full bg-white/[0.06] p-4">
                <AlertTriangle className="h-12 w-12 text-white/40" />
              </div>
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-white">
                Oops! Something went wrong
              </h1>
              <p className="text-white/60">
                We encountered an unexpected error. Don't worry, your data is safe.
              </p>
            </div>

            {/* Error details (only in development) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="bg-white/[0.04] border border-white/10 rounded-md p-4 space-y-2">
                <p className="text-xs font-mono text-white/70 font-semibold">
                  Error Details (Development Only):
                </p>
                <p className="text-xs font-mono text-white/50 break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="space-y-3">
              <Button
                onClick={this.handleRefresh}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Page
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="mr-2 h-4 w-4" />
                Go to Home
              </Button>
            </div>

            {/* Additional help text */}
            <p className="text-center text-sm text-white/60">
              If the problem persists, please contact support or try again later.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook-based error boundary wrapper for functional components
 * Note: This is a wrapper component, actual error boundaries must be class components
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> => {
  const WrappedComponent: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
};
