import type { ExtractT } from '@/lib/types';

/**
 * Test fixtures for lead scoring tests
 * These represent real-world scenarios for testing the lead scoring algorithm
 */

// High-value leads (should score >= 70)
export const highValueLead: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'VP of Engineering',
    budget_range: '500k',
    timeline: 'Q1',
    org_name: 'Fortune 500 Company',
    use_case: 'AI strategy implementation',
    visitor_name: 'Jane Smith',
    email: 'jane@fortune500.com'
  }
};

export const ceoWithUrgentNeed: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'CEO',
    budget_range: '200k',
    timeline: 'now',
    org_name: 'TechCorp',
    use_case: 'machine learning implementation'
  }
};

export const warmIntroHighBudget: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Director of Innovation',
    budget_range: '100k',
    timeline: 'this month',
    org_name: 'Referred by John at Google',
    email: 'director@google.com'
  }
};

// Medium-value leads (should score 40-69)
export const mediumValueLead: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Engineering Manager',
    budget_range: '50k',
    use_case: 'content recommendation'
  }
};

export const managerWithTimeline: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Product Manager',
    timeline: 'Q2',
    use_case: 'personalization'
  }
};

// Low-value leads (should score < 40)
export const lowValueLead: ExtractT = {
  intent: 'advice_request',
  entities: {
    role: 'Student',
    use_case: 'academic research',
    org_name: 'University'
  }
};

export const vendorPitch: ExtractT = {
  intent: 'partnership_inquiry',
  entities: {
    use_case: 'agency partnership',
    org_name: 'Marketing Agency LLC',
    role: 'Sales Representative'
  }
};

export const generalInterestLead: ExtractT = {
  intent: 'supporter_fan',
  entities: {
    visitor_name: 'Fan User',
    use_case: 'just curious about AI'
  }
};

// Edge cases
export const emptyExtract: ExtractT = {
  intent: 'unknown',
  entities: {}
};

export const nullValuesExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: null as any,
    budget_range: undefined as any,
    timeline: null as any
  }
};

export const mixedSignalsExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'CTO', // +30
    use_case: 'vendor partnership discount', // -15
    budget_range: '100k', // +20
    timeline: 'urgent' // +15
  }
};

export const maxScoreExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'CEO and Founder', // +30
    budget_range: '500k', // +20
    timeline: 'urgent ASAP now', // +15
    org_name: 'Introduced by Microsoft, Fortune 500 enterprise', // +10 + 10
    use_case: 'AI strategy, machine learning, RAG implementation, personalization, growth' // +10
    // Total: 95 points
  }
};

export const minScoreExtract: ExtractT = {
  intent: 'advice_request', // -10
  entities: {
    use_case: 'student academic research dissertation thesis', // -10
    role: 'Intern',
    org_name: 'Agency Reseller Partnership Vendor' // -15
    // Total: -35, should floor at 0
  }
};

// Special character and injection tests
export const specialCharactersExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'VP of Engineering & CEO',
    budget_range: '100k',
    org_name: "O'Reilly & Associates, Inc.",
    use_case: 'AI/ML & RAG'
  }
};

export const longStringsExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'V'.repeat(1000) + 'P', // Very long string with VP at the end
    use_case: 'a'.repeat(10000), // Extremely long use case
    timeline: 'urgent'.repeat(100) // Repeated urgent
  }
};

// Multiple matching patterns
export const multipleRolesExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'VP of Engineering, CTO, and Chief Innovation Officer',
    use_case: 'AI strategy, machine learning, personalization, RAG, growth'
  }
};

// Case sensitivity tests
export const lowercaseExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'vp of engineering',
    budget_range: '100K',
    timeline: 'URGENT'
  }
};

export const mixedCaseExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Vp Of EnGiNeErInG',
    budget_range: '$100k',
    timeline: 'UrGeNt'
  }
};

// Boundary test cases
export const score69Extract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Director', // +30
    budget_range: '50k', // +20
    timeline: 'Q3', // +15 (should be checked if this triggers)
    use_case: 'basic implementation' // No bonus
    // Target: exactly 69 for boundary testing
  }
};

export const score70Extract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    role: 'Director', // +30
    budget_range: '50k', // +20
    timeline: 'next month', // +15
    use_case: 'machine learning' // +10
    // Target: exactly 70 for boundary testing
  }
};

// Test for all negative factors
export const allNegativeFactors: ExtractT = {
  intent: 'advice_request', // -10
  entities: {
    use_case: 'student academic research vendor partnership agency reseller cheap discount free', // Multiple negatives
    role: 'Student Intern',
    org_name: 'University Academic Research Center'
  }
};

// Test for warm intro variations
export const warmIntroVariations: ExtractT[] = [
  {
    intent: 'discovery_call',
    entities: { org_name: 'Introduced by Sarah' }
  },
  {
    intent: 'discovery_call',
    entities: { org_name: 'Referral from Microsoft' }
  },
  {
    intent: 'discovery_call',
    entities: { email: 'john@google.com' }
  },
  {
    intent: 'discovery_call',
    entities: { org_name: 'Recommendation from Apple team' }
  }
];

// Performance test fixture (complex extract)
export const complexExtract: ExtractT = {
  intent: 'discovery_call',
  entities: {
    visitor_name: 'John Smith',
    email: 'john.smith@techcorp.com',
    org_name: 'TechCorp International Fortune 500',
    role: 'Senior Vice President of Digital Transformation and Innovation',
    use_case: 'Implementing comprehensive AI strategy across multiple business units including customer service automation, predictive analytics for supply chain optimization, personalized recommendation systems for our e-commerce platform, and RAG-based knowledge management for our internal documentation',
    timeline: 'We need to start immediately, this is extremely urgent for Q1 2024',
    budget_range: '500k',
    additional_context: 'This is a strategic initiative approved by our board of directors'
  }
};