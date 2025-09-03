import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  scoreLead, 
  getLeadPriority, 
  shouldNotifySlack,
  getScoreColor,
  getScoreBadgeVariant 
} from './leadScore';
import type { ExtractT } from './types';
import * as fixtures from '@/test/fixtures/lead-extracts';

describe('scoreLead', () => {
  describe('scoring criteria', () => {
    describe('senior title bonus (+30 points)', () => {
      it.each([
        ['VP of Engineering', 'VP'],
        ['Vice President', 'vice president'],
        ['Chief Technology Officer', 'chief'],
        ['Head of Product', 'head'],
        ['Director of Sales', 'director'],
        ['Founder', 'founder'],
        ['CEO', 'ceo'],
        ['CTO', 'cto'],
        ['CMO', 'cmo']
      ])('should add 30 points for %s', (role, pattern) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { role }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(30);
        expect(reasons).toContain('senior_title');
      });

      it('should detect senior titles in use_case field', () => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { 
            role: 'Manager',
            use_case: 'As VP of Engineering, I need AI solutions'
          }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(30);
        expect(reasons).toContain('senior_title');
      });

      it('should handle case insensitive matching', () => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { role: 'vp of engineering' }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(30);
        expect(reasons).toContain('senior_title');
      });
    });

    describe('budget indicators (+20 points)', () => {
      it.each([
        '50k',
        '100k',
        '200k',
        '500k'
      ])('should add 20 points for budget: %s', (budget_range) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { budget_range }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(20);
        expect(reasons).toContain('budget_>=50k');
      });

      it('should not add points for low budget', () => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { budget_range: '$25,000' }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).not.toContain('budget_>=50k');
      });
    });

    describe('timeline urgency (+15 points)', () => {
      it.each([
        ['now'],
        ['urgent'],
        ['asap'],
        ['ASAP'],
        ['6 weeks'],
        ['Q1'],
        ['Q2'],
        ['Q3'],
        ['Q4'],
        ['quarter'],
        ['this month'],
        ['next month']
      ])('should add 15 points for timeline: %s', (timeline) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { timeline }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(15);
        expect(reasons).toContain('urgent_timeline');
      });

      it('should not add points for non-urgent timeline', () => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { timeline: 'next year' }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).not.toContain('urgent_timeline');
      });
    });

    describe('warm introduction (+10 points)', () => {
      it.each([
        ['Introduced by John'],
        ['Introduction from Sarah'],
        ['Referred by Mike'],
        ['Referral from company'],
        ['Recommendation from team'],
        ['john@google.com'],
        ['sarah@microsoft.com'],
        ['mike@apple.com'],
        ['user@amazon.com'],
        ['contact@meta.com'],
        ['person@netflix.com']
      ])('should add 10 points for warm intro: %s', (value) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: value.includes('@') ? { email: value } : { org_name: value }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(10);
        expect(reasons).toContain('warm_intro');
      });
    });

    describe('strategic alignment (+10 points)', () => {
      it.each([
        ['RAG implementation'],
        ['retrieval augmented generation'],
        ['personalization system'],
        ['content routing'],
        ['AI strategy'],
        ['machine learning'],
        ['recommendation engine'],
        ['search optimization'],
        ['discovery platform'],
        ['growth initiatives'],
        ['scale operations']
      ])('should add 10 points for aligned use case: %s', (use_case) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { use_case }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(10);
        expect(reasons).toContain('aligned_thesis');
      });
    });

    describe('enterprise client (+10 points)', () => {
      it.each([
        ['Enterprise Corp'],
        ['Fortune 500 Company'],
        ['Funded Startup'],
        ['Series B Company'],
        ['IPO Ready'],
        ['Billion Dollar Company'],
        ['10 million users platform']
      ])('should add 10 points for enterprise: %s', (org_name) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { org_name }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(score).toBeGreaterThanOrEqual(10);
        expect(reasons).toContain('enterprise_client');
      });
    });

    describe('negative indicators', () => {
      it('should subtract 15 points for vendor pitch', () => {
        const extract: ExtractT = {
          intent: 'partnership_inquiry',
          entities: { use_case: 'agency partnership' }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).toContain('vendor_pitch');
      });

      it('should subtract 10 points for general interest', () => {
        const extract: ExtractT = {
          intent: 'supporter_fan',
          entities: {}
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).toContain('general_interest');
      });

      it('should subtract 10 points for academic inquiry', () => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { use_case: 'university research thesis' }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).toContain('academic_inquiry');
      });

      it.each([
        ['agency services'],
        ['reseller partnership'],
        ['partnership opportunity'],
        ['vendor solutions'],
        ['discount pricing'],
        ['cheap alternative'],
        ['free trial']
      ])('should detect vendor keywords: %s', (use_case) => {
        const extract: ExtractT = {
          intent: 'discovery_call',
          entities: { use_case }
        };
        
        const { score, reasons } = scoreLead(extract);
        
        expect(reasons).toContain('vendor_pitch');
      });
    });
  });

  describe('score bounds', () => {
    it('should never exceed 100', () => {
      const { score } = scoreLead(fixtures.maxScoreExtract);
      
      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThan(70); // Should still be high
    });

    it('should never go below 0', () => {
      const { score } = scoreLead(fixtures.minScoreExtract);
      
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should handle all negative factors', () => {
      const { score } = scoreLead(fixtures.allNegativeFactors);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThan(40);
    });
  });

  describe('reason tracking', () => {
    it('should include all applicable reasons', () => {
      const { reasons } = scoreLead(fixtures.highValueLead);
      
      expect(reasons).toContain('senior_title');
      expect(reasons).toContain('budget_>=50k');
      expect(reasons).toContain('urgent_timeline');
      expect(reasons).toContain('aligned_thesis');
      expect(reasons).toContain('enterprise_client');
    });

    it('should not duplicate reasons', () => {
      const extract: ExtractT = {
        intent: 'discovery_call',
        entities: {
          role: 'VP and VP', // Repeated VP
          use_case: 'VP needs' // VP in use_case too
        }
      };
      
      const { reasons } = scoreLead(extract);
      const seniorTitleCount = reasons.filter(r => r === 'senior_title').length;
      
      expect(seniorTitleCount).toBe(1);
    });

    it('should track negative reasons', () => {
      const { reasons } = scoreLead(fixtures.vendorPitch);
      
      expect(reasons).toContain('vendor_pitch');
    });
  });

  describe('edge cases', () => {
    it('should handle empty entities gracefully', () => {
      const { score, reasons } = scoreLead(fixtures.emptyExtract);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Array.isArray(reasons)).toBe(true);
    });

    it('should handle null and undefined values', () => {
      const { score, reasons } = scoreLead(fixtures.nullValuesExtract);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(Array.isArray(reasons)).toBe(true);
    });

    it('should handle special characters', () => {
      const { score } = scoreLead(fixtures.specialCharactersExtract);
      
      expect(score).toBeGreaterThanOrEqual(30); // Should still detect VP
    });

    it('should handle very long strings without crashing', () => {
      const { score } = scoreLead(fixtures.longStringsExtract);
      
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should handle mixed positive and negative signals', () => {
      const { score, reasons } = scoreLead(fixtures.mixedSignalsExtract);
      
      // CTO (+30) + budget (+20) + urgent (+15) - vendor (-15) = 50
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);
      expect(reasons).toContain('senior_title');
      expect(reasons).toContain('vendor_pitch');
    });
  });

  describe('real-world scenarios', () => {
    it('should identify high-value leads correctly', () => {
      const { score } = scoreLead(fixtures.highValueLead);
      expect(score).toBeGreaterThanOrEqual(70);
      
      const { score: score2 } = scoreLead(fixtures.ceoWithUrgentNeed);
      expect(score2).toBeGreaterThanOrEqual(70);
      
      const { score: score3 } = scoreLead(fixtures.warmIntroHighBudget);
      expect(score3).toBeGreaterThanOrEqual(70);
    });

    it('should identify medium-value leads correctly', () => {
      const { score } = scoreLead(fixtures.mediumValueLead);
      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThan(70);
      
      const { score: score2 } = scoreLead(fixtures.managerWithTimeline);
      expect(score2).toBeLessThan(70);
    });

    it('should identify low-value leads correctly', () => {
      const { score } = scoreLead(fixtures.lowValueLead);
      expect(score).toBeLessThan(40);
      
      const { score: score2 } = scoreLead(fixtures.vendorPitch);
      expect(score2).toBeLessThan(40);
      
      const { score: score3 } = scoreLead(fixtures.generalInterestLead);
      expect(score3).toBeLessThan(40);
    });
  });

  describe('fixture validation', () => {
    it('should handle all warm intro variations', () => {
      fixtures.warmIntroVariations.forEach(extract => {
        const { reasons } = scoreLead(extract);
        expect(reasons).toContain('warm_intro');
      });
    });

    it('should handle mixed case correctly', () => {
      const { score: lowercase } = scoreLead(fixtures.lowercaseExtract);
      const { score: mixedcase } = scoreLead(fixtures.mixedCaseExtract);
      
      expect(lowercase).toBeGreaterThanOrEqual(30); // Should detect vp
      expect(mixedcase).toBeGreaterThanOrEqual(30); // Should detect Vp
    });
  });
});

