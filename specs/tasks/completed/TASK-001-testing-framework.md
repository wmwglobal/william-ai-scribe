# Task: TASK-001 - Set Up Testing Framework

## Specification Reference
- Feature: Development Infrastructure
- Priority: P0 (Critical - Blocks all testing tasks)

## Implementation Details

### Current State
- No testing framework configured
- 0% test coverage
- No test scripts in package.json
- Manual testing only

### Target State
- Vitest configured for unit and integration tests
- React Testing Library for component tests
- Test scripts added to package.json
- Initial test utilities created
- Coverage reporting enabled

### Acceptance Criteria
- [ ] Vitest installed and configured
- [ ] React Testing Library installed
- [ ] Test scripts added to package.json
- [ ] Sample test file runs successfully
- [ ] Coverage reporting works
- [ ] CI-friendly test output configured
- [ ] Test utilities created for common patterns
- [ ] Documentation updated with testing instructions

### Technical Approach

1. **Install Dependencies**
   ```bash
   npm install -D vitest @vitest/ui @testing-library/react 
   npm install -D @testing-library/jest-dom @testing-library/user-event
   npm install -D jsdom happy-dom
   ```

2. **Create Vitest Config**
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react-swc';
   import path from 'path';

   export default defineConfig({
     plugins: [react()],
     test: {
       environment: 'jsdom',
       globals: true,
       setupFiles: './src/test/setup.ts',
       coverage: {
         reporter: ['text', 'json', 'html'],
         exclude: ['node_modules/', 'src/test/']
       }
     },
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
       },
     },
   });
   ```

3. **Create Test Setup**
   ```typescript
   // src/test/setup.ts
   import '@testing-library/jest-dom';
   import { cleanup } from '@testing-library/react';
   import { afterEach } from 'vitest';

   afterEach(() => {
     cleanup();
   });
   ```

4. **Add Test Scripts**
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:run": "vitest run",
       "test:coverage": "vitest run --coverage"
     }
   }
   ```

5. **Create Test Utilities**
   ```typescript
   // src/test/test-utils.tsx
   import { render } from '@testing-library/react';
   import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
   import { BrowserRouter } from 'react-router-dom';

   export function renderWithProviders(ui: React.ReactElement) {
     const queryClient = new QueryClient({
       defaultOptions: { queries: { retry: false } }
     });
     
     return render(
       <QueryClientProvider client={queryClient}>
         <BrowserRouter>
           {ui}
         </BrowserRouter>
       </QueryClientProvider>
     );
   }
   ```

6. **Create Sample Test**
   ```typescript
   // src/lib/leadScore.test.ts
   import { describe, it, expect } from 'vitest';
   import { scoreLead } from './leadScore';

   describe('scoreLead', () => {
     it('should return high score for senior titles', () => {
       const extract = {
         intent: 'discovery_call',
         entities: { role: 'VP of Engineering' }
       };
       
       const { score, reasons } = scoreLead(extract);
       
       expect(score).toBeGreaterThanOrEqual(30);
       expect(reasons).toContain('senior_title');
     });
   });
   ```

### Dependencies
- Depends on: None (foundational task)
- Blocks: TASK-002, TASK-004, TASK-005 (all testing tasks)

### Estimated Complexity
- Size: M (Medium - 2-4 hours)
- AI Implementable: Yes
- Review Required: Human (configuration validation)

### Test Scenarios
1. Run `npm test` - should start Vitest in watch mode
2. Run `npm run test:run` - should run tests once
3. Run `npm run test:coverage` - should generate coverage report
4. Create and run a simple unit test
5. Create and run a React component test
6. Verify test utilities work correctly

### Implementation Notes
- Choose jsdom for React component testing
- Configure path aliases to match main app
- Set up coverage thresholds after baseline established
- Consider adding Playwright for E2E tests later

### Success Metrics
- All test commands work
- Sample tests pass
- Coverage reporting functional
- No impact on build process
- Documentation clear for other developers