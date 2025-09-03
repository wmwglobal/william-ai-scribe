import React, { ReactNode } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Mic, MicOff, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

/**
 * Error boundary specifically for voice chat functionality
 * 
 * This component catches errors related to:
 * - Microphone permissions
 * - Audio recording/playback
 * - Speech-to-text processing
 * - Voice chat state management
 * 
 * @example
 * <VoiceChatErrorBoundary>
 *   <VoiceRecorder />
 * </VoiceChatErrorBoundary>
 */
export function VoiceChatErrorBoundary({ children }: Props) {
  const handleVoiceChatError = (error: Error) => {
    // Log voice-specific error details
    console.error('Voice chat error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      permissions: {
        microphone: 'unknown' // Will be determined by actual permission check
      }
    });

    // Check if it's a microphone permission error
    if (error.message.includes('Permission denied') || 
        error.message.includes('NotAllowedError') ||
        error.message.includes('microphone')) {
      console.warn('Microphone permission denied or not available');
    }

    // In production, send to monitoring service with voice-specific context
    if (process.env.NODE_ENV === 'production') {
      // Example: Send to Sentry with voice chat context
      // Sentry.withScope(scope => {
      //   scope.setTag('component', 'voice-chat');
      //   scope.setLevel('error');
      //   Sentry.captureException(error);
      // });
    }
  };

  const voiceChatFallback = (
    <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Voice Chat Temporarily Unavailable
          </h3>
          <p className="text-yellow-700 mb-4">
            We're having trouble with the voice chat feature. This might be due to microphone permissions, 
            browser compatibility, or a temporary service issue.
          </p>
          
          <div className="flex gap-3 mb-4">
            <Button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Page
            </Button>
            <Button 
              variant="outline" 
              onClick={() => {
                // Try to re-request microphone permissions
                navigator.mediaDevices?.getUserMedia({ audio: true })
                  .then(() => window.location.reload())
                  .catch(() => {
                    alert('Please check your microphone permissions and try again.');
                  });
              }}
              className="flex items-center gap-2"
              size="sm"
            >
              <Mic className="w-4 h-4" />
              Check Permissions
            </Button>
          </div>

          <div className="bg-yellow-100 p-3 rounded border border-yellow-200">
            <h4 className="font-medium text-yellow-800 mb-2">Troubleshooting Steps:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Make sure your microphone is connected and working</li>
              <li>• Check that microphone permissions are enabled for this site</li>
              <li>• Try using a different browser (Chrome or Firefox recommended)</li>
              <li>• Refresh the page and try again</li>
              <li>• Contact support if the problem continues</li>
            </ul>
          </div>

          {/* Development mode: Show more technical details */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-gray-100 rounded text-xs">
              <strong>Dev Info:</strong> Voice chat error boundary triggered. 
              Check console for detailed error information.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={voiceChatFallback}
      onError={handleVoiceChatError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for admin dashboard functionality
 */
export function AdminErrorBoundary({ children }: Props) {
  const handleAdminError = (error: Error) => {
    console.error('Admin dashboard error:', error);
    
    // Log admin-specific context
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring with admin context
    }
  };

  const adminFallback = (
    <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-red-800 mb-2">
            Dashboard Error
          </h3>
          <p className="text-red-700 mb-4">
            There was an error loading the admin dashboard. Please try refreshing the page.
          </p>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => window.location.reload()}
              className="flex items-center gap-2"
              size="sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reload Dashboard
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.href = '/'}
              size="sm"
            >
              Go to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={adminFallback}
      onError={handleAdminError}
    >
      {children}
    </ErrorBoundary>
  );
}

/**
 * Error boundary for chat/conversation functionality
 */
export function ChatErrorBoundary({ children }: Props) {
  const handleChatError = (error: Error) => {
    console.error('Chat error:', error);
  };

  const chatFallback = (
    <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-blue-800 mb-2">
            Chat Unavailable
          </h3>
          <p className="text-blue-700 mb-4">
            We're having trouble loading the chat interface. Please try again.
          </p>
          
          <Button 
            onClick={() => window.location.reload()}
            className="flex items-center gap-2"
            size="sm"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Chat
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <ErrorBoundary 
      fallback={chatFallback}
      onError={handleChatError}
    >
      {children}
    </ErrorBoundary>
  );
}