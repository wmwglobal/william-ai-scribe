# AI Agent Implementation Workflow

## Overview
This document provides instructions for AI agents (Claude, GitHub Copilot, etc.) to implement features following the spec-driven development approach for William AI Scribe.

## Before You Start
1. **Read the specifications** in `/specs/`
2. **Check the context** in `/specs/context/`
3. **Review current tasks** in `/specs/tasks/`
4. **Understand constraints** in `/specs/context/constraints.md`

## Implementation Workflow

### For Each Task

1. **Load Task Specification**
   ```bash
   # Read the task file from specs/tasks/backlog/
   # Example: specs/tasks/backlog/TASK-001-testing-framework.md
   ```

2. **Read Relevant Context**
   - Architecture: `specs/context/architecture.md`
   - Constraints: `specs/context/constraints.md`
   - Style Guide: `specs/context/style-guide.md`
   - Domain Terms: `specs/context/domain-glossary.md`

3. **Implement Following Rules**
   - ✅ Follow style guide exactly
   - ✅ Write tests first (TDD approach)
   - ✅ Include comprehensive error handling
   - ✅ Add detailed JSDoc comments
   - ✅ Update documentation as needed
   - ❌ Never skip tests
   - ❌ Never ignore TypeScript errors
   - ❌ Never commit console.log statements

## Implementation Commands

### To implement a new task:
```
implement_task TASK-001
```
1. Load task specification from `specs/tasks/backlog/TASK-001-*.md`
2. Check dependencies - ensure prerequisite tasks are complete
3. Generate implementation based on:
   - Acceptance criteria in task
   - Technical approach outlined
   - Style guide requirements
4. Create/update tests as specified
5. Update relevant documentation

### To refactor existing code:
```
refactor_with_spec COMPONENT_NAME
```
1. Load current implementation
2. Load target specification from `specs/specification.md`
3. Generate refactoring plan:
   - Identify differences
   - List breaking changes
   - Plan migration steps
4. Implement changes incrementally
5. Maintain backward compatibility
6. Update tests to match new structure

### To generate tests:
```
generate_tests COMPONENT_NAME
```
1. Analyze specification for component
2. Create comprehensive test suite:
   - Unit tests for pure functions
   - Integration tests for API calls
   - Component tests for React components
3. Include edge cases from spec
4. Aim for >80% coverage
5. Use test fixtures from `src/test/fixtures/`

### To validate implementation:
```
validate_task TASK-001
```
1. Run acceptance criteria checks
2. Execute test suite:
   ```bash
   npm test -- --run
   npm run test:coverage
   ```
3. Check code quality:
   ```bash
   npm run lint
   npx tsc --noEmit
   ```
4. Verify documentation updates
5. Confirm no regressions

## File Generation Patterns

### Creating a New Component
```typescript
// src/components/NewComponent.tsx

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ComponentProps } from '@/lib/types';

interface Props extends ComponentProps {
  // Specific props here
}

/**
 * Brief description of component purpose
 * 
 * @example
 * <NewComponent prop="value" />
 */
export function NewComponent({ className, ...props }: Props) {
  // Implementation following style guide
  
  return (
    <div className={cn('default-styles', className)}>
      {/* Component JSX */}
    </div>
  );
}
```

### Creating a Test File
```typescript
// src/components/NewComponent.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewComponent } from './NewComponent';

describe('NewComponent', () => {
  // Setup if needed
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render with default props', () => {
      render(<NewComponent />);
      expect(screen.getByRole('...')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should handle user interaction', async () => {
      // Test implementation
    });
  });

  describe('edge cases', () => {
    it('should handle null values gracefully', () => {
      // Edge case tests
    });
  });
});
```

### Creating a Hook
```typescript
// src/hooks/useNewHook.ts

import { useState, useEffect, useCallback } from 'react';

/**
 * Hook description
 * 
 * @param param - Parameter description
 * @returns Object with hook values and methods
 * 
 * @example
 * const { data, loading, error } = useNewHook(param);
 */
export function useNewHook(param: ParamType) {
  const [state, setState] = useState<StateType>(initialState);

  useEffect(() => {
    // Effect implementation
  }, [dependencies]);

  const method = useCallback(() => {
    // Method implementation
  }, [dependencies]);

  return {
    state,
    method,
    // Other returns
  };
}
```

