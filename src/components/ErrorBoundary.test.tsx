import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { ErrorBoundary } from './ErrorBoundary';
import React from 'react';

// Test component that throws an error
function ThrowError({ shouldThrow = false }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
}

// Test component for async errors
function AsyncErrorComponent({ shouldThrow = false }: { shouldThrow?: boolean }) {
  React.useEffect(() => {
    if (shouldThrow) {
      throw new Error('Async test error');
    }
  }, [shouldThrow]);
  
  return <div>Async component</div>;
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // Suppress console.error for tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('when no error occurs', () => {
    it('should render children normally', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });
  });

  describe('when an error occurs', () => {
    it('should catch error and display fallback UI', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
    });

    it('should display Try Again button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });

    it('should display Reload Page button', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument();
    });

    it('should call onError callback when provided', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(onError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      );
    });

    it('should reset error when Try Again is clicked', () => {
      let shouldThrow = true;

      function DynamicThrowError() {
        return <ThrowError shouldThrow={shouldThrow} />;
      }

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicThrowError />
        </ErrorBoundary>
      );

      // Error boundary should be showing
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the condition to not throw
      shouldThrow = false;

      // Click Try Again - this should reset the error boundary
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Re-render with the updated component
      rerender(
        <ErrorBoundary>
          <DynamicThrowError />
        </ErrorBoundary>
      );

      // Should show the normal content
      expect(screen.getByText('No error')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('custom fallback UI', () => {
    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;

      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });
  });

  describe('development mode', () => {
    it('should show error details in development', () => {
      // Mock development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();

      // Restore environment
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('accessibility', () => {
    it('should be keyboard accessible', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const reloadButton = screen.getByRole('button', { name: /reload page/i });

      // Buttons should be focusable and clickable
      expect(tryAgainButton).toBeInTheDocument();
      expect(reloadButton).toBeInTheDocument();
      expect(tryAgainButton.tagName).toBe('BUTTON');
      expect(reloadButton.tagName).toBe('BUTTON');
    });

    it('should have proper ARIA labels', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Check for heading structure
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Something went wrong');
    });
  });

  describe('error logging', () => {
    it('should log error to console', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error caught by boundary:',
        expect.any(Error),
        expect.any(Object)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error recovery', () => {
    it('should allow component to recover after error reset', () => {
      let shouldThrow = true;

      function DynamicThrowError() {
        return <ThrowError shouldThrow={shouldThrow} />;
      }

      const { rerender } = render(
        <ErrorBoundary>
          <DynamicThrowError />
        </ErrorBoundary>
      );

      // Error should be caught
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      // Change the prop to not throw
      shouldThrow = false;
      
      // Reset the error
      fireEvent.click(screen.getByRole('button', { name: /try again/i }));

      // Re-render with the updated component
      rerender(
        <ErrorBoundary>
          <DynamicThrowError />
        </ErrorBoundary>
      );

      // Component should render normally
      expect(screen.getByText('No error')).toBeInTheDocument();
    });
  });

  describe('error types', () => {
    it('should handle different error types', () => {
      function ThrowDifferentError() {
        throw new TypeError('Type error test');
      }

      render(
        <ErrorBoundary>
          <ThrowDifferentError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors with no message', () => {
      function ThrowEmptyError() {
        throw new Error();
      }

      render(
        <ErrorBoundary>
          <ThrowEmptyError />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('nested error boundaries', () => {
    it('should isolate errors to the nearest boundary', () => {
      function InnerError({ shouldThrow }: { shouldThrow: boolean }) {
        if (shouldThrow) {
          throw new Error('Inner error');
        }
        return <div>Inner content</div>;
      }

      render(
        <ErrorBoundary fallback={<div>Outer boundary</div>}>
          <div>Outer content</div>
          <ErrorBoundary fallback={<div>Inner boundary</div>}>
            <InnerError shouldThrow={true} />
          </ErrorBoundary>
        </ErrorBoundary>
      );

      expect(screen.getByText('Outer content')).toBeInTheDocument();
      expect(screen.getByText('Inner boundary')).toBeInTheDocument();
      expect(screen.queryByText('Outer boundary')).not.toBeInTheDocument();
    });
  });
});