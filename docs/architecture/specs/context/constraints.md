# Development Constraints for AI Agents

## Forbidden Patterns

### Never Use These Patterns
1. **Direct API Key Usage**
   - ❌ Never hardcode API keys in source code
   - ❌ Never expose keys in client-side code
   - ❌ Never commit keys to version control

2. **Deprecated React Patterns**
   - ❌ Never use class components (use functional components)
   - ❌ Never use componentWillMount or other deprecated lifecycle methods
   - ❌ Never use string refs (use useRef hook)

3. **Anti-Patterns from Existing Code**
   - ❌ Avoid console.log statements in production code
   - ❌ Don't use `any` type without explicit justification
   - ❌ Avoid synchronous operations that block the event loop
   - ❌ Never modify state directly (always use immutable updates)

4. **Security Violations**
   - ❌ Never trust user input without validation
   - ❌ Never use eval() or new Function()
   - ❌ Never expose internal error messages to users
   - ❌ Never store sensitive data in localStorage

5. **Performance Issues**
   - ❌ Avoid unnecessary re-renders (use memo, useMemo, useCallback)
   - ❌ Don't fetch data in render methods
   - ❌ Avoid large bundle imports (use dynamic imports)
   - ❌ Never block the main thread with heavy computations

## Required Patterns

### Always Follow These Patterns

1. **TypeScript Usage**
   ```typescript
   // ✅ Always define explicit types for function parameters
   function processAudio(audio: Blob, sampleRate: number): Promise<string>
   
   // ✅ Use interfaces for object shapes
   interface SessionConfig {
     timeout: number;
     retries: number;
   }
   
   // ✅ Use discriminated unions for state
   type ConnectionState = 
     | { status: 'idle' }
     | { status: 'connecting' }
     | { status: 'connected'; sessionId: string }
     | { status: 'error'; message: string };
   ```

2. **React Patterns**
   ```typescript
   // ✅ Use functional components with hooks
   export function Component({ prop }: Props) {
     const [state, setState] = useState(initial);
     // ...
   }
   
   // ✅ Extract logic into custom hooks
   function useVoiceRecording() {
     // Complex logic here
     return { isRecording, startRecording, stopRecording };
   }
   ```

3. **Error Handling**
   ```typescript
   // ✅ Always wrap async operations in try-catch
   try {
     const result = await apiCall();
   } catch (error) {
     // Handle error appropriately
     console.error('Operation failed:', error);
     // Show user-friendly message
   }
   
   // ✅ Use error boundaries for component errors
   ```

4. **Supabase Integration**
   ```typescript
   // ✅ Use Edge Functions for API integrations
   // ✅ Handle Supabase errors properly
   const { data, error } = await supabase.from('table').select();
   if (error) {
     // Handle error
   }
   ```

5. **Audio Processing**
   ```typescript
   // ✅ Always use base64 encoding for audio transport
   // ✅ Implement proper cleanup for audio resources
   // ✅ Handle audio permissions properly
   ```

## Integration Points

### How New Code Should Integrate

1. **With Existing Hooks**
   - New features should create custom hooks in `/src/hooks/`
   - Reuse existing hooks like `useVoiceChat` when appropriate
   - Follow the established pattern of refs for audio utilities

2. **With Supabase**
   - All external API calls go through Edge Functions
   - Use the existing Supabase client from `/src/integrations/supabase/`
   - Follow the session/secret authentication pattern

3. **With UI Components**
   - Use shadcn/ui components from `/src/components/ui/`
   - Follow existing Tailwind CSS patterns
   - Maintain responsive design

4. **With State Management**
   - Use React Query for server state
   - Use local state (useState) for UI state
   - Consider using refs for values that don't trigger re-renders

## Backward Compatibility Rules

### What Must Remain Unchanged

1. **Database Schema**
   - Never modify existing column types
   - Only add new columns (with defaults) or new tables
   - Never delete data without migration plan

2. **API Contracts**
   - Edge Function endpoints must maintain existing interfaces
   - New parameters should be optional
   - Response formats must be backward compatible

3. **Session Management**
   - Session ID and secret pattern must be preserved
   - Existing sessions must continue to work

4. **Audio Format**
   - Base64 encoding for audio transport must be maintained
   - WebM format for audio recording
   - Sample rate compatibility

## Code Quality Requirements

### Mandatory Practices

1. **Testing**
   - New features must include unit tests
   - Critical paths need integration tests
   - Test coverage should increase, not decrease

2. **Documentation**
   - All public functions need JSDoc comments
   - Complex algorithms need inline explanations
   - New features need README updates

3. **Performance**
   - New code must not increase initial bundle size by >10KB
   - API responses must complete within 5 seconds
   - Memory leaks must be prevented

4. **Accessibility**
   - All interactive elements must be keyboard accessible
   - ARIA labels for screen readers
   - Proper focus management

## Technology Constraints

### Version Requirements
- React: 18.x only
- TypeScript: 5.x
- Node: 18+ for development
- Supabase Client: 2.x

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

### External Service Limits
- Groq API: Rate limits apply
- ElevenLabs: Character limits per month
- OpenAI: Token limits
- Supabase: Bandwidth and storage limits

## Development Workflow Constraints

1. **Branch Protection**
   - Never commit directly to main
   - Always create feature branches
   - PRs require review

2. **Commit Standards**
   - Use conventional commits (feat:, fix:, docs:)
   - Keep commits atomic and focused
   - Write clear commit messages

3. **Code Review Requirements**
   - All code must be reviewed
   - Tests must pass
   - No decrease in coverage

## Migration Constraints

### During Migration Phase
1. Keep existing functionality working
2. Don't break existing user sessions
3. Maintain data integrity
4. Provide rollback capability
5. Document all changes

### Post-Migration
1. Deprecate old patterns gradually
2. Maintain compatibility for 30 days
3. Provide migration guides
4. Support data export if needed

## AI Agent Specific Rules

### When Generating Code
1. **Read existing code first** - Understand patterns before writing
2. **Match existing style** - Don't introduce new patterns unnecessarily
3. **Test your changes** - Ensure code compiles and runs
4. **Update related files** - Don't leave broken imports
5. **Consider edge cases** - Handle errors and edge conditions

### When Modifying Code
1. **Preserve functionality** - Don't break existing features
2. **Maintain tests** - Update tests to match changes
3. **Update documentation** - Keep docs in sync
4. **Check dependencies** - Ensure versions are compatible
5. **Validate types** - TypeScript must compile without errors

## Common Pitfalls to Avoid

1. **State Management**
   - Don't create redundant state
   - Avoid state synchronization issues
   - Prevent infinite loops

2. **Async Operations**
   - Don't forget cleanup functions
   - Avoid race conditions
   - Handle loading and error states

3. **Memory Management**
   - Clean up event listeners
   - Dispose of audio resources
   - Cancel pending requests

4. **Security**
   - Don't expose sensitive data
   - Validate all inputs
   - Sanitize user content

## Validation Checklist

Before submitting code, ensure:
- [ ] TypeScript compiles without errors
- [ ] No ESLint warnings
- [ ] Tests pass
- [ ] No console.log statements
- [ ] Error handling in place
- [ ] Documentation updated
- [ ] Performance impact assessed
- [ ] Security review completed
- [ ] Backward compatibility maintained
- [ ] Accessibility requirements met