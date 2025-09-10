# Coding Style Guide

## TypeScript/JavaScript

### General Principles
- Write clear, self-documenting code
- Prefer readability over cleverness
- Use descriptive variable and function names
- Keep functions small and focused (< 50 lines)

### Naming Conventions

```typescript
// Components: PascalCase
export function VoiceRecorder() { }

// Functions/Hooks: camelCase
function calculateLeadScore() { }
function useVoiceChat() { }

// Constants: UPPER_SNAKE_CASE
const MAX_AUDIO_DURATION = 60000;
const API_TIMEOUT = 5000;

// Interfaces/Types: PascalCase with 'I' or 'T' suffix
interface SessionConfigT {
  timeout: number;
}

// Enums: PascalCase for name, PascalCase for values
enum SessionStatus {
  Active = 'active',
  Completed = 'completed'
}

// Files: kebab-case for utilities, PascalCase for components
// voice-utils.ts
// VoiceRecorder.tsx
```

### TypeScript Specific

```typescript
// Always use explicit return types for functions
function processAudio(blob: Blob): Promise<string> {
  return processAsync(blob);
}

// Use type guards for runtime checks
function isErrorResponse(response: any): response is ErrorResponse {
  return response && typeof response.error === 'string';
}

// Prefer interfaces over types for object shapes
interface UserData {
  id: string;
  name: string;
}

// Use discriminated unions for state machines
type ConnectionState = 
  | { status: 'idle' }
  | { status: 'connected'; sessionId: string }
  | { status: 'error'; error: string };

// Avoid any - use unknown and type guards instead
function processData(data: unknown): string {
  if (typeof data === 'string') {
    return data;
  }
  return String(data);
}
```

## React Patterns

### Component Structure

```typescript
// 1. Imports (grouped and ordered)
import React, { useState, useEffect } from 'react';
import { useVoiceChat } from '@/hooks/useVoiceChat';
import { Button } from '@/components/ui/button';
import type { SessionT } from '@/lib/types';

// 2. Type definitions
interface Props {
  session: SessionT;
  onUpdate: (session: SessionT) => void;
}

// 3. Component definition
export function SessionCard({ session, onUpdate }: Props) {
  // 4. State declarations
  const [isLoading, setIsLoading] = useState(false);
  
  // 5. Hooks
  const { startRecording } = useVoiceChat();
  
  // 6. Effects
  useEffect(() => {
    // Effect logic
  }, [dependency]);
  
  // 7. Handlers
  const handleClick = async () => {
    // Handler logic
  };
  
  // 8. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}
```

### Hook Guidelines

```typescript
// Custom hooks must start with 'use'
export function useSessionManager(sessionId: string) {
  // Extract complex logic into hooks
  const [session, setSession] = useState<SessionT | null>(null);
  
  // Return consistent object structure
  return {
    session,
    isLoading,
    error,
    updateSession,
  };
}

// Memoize expensive calculations
const expensiveValue = useMemo(() => {
  return computeExpensive(data);
}, [data]);

// Memoize callbacks passed to children
const handleUpdate = useCallback((value: string) => {
  setState(value);
}, []);
```

## Code Organization

### Import Order
```typescript
// 1. React/Node modules
import React from 'react';
import { useState } from 'react';

// 2. External packages
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

// 3. Internal absolute imports
import { Button } from '@/components/ui/button';
import { useVoiceChat } from '@/hooks/useVoiceChat';

// 4. Relative imports
import { localHelper } from './helpers';

// 5. Types
import type { SessionT } from '@/lib/types';

// 6. Styles (if any)
import styles from './Component.module.css';
```

### File Structure
```typescript
// Group related functionality
// ✅ Good: Clear separation
export function processAudio() { }
export function encodeAudio() { }
export function decodeAudio() { }

// ❌ Bad: Mixed concerns
export function processAudio() { }
export function saveUser() { }
export function formatDate() { }
```

## Async Patterns

```typescript
// Always use async/await over promises
// ✅ Good
async function fetchData() {
  try {
    const data = await api.get('/data');
    return data;
  } catch (error) {
    console.error('Failed to fetch:', error);
    throw error;
  }
}

// ❌ Bad
function fetchData() {
  return api.get('/data')
    .then(data => data)
    .catch(error => {
      console.error('Failed to fetch:', error);
      throw error;
    });
}

// Handle errors at appropriate level
async function handleUserAction() {
  try {
    setLoading(true);
    await performAction();
    toast.success('Action completed');
  } catch (error) {
    toast.error('Action failed');
  } finally {
    setLoading(false);
  }
}
```

## Error Handling

```typescript
// Create custom error classes
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

// Use error boundaries for React components
class ErrorBoundary extends React.Component {
  // Implementation
}

// Log errors appropriately
function logError(error: Error, context?: any) {
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    context
  });
  // Send to monitoring service in production
}
```

## Comments and Documentation