describe('getLeadPriority', () => {
  it('should return high priority for scores >= 70', () => {
    expect(getLeadPriority(70)).toBe('high');
    expect(getLeadPriority(85)).toBe('high');
    expect(getLeadPriority(100)).toBe('high');
  });

  it('should return medium priority for scores 40-69', () => {
    expect(getLeadPriority(40)).toBe('medium');
    expect(getLeadPriority(55)).toBe('medium');
    expect(getLeadPriority(69)).toBe('medium');
  });

  it('should return low priority for scores < 40', () => {
    expect(getLeadPriority(0)).toBe('low');
    expect(getLeadPriority(20)).toBe('low');
    expect(getLeadPriority(39)).toBe('low');
  });

  it('should handle boundary values correctly', () => {
    expect(getLeadPriority(39.9)).toBe('low');
    expect(getLeadPriority(40.0)).toBe('medium');
    expect(getLeadPriority(69.9)).toBe('medium');
    expect(getLeadPriority(70.0)).toBe('high');
  });

  it('should handle negative scores', () => {
    expect(getLeadPriority(-10)).toBe('low');
  });

  it('should handle scores above 100', () => {
    expect(getLeadPriority(150)).toBe('high');
  });
});

describe('shouldNotifySlack', () => {
  it('should return true for high-value leads with default threshold', () => {
    expect(shouldNotifySlack(70)).toBe(true);
    expect(shouldNotifySlack(85)).toBe(true);
    expect(shouldNotifySlack(100)).toBe(true);
  });

  it('should return false for low-value leads with default threshold', () => {
    expect(shouldNotifySlack(69)).toBe(false);
    expect(shouldNotifySlack(50)).toBe(false);
    expect(shouldNotifySlack(0)).toBe(false);
  });

  it('should respect custom threshold', () => {
    expect(shouldNotifySlack(50, 50)).toBe(true);
    expect(shouldNotifySlack(49, 50)).toBe(false);
    expect(shouldNotifySlack(30, 25)).toBe(true);
    expect(shouldNotifySlack(24, 25)).toBe(false);
  });

  it('should handle boundary values with custom threshold', () => {
    expect(shouldNotifySlack(60, 60)).toBe(true);
    expect(shouldNotifySlack(59.9, 60)).toBe(false);
  });

  it('should handle zero threshold', () => {
    expect(shouldNotifySlack(0, 0)).toBe(true);
    expect(shouldNotifySlack(-1, 0)).toBe(false);
  });
});

