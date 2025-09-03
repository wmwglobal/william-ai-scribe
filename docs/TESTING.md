# Testing Documentation

## Overview
William AI Scribe uses Vitest as its testing framework with React Testing Library for component testing. The testing infrastructure was set up as part of TASK-001 in the spec-driven development migration.

## Test Framework
- **Vitest**: Modern, fast unit testing framework with Vite integration
- **React Testing Library**: Testing utilities for React components
- **jsdom**: DOM implementation for Node.js
- **@testing-library/user-event**: User interaction simulation

## Running Tests

```bash
# Run tests in watch mode (development)
npm test

# Run tests once (CI/CD)
npm run test:run

# Open interactive UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests
Located alongside source files with `.test.ts` extension:
```
src/lib/leadScore.ts
src/lib/leadScore.test.ts
```

### Component Tests
Located alongside components with `.test.tsx` extension:
```
src/components/ui/button.tsx
src/components/ui/button.test.tsx
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { myFunction } from './myModule';

describe('myFunction', () => {
  it('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

### Component Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@/test/test-utils';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('should render and handle clicks', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## Test Utilities

The project provides custom test utilities in `/src/test/test-utils.tsx`:

### Custom Render
Wraps components with necessary providers:
```typescript
import { render } from '@/test/test-utils';

// Automatically wraps with QueryClient and Router
const { getByText } = render(<MyComponent />);
```

### Mock Data Factories
```typescript
import { createMockSession, createMockExtract } from '@/test/test-utils';

const session = createMockSession();
const extract = createMockExtract();
```

## Coverage Goals

### Current Coverage
- Lead Scoring: 95.77%
- Button Component: 100%
- Overall: Growing from 0% baseline

### Target Coverage
- Unit Tests: 80%
- Integration Tests: 60%
- E2E Tests: Critical paths only

## Best Practices

### Test Organization
1. **Arrange-Act-Assert**: Structure tests clearly
2. **One assertion per test**: Keep tests focused
3. **Descriptive names**: Test names should explain what they test
4. **Group related tests**: Use `describe` blocks

### Component Testing
1. **Test behavior, not implementation**: Focus on user interactions
2. **Use semantic queries**: Prefer `getByRole` over `getByTestId`
3. **Mock external dependencies**: Isolate components under test
4. **Test accessibility**: Ensure components are accessible

### Performance
1. **Mock heavy operations**: Database calls, API requests
2. **Use test utilities**: Reuse common setup
3. **Cleanup after tests**: Prevent memory leaks
4. **Parallel execution**: Tests run in parallel by default

## Configuration

### Vitest Config (`vitest.config.ts`)
```typescript
export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/']
    }
  }
});
```

### Test Setup (`src/test/setup.ts`)
- Imports jest-dom matchers
- Configures cleanup after each test
- Mocks window.matchMedia
- Mocks IntersectionObserver

## Continuous Integration

### GitHub Actions (Future)
```yaml
- name: Run tests
  run: npm run test:run
  
- name: Generate coverage
  run: npm run test:coverage
  
- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Common Issues

### React Router Warnings
Warnings about future flags are expected and can be ignored for now. They will be addressed when upgrading React Router.

### Memory Leaks
Always cleanup in tests:
```typescript
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});
```

### Async Testing
Use `waitFor` for async operations:
```typescript
import { waitFor } from '@testing-library/react';

await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument();
});
```

## Next Steps

1. **Increase Coverage**: Add tests for critical paths
2. **Integration Tests**: Test API interactions
3. **E2E Tests**: Consider Playwright for end-to-end testing
4. **Performance Testing**: Add benchmarks for critical functions
5. **Visual Regression**: Consider adding visual testing

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Jest DOM Matchers](https://github.com/testing-library/jest-dom)