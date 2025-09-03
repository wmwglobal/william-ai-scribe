import React, { createContext, useContext, ReactNode, useCallback } from 'react';
import { useAsyncError } from '@/hooks/useAsyncError';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface ErrorContextType {
  reportError: (error: Error, context?: ErrorContext) => void;
  reportAsyncError: (error: Error, context?: ErrorContext) => void;
}

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  additional?: Record<string, any>;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

interface ErrorProviderProps {
  children: ReactNode;
}

/**
 * Error Context Provider that centralizes error reporting and handling
 * 
 * This provider offers a centralized way to report errors with context
 * and ensures they're properly logged and sent to monitoring services.
 * 
 * @example
 * <ErrorProvider>
 *   <App />
 * </ErrorProvider>
 */
export function ErrorProvider({ children }: ErrorProviderProps) {
  const throwAsyncError = useAsyncError();

  const reportError = useCallback((error: Error, context?: ErrorContext) => {
    // Enhance error with context information
    const errorReport = {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      context: context || {}
    };

    // Log to console with full context
    console.error('Error reported:', errorReport);

    // In production, send to monitoring service
    if (process.env.NODE_ENV === 'production') {
      // Send to Sentry, LogRocket, or other monitoring service
      try {
        // Example implementation:
        // Sentry.withScope(scope => {
        //   if (context?.component) scope.setTag('component', context.component);
        //   if (context?.action) scope.setTag('action', context.action);
        //   if (context?.userId) scope.setUser({ id: context.userId });
        //   if (context?.sessionId) scope.setTag('sessionId', context.sessionId);
        //   if (context?.additional) {
        //     Object.entries(context.additional).forEach(([key, value]) => {
        //       scope.setExtra(key, value);
        //     });
        //   }
        //   scope.setLevel('error');
        //   Sentry.captureException(error);
        // });

        // For now, just log to console in production
        console.error('Production error:', errorReport);
      } catch (monitoringError) {
        console.error('Failed to send error to monitoring service:', monitoringError);
      }
    }

    // Send error to backend for logging (optional)
    try {
      // Example: POST to /api/errors
      // fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // }).catch(console.error);
    } catch (backendError) {
      console.error('Failed to send error to backend:', backendError);
    }
  }, []);

  const reportAsyncError = useCallback((error: Error, context?: ErrorContext) => {
    // First report the error
    reportError(error, context);
    
    // Then throw it so Error Boundaries can catch it
    throwAsyncError(error);
  }, [reportError, throwAsyncError]);

  const value: ErrorContextType = {
    reportError,
    reportAsyncError,
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
}

/**
 * Hook to access error reporting functionality
 * 
 * @example
 * function MyComponent() {
 *   const { reportError, reportAsyncError } = useErrorReporter();
 *   
 *   const handleClick = async () => {
 *     try {
 *       await riskyOperation();
 *     } catch (error) {
 *       reportAsyncError(error, {
 *         component: 'MyComponent',
 *         action: 'handleClick',
 *         additional: { buttonId: 'submit' }
 *       });
 *     }
 *   };
 * }
 */
export function useErrorReporter(): ErrorContextType {
  const context = useContext(ErrorContext);
  
  if (!context) {
    throw new Error('useErrorReporter must be used within ErrorProvider');
  }
  
  return context;
}

/**
 * Higher-order component to automatically add error reporting to components
 * 
 * @example
 * const SafeComponent = withErrorReporting(MyComponent, 'MyComponent');
 */
export function withErrorReporting<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
): React.ComponentType<P> {
  return function WrappedComponent(props: P) {
    const { reportError } = useErrorReporter();

    // Wrap the component in an error boundary with automatic reporting
    return (
      <ErrorBoundary
        onError={(error, errorInfo) => {
          reportError(error, {
            component: componentName,
            action: 'render',
            additional: {
              componentStack: errorInfo.componentStack,
              props: process.env.NODE_ENV === 'development' ? props : 'hidden'
            }
          });
        }}
      >
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

// Re-export ErrorBoundary for convenience
export { ErrorBoundary };