```typescript
/**
 * Calculates the lead score based on extracted entities.
 * 
 * @param extract - The extracted entities from conversation
 * @returns Object containing score (0-100) and reasons
 * 
 * @example
 * const { score, reasons } = calculateLeadScore(extract);
 * if (score >= 70) {
 *   notifyHighValueLead();
 * }
 */
export function calculateLeadScore(extract: ExtractT): LeadScoreResult {
  // Implementation
}

// Use inline comments sparingly for complex logic
function complexAlgorithm(data: number[]) {
  // Fisher-Yates shuffle algorithm
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }
  return data;
}
```

## Testing Conventions

```typescript
// Test file naming: Component.test.tsx or function.test.ts
// Test structure: Arrange, Act, Assert

describe('calculateLeadScore', () => {
  it('should return high score for senior titles', () => {
    // Arrange
    const extract = {
      entities: { role: 'VP of Engineering' },
      intent: 'discovery_call'
    };
    
    // Act
    const { score, reasons } = calculateLeadScore(extract);
    
    // Assert
    expect(score).toBeGreaterThanOrEqual(70);
    expect(reasons).toContain('senior_title');
  });
  
  // Group related tests
  describe('budget scoring', () => {
    it('should add points for high budget', () => {
      // Test implementation
    });
  });
});
```

## Performance Guidelines

```typescript
// Memoize expensive components
const ExpensiveComponent = React.memo(({ data }: Props) => {
  return <div>{/* Render */}</div>;
});

// Debounce user input
const debouncedSearch = useMemo(
  () => debounce((query: string) => {
    searchAPI(query);
  }, 300),
  []
);

// Lazy load heavy components
const HeavyComponent = React.lazy(() => import('./HeavyComponent'));

// Use virtualization for long lists
import { FixedSizeList } from 'react-window';
```

## Tailwind CSS Conventions

```jsx
// Use consistent spacing scale
<div className="p-4 m-2">  // ✅ Good: Using scale

// Group related utilities
<div className="
  flex items-center justify-between
  p-4 border rounded-lg
  bg-white dark:bg-gray-800
  hover:shadow-lg transition-shadow
">

// Extract common patterns to components
// Instead of repeating:
<button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">

// Create reusable component:
<Button variant="primary">

// Use semantic color names via CSS variables
// Define in CSS:
:root {
  --color-primary: theme('colors.blue.500');
  --color-danger: theme('colors.red.500');
}
```

## Git Commit Messages

```bash
# Format: <type>(<scope>): <subject>

# Types:
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting, etc)
refactor: Code refactoring
test: Adding tests
chore: Maintenance tasks

# Examples:
feat(voice): add barge-in support for voice chat
fix(lead-scoring): correct score calculation for enterprise clients
docs(readme): update installation instructions
refactor(hooks): extract audio logic into separate hook
test(api): add integration tests for session creation
```

## Code Review Checklist

Before submitting code:
- [ ] TypeScript compiles without errors
- [ ] ESLint passes without warnings
- [ ] Tests pass and coverage maintained
- [ ] No console.log statements
- [ ] Error handling in place
- [ ] Performance impact considered
- [ ] Accessibility requirements met
- [ ] Documentation updated
- [ ] Follows naming conventions
- [ ] No commented-out code
- [ ] No TODO comments without tickets

## Common Patterns

### Conditional Rendering
```jsx
// ✅ Good: Clear and concise
{isLoading && <Spinner />}
{error && <ErrorMessage error={error} />}
{data && <DataDisplay data={data} />}

// ❌ Avoid: Nested ternaries
{isLoading ? <Spinner /> : error ? <Error /> : <Data />}
```

### State Updates
```typescript
// ✅ Good: Functional updates for derived state
setState(prev => ({ ...prev, newField: value }));

// ✅ Good: Separate state for unrelated values
const [isLoading, setIsLoading] = useState(false);
const [data, setData] = useState(null);

// ❌ Bad: Single state for everything
const [state, setState] = useState({
  isLoading: false,
  data: null,
  error: null,
  // ... many more fields
});
```

## Accessibility

```jsx
// Always include ARIA labels
<button aria-label="Start recording">
  <MicIcon />
</button>

// Use semantic HTML
<nav> instead of <div className="navigation">
<main> instead of <div className="content">
<button> instead of <div onClick>

// Keyboard navigation
<div
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>

// Focus management
useEffect(() => {
  if (isOpen) {
    dialogRef.current?.focus();
  }
}, [isOpen]);
```

## Security

```typescript
// Sanitize user input
import DOMPurify from 'dompurify';
const sanitized = DOMPurify.sanitize(userInput);

// Never expose sensitive data
// ✅ Good
const publicConfig = {
  apiUrl: process.env.VITE_API_URL,
};

// ❌ Bad
const config = {
  apiKey: process.env.API_KEY, // Never expose
};

// Validate all external input
const schema = z.object({
  email: z.string().email(),
  message: z.string().max(1000),
});

const validated = schema.parse(userInput);
```