describe('getScoreColor', () => {
  it('should return green for high scores', () => {
    expect(getScoreColor(70)).toBe('text-green-600');
    expect(getScoreColor(85)).toBe('text-green-600');
    expect(getScoreColor(100)).toBe('text-green-600');
  });

  it('should return yellow for medium scores', () => {
    expect(getScoreColor(40)).toBe('text-yellow-600');
    expect(getScoreColor(55)).toBe('text-yellow-600');
    expect(getScoreColor(69)).toBe('text-yellow-600');
  });

  it('should return gray for low scores', () => {
    expect(getScoreColor(0)).toBe('text-gray-500');
    expect(getScoreColor(20)).toBe('text-gray-500');
    expect(getScoreColor(39)).toBe('text-gray-500');
  });

  it('should handle boundary values', () => {
    expect(getScoreColor(39.9)).toBe('text-gray-500');
    expect(getScoreColor(40.0)).toBe('text-yellow-600');
    expect(getScoreColor(69.9)).toBe('text-yellow-600');
    expect(getScoreColor(70.0)).toBe('text-green-600');
  });
});

describe('getScoreBadgeVariant', () => {
  it('should return default for high scores', () => {
    expect(getScoreBadgeVariant(70)).toBe('default');
    expect(getScoreBadgeVariant(85)).toBe('default');
    expect(getScoreBadgeVariant(100)).toBe('default');
  });

  it('should return secondary for medium scores', () => {
    expect(getScoreBadgeVariant(40)).toBe('secondary');
    expect(getScoreBadgeVariant(55)).toBe('secondary');
    expect(getScoreBadgeVariant(69)).toBe('secondary');
  });

  it('should return outline for low scores', () => {
    expect(getScoreBadgeVariant(0)).toBe('outline');
    expect(getScoreBadgeVariant(20)).toBe('outline');
    expect(getScoreBadgeVariant(39)).toBe('outline');
  });

  it('should handle boundary values', () => {
    expect(getScoreBadgeVariant(39.9)).toBe('outline');
    expect(getScoreBadgeVariant(40.0)).toBe('secondary');
    expect(getScoreBadgeVariant(69.9)).toBe('secondary');
    expect(getScoreBadgeVariant(70.0)).toBe('default');
  });
});

// Performance tests
describe('performance', () => {
  it('should score simple extract quickly', () => {
    const startTime = performance.now();
    scoreLead({
      intent: 'discovery_call',
      entities: { role: 'VP' }
    });
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  it('should score complex extract quickly', () => {
    const startTime = performance.now();
    scoreLead(fixtures.complexExtract);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  it('should handle long strings efficiently', () => {
    const startTime = performance.now();
    scoreLead(fixtures.longStringsExtract);
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(10); // Should complete in under 10ms
  });

  it('should batch score 100 extracts efficiently', () => {
    const startTime = performance.now();
    for (let i = 0; i < 100; i++) {
      scoreLead(fixtures.highValueLead);
    }
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(100); // 100 scores in under 100ms
  });
});