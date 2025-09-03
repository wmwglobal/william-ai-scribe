# Validation Checklist: Lead Scoring Engine

## Pre-Implementation
- [ ] Business rules documented and approved
- [ ] Scoring weights confirmed with stakeholders
- [ ] Score thresholds (High/Medium/Low) validated
- [ ] Slack notification threshold confirmed
- [ ] Test data sets prepared
- [ ] Edge cases identified

## Implementation

### Scoring Logic
- [ ] Senior title detection (+30 points)
- [ ] Budget recognition (+20 points)
- [ ] Timeline urgency (+15 points)
- [ ] Warm introduction (+10 points)
- [ ] Strategic alignment (+10 points)
- [ ] Enterprise indicators (+10 points)
- [ ] Vendor/partnership penalties (-15 points)
- [ ] General interest penalties (-10 points)
- [ ] Academic inquiry penalties (-10 points)

### Score Calculation
- [ ] Points accumulate correctly
- [ ] Score stays within 0-100 bounds
- [ ] Negative scores floor at 0
- [ ] Scores above 100 cap at 100
- [ ] Floating point handling correct
- [ ] No calculation overflow issues

### Reason Tracking
- [ ] All applied rules tracked in reasons array
- [ ] Reasons use consistent naming
- [ ] No duplicate reasons
- [ ] Reasons match score components
- [ ] Empty reasons array when score is 0

### Priority Classification
- [ ] High priority for scores >= 70
- [ ] Medium priority for scores 40-69
- [ ] Low priority for scores < 40
- [ ] Edge cases at boundaries tested
- [ ] Classification updates with score changes

### Integration
- [ ] Slack notification triggers at threshold
- [ ] Extract data properly parsed
- [ ] Null/undefined entities handled
- [ ] Empty strings handled gracefully
- [ ] Special characters don't break regex
- [ ] Case-insensitive matching works

## Post-Implementation

### Testing Coverage
- [ ] Unit tests for scoreLead function
- [ ] Unit tests for getLeadPriority
- [ ] Unit tests for shouldNotifySlack
- [ ] Unit tests for UI helper functions
- [ ] Integration tests with real extracts
- [ ] Performance benchmarks established
- [ ] Edge case tests comprehensive
- [ ] Test coverage > 95%

### Accuracy Validation
- [ ] Test with 50+ real examples
- [ ] False positive rate < 10%
- [ ] False negative rate < 10%
- [ ] Score distribution reasonable
- [ ] High-value leads identified correctly
- [ ] Low-value leads filtered properly

### Business Validation
- [ ] Stakeholders review sample scores
- [ ] Sales team validates lead quality
- [ ] Notification frequency acceptable
- [ ] Score explanations clear
- [ ] Adjustments documented

## Validation Scenarios

### High-Value Lead
```typescript
{
  entities: {
    role: "VP of Engineering",
    org_name: "Fortune 500 Company",
    budget_range: "$500,000",
    timeline: "Q1 2024",
    use_case: "AI strategy implementation"
  }
}
// Expected: Score >= 70, Slack notification sent
```

### Medium-Value Lead
```typescript
{
  entities: {
    role: "Engineering Manager",
    budget_range: "$50,000",
    use_case: "content recommendation"
  }
}
// Expected: Score 40-69, No Slack notification
```

### Low-Value Lead
```typescript
{
  entities: {
    role: "Student",
    use_case: "academic research",
    org_name: "University"
  }
}
// Expected: Score < 40, Marked as low priority
```

### Edge Cases

#### Empty Extract
```typescript
{
  entities: {}
}
// Expected: Score 0, No errors
```

#### Null Values
```typescript
{
  entities: {
    role: null,
    budget_range: undefined
  }
}
// Expected: Handles gracefully, score 0
```

#### Mixed Signals
```typescript
{
  entities: {
    role: "CEO", // +30
    use_case: "vendor partnership" // -15
  }
}
// Expected: Score 15 (30 - 15)
```

## Performance Criteria
- [ ] Scoring completes in < 10ms
- [ ] No memory leaks
- [ ] Handles 1000 scores/second
- [ ] Regex patterns optimized
- [ ] No blocking operations

## Documentation
- [ ] Scoring algorithm documented
- [ ] Business rules explained
- [ ] Configuration options documented
- [ ] Integration guide written
- [ ] Troubleshooting section added

## Security & Privacy
- [ ] No PII logged unnecessarily
- [ ] Scores stored securely
- [ ] Audit trail maintained
- [ ] No sensitive data in Slack notifications
- [ ] GDPR compliance checked

## Monitoring & Metrics
- [ ] Score distribution tracked
- [ ] Conversion rate monitored
- [ ] False positive/negative rates tracked
- [ ] Notification frequency logged
- [ ] Performance metrics collected

## Sign-off

### Technical Review
- [ ] Algorithm correctness verified
- [ ] Performance acceptable
- [ ] Code quality approved
- [ ] Tests comprehensive

### Business Review
- [ ] Scoring accuracy validated
- [ ] Business value confirmed
- [ ] Stakeholder approval obtained
- [ ] ROI projections met

### Deployment Readiness
- [ ] Production data tested
- [ ] Rollback plan ready
- [ ] Monitoring configured
- [ ] Documentation complete

## Notes
- Critical business logic requiring careful validation
- Score weights may need adjustment based on data
- Consider A/B testing different scoring models
- Monitor conversion rates post-deployment
- Prepare for quick iteration based on feedback