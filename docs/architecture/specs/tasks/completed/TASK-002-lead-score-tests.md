# Task: TASK-002 - Add Unit Tests for Lead Scoring

## Specification Reference
- Feature: Lead Scoring Engine (specs/specification.md#feature-lead-scoring-engine)
- Priority: P1 (High - Core business logic)

## Implementation Details

### Current State
- Lead scoring algorithm in `/src/lib/leadScore.ts`
- No tests for scoring logic
- Complex business rules undocumented in tests
- Edge cases not validated

### Target State
- 100% test coverage for lead scoring functions
- All scoring criteria tested
- Edge cases documented and tested
- Test data fixtures created
- Performance benchmarks established

### Acceptance Criteria
- [ ] All functions in leadScore.ts have tests
- [ ] Test coverage > 95% for the file
- [ ] All scoring criteria from spec tested
- [ ] Edge cases handled (null, undefined, empty)
- [ ] Score bounds (0-100) validated
- [ ] Priority classification tested
- [ ] Slack notification threshold tested
- [ ] Performance: scoring < 10ms per call

### Technical Approach

1. **Create Comprehensive Test Suite**
   ```typescript
   // src/lib/leadScore.test.ts
   import { describe, it, expect, beforeEach } from 'vitest';
   import { 
     scoreLead, 
     getLeadPriority, 
     shouldNotifySlack,
     getScoreColor,
     getScoreBadgeVariant 
   } from './leadScore';
   import type { ExtractT } from './types';
   ```

2. **Test Scoring Criteria**
   - Senior title bonus (+30)
   - Budget indicators (+20)
   - Timeline urgency (+15)
   - Warm introduction (+10)
   - Strategic alignment (+10)
   - Enterprise client (+10)
   - Vendor pitch (-15)
   - General interest (-10)
   - Academic inquiry (-10)

3. **Test Edge Cases**
   - Empty entities object
   - Null/undefined values
   - Mixed positive/negative factors
   - Score boundary conditions
   - Invalid data types

4. **Create Test Fixtures**
   ```typescript
   // src/test/fixtures/lead-extracts.ts
   export const highValueLead: ExtractT = {
     intent: 'discovery_call',
     entities: {
       role: 'VP of Engineering',
       budget_range: '$500,000',
       timeline: 'Q1',
       org_name: 'Fortune 500 Company'
     }
   };

   export const lowValueLead: ExtractT = {
     intent: 'advice_request',
     entities: {
       role: 'Student',
       use_case: 'academic research'
     }
   };
   ```

5. **Test All Functions**
   ```typescript
   describe('scoreLead', () => {
     describe('scoring criteria', () => {
       it('should add 30 points for senior titles', () => {});
       it('should add 20 points for high budget', () => {});
       it('should add 15 points for urgent timeline', () => {});
       it('should add 10 points for warm intro', () => {});
       it('should subtract points for vendors', () => {});
     });

     describe('score bounds', () => {
       it('should never exceed 100', () => {});
       it('should never go below 0', () => {});
     });

     describe('reason tracking', () => {
       it('should include all applicable reasons', () => {});
       it('should not duplicate reasons', () => {});
     });
   });

   describe('getLeadPriority', () => {
     it('should return high for scores >= 70', () => {});
     it('should return medium for scores 40-69', () => {});
     it('should return low for scores < 40', () => {});
   });

   describe('shouldNotifySlack', () => {
     it('should return true for high-value leads', () => {});
     it('should respect custom thresholds', () => {});
   });
   ```

6. **Add Performance Tests**
   ```typescript
   import { bench, describe } from 'vitest';

   describe('performance', () => {
     bench('scoreLead with complex extract', () => {
       scoreLead(complexExtract);
     });
   });
   ```

### Dependencies
- Depends on: TASK-001 (Testing framework setup)
- Blocks: None

### Estimated Complexity
- Size: S (Small - 1-2 hours)
- AI Implementable: Yes (with specification)
- Review Required: Automated + Human (business logic validation)

### Test Scenarios

#### Core Functionality Tests
1. **Senior Title Detection**
   - Test: VP, Chief, Director, CEO, CTO, Founder
   - Verify: +30 points added

2. **Budget Recognition**
   - Test: $50k, $100,000, 500k variations
   - Verify: +20 points added

3. **Timeline Urgency**
   - Test: "now", "urgent", "Q1", "next month"
   - Verify: +15 points added

4. **Combination Scenarios**
   - High-value: Senior + Budget + Urgent = 65+ points
   - Medium-value: Some positive factors = 40-69 points
   - Low-value: Student/Academic = <40 points

#### Edge Cases
1. Empty extract object
2. Null entities
3. Special characters in text
4. Very long strings
5. Non-English text

### Implementation Notes
- Use parameterized tests for similar scenarios
- Create helper functions for test data generation
- Consider property-based testing for edge cases
- Mock external dependencies if any
- Test both the scoring logic and the UI helper functions

### Success Metrics
- All tests pass
- Coverage > 95% for leadScore.ts
- No performance regression
- Clear documentation of business rules
- Easy to modify when rules change