## Validation Commands

### To validate implementation:
```bash
# Run tests
npm test

# Check coverage
npm run test:coverage

# Run linter
npm run lint

# Type check
npx tsc --noEmit

# Build check
npm run build
```

### To validate task completion:
Check against acceptance criteria in task specification:
- [ ] All criteria met
- [ ] Tests passing
- [ ] Coverage target met
- [ ] Documentation updated
- [ ] No regressions

## Common Implementation Patterns

### Error Handling
```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  console.error('Operation failed:', error);
  // User-friendly error handling
  toast.error('Something went wrong. Please try again.');
  throw error; // Re-throw if needed for error boundary
}
```

### API Integration
```typescript
// Always use Edge Functions for external APIs
const { data, error } = await supabase.functions.invoke('function-name', {
  body: { param: value }
});

if (error) {
  // Handle error appropriately
}
```

### State Management
```typescript
// Use React Query for server state
const { data, isLoading, error } = useQuery({
  queryKey: ['data', id],
  queryFn: () => fetchData(id),
});

// Use useState for local UI state
const [isOpen, setIsOpen] = useState(false);
```

## Task Status Management

### Moving Task to In-Progress
1. Move file from `specs/tasks/backlog/` to `specs/tasks/in-progress/`
2. Start implementation
3. Create branch: `feature/TASK-001-description`

### Completing a Task
1. Ensure all acceptance criteria met
2. All tests passing
3. Documentation updated
4. Move file to `specs/tasks/completed/`
5. Update `specs/tasks/README.md` with completion

## AI-Specific Instructions

### When Generating Code
1. **ALWAYS** read existing code first to understand patterns
2. **MATCH** existing code style exactly
3. **TEST** your changes - ensure they compile and run
4. **UPDATE** all related files - don't leave broken imports
5. **CONSIDER** edge cases and error conditions

### When Modifying Code
1. **PRESERVE** existing functionality unless spec says otherwise
2. **MAINTAIN** test coverage - update tests for changes
3. **UPDATE** documentation to match changes
4. **CHECK** that dependencies are compatible
5. **VALIDATE** TypeScript types compile without errors

### When Creating Tests
1. **FOLLOW** Arrange-Act-Assert pattern
2. **TEST** happy path and edge cases
3. **MOCK** external dependencies
4. **USE** meaningful test descriptions
5. **AIM** for high coverage but focus on critical paths

## Spec References

### Key Specifications
- Main Spec: `specs/specification.md`
- Technical Plan: `specs/plan.md`
- Architecture: `specs/context/architecture.md`
- Style Guide: `specs/context/style-guide.md`

### Where to Find Information
- **Feature Requirements**: `specs/specification.md#functional-requirements`
- **API Contracts**: `specs/specification.md#api-specification`
- **Data Models**: `specs/specification.md#data-models`
- **Business Rules**: `specs/specification.md#business-rules`
- **Performance Targets**: `specs/plan.md#performance-requirements`

## Common Pitfalls to Avoid

1. **Don't skip tests** - Every feature needs tests
2. **Don't ignore TypeScript errors** - Fix them properly
3. **Don't break existing features** - Maintain backward compatibility
4. **Don't expose secrets** - Keep API keys in environment variables
5. **Don't forget documentation** - Update docs with code changes

## Getting Help

If specifications are unclear:
1. Check related documentation
2. Look for similar implementations in codebase
3. Follow established patterns
4. Ask for clarification in task comments

## Success Checklist

Before considering a task complete:
- [ ] Code follows style guide
- [ ] All tests passing
- [ ] TypeScript compiles without errors
- [ ] No ESLint warnings
- [ ] Documentation updated
- [ ] Acceptance criteria met
- [ ] Performance impact assessed
- [ ] Security considerations addressed
- [ ] Error handling comprehensive
- [ ] Code reviewed (self-review minimum)