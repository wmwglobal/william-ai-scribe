import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

/**
 * Creates a QueryClient instance configured for testing
 * with retries disabled and faster garbage collection
 */
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides all necessary providers for testing
 */
function AllTheProviders({ children }: ProvidersProps) {
  const queryClient = createTestQueryClient();
  
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
      </BrowserRouter>
    </QueryClientProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers
 * 
 * @example
 * const { getByText } = renderWithProviders(<MyComponent />);
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything from React Testing Library
export * from '@testing-library/react';

// Override the default render with our custom one
export { customRender as render };

/**
 * Utility to create mock data for testing
 */
export const createMockSession = () => ({
  id: 'test-session-123',
  created_at: new Date().toISOString(),
  visitor_id: 'visitor-456',
  personality_id: 'professional',
  lead_score: 75,
  intent: 'discovery_call',
  status: 'active' as const,
});

export const createMockExtract = () => ({
  session_id: 'test-session-123',
  intent: 'discovery_call',
  entities: {
    visitor_name: 'John Doe',
    email: 'john@example.com',
    org_name: 'Tech Corp',
    role: 'VP of Engineering',
    use_case: 'AI implementation',
    timeline: 'Q1 2024',
    budget_range: '$100,000',
  },
  lead_score: 75,
  score_reasons: ['senior_title', 'urgent_timeline', 'budget_>=50k'],
});

/**
 * Wait for async updates in tests
 */
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0));