import React, { ReactNode, useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
}

/**
 * Network Error Boundary that detects and handles network connectivity issues
 * 
 * This component monitors the browser's online/offline status and provides
 * appropriate feedback when the user loses internet connection.
 * 
 * @example
 * <NetworkErrorBoundary>
 *   <MyComponent />
 * </NetworkErrorBoundary>
 */
export function NetworkErrorBoundary({ children, fallback, className }: Props) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('Network: Back online');
      setIsOffline(false);
      
      // Show a brief reconnection notice
      if (wasOffline) {
        // You could show a toast notification here
        console.log('Connection restored');
      }
    };

    const handleOffline = () => {
      console.log('Network: Gone offline');
      setIsOffline(true);
      setWasOffline(true);
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (isOffline) {
    // If custom fallback is provided, use it
    if (fallback) {
      return <>{fallback}</>;
    }

    // Default offline UI
    return (
      <div className={`flex items-center justify-center min-h-[400px] p-8 ${className || ''}`}>
        <div className="text-center max-w-md">
          <WifiOff className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            No Internet Connection
          </h2>
          <p className="text-gray-600 mb-6">
            Please check your network connection and try again. Some features may not work properly while offline.
          </p>
          
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2 flex items-center justify-center gap-2">
              <Wifi className="w-4 h-4" />
              Troubleshooting
            </h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Check your WiFi or cellular connection</li>
              <li>• Make sure you're connected to the internet</li>
              <li>• Try refreshing the page</li>
              <li>• Contact support if the problem persists</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

/**
 * Hook to get current network status
 * 
 * @example
 * function MyComponent() {
 *   const { isOnline, isOffline } = useNetworkStatus();
 *   
 *   return (
 *     <div>
 *       Status: {isOnline ? 'Online' : 'Offline'}
 *     </div>
 *   );
 * }
 */
export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
  };
}