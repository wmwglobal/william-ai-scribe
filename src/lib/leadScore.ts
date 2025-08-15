import type { ExtractT } from './types';

export function scoreLead(e: ExtractT): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let s = 0;
  const txt = `${e.entities.role ?? ''} ${e.entities.use_case ?? ''}`.toLowerCase();

  // Senior title bonus (+30 points)
  if (/vp|vice president|chief|head|director|founder|ceo|cto|cmo/i.test(txt)) { 
    s += 30; 
    reasons.push('senior_title'); 
  }
  
  // Budget indicators (+20 points)
  if (/\b(50k|100k|200k|500k|\$50,?000|\$100,?000|\$200,?000|\$500,?000)/i.test(e.entities.budget_range ?? '')) {
    s += 20; 
    reasons.push('budget_>=50k');
  }
  
  // Timeline urgency (+15 points)
  if (/(now|urgent|asap|6\s*weeks?|q[1-4]|quarter|this month|next month)/i.test(e.entities.timeline ?? '')) { 
    s += 15; 
    reasons.push('urgent_timeline'); 
  }
  
  // Warm intro indicators (+10 points)
  if (/(intro|introduction|referred|referral|recommendation|@(google|microsoft|apple|amazon|meta|netflix)\.com)/i.test(JSON.stringify(e.entities))) { 
    s += 10; 
    reasons.push('warm_intro'); 
  }
  
  // Strategic alignment with William's expertise (+10 points)
  if (/(rag|retrieval|personalization|content routing|ai strategy|machine learning|recommendation|search|discovery|growth|scale)/i.test(e.entities.use_case ?? '')) { 
    s += 10; 
    reasons.push('aligned_thesis'); 
  }
  
  // High-value company indicators (+10 points)
  if (/(enterprise|fortune|funded|series|ipo|billion|million users)/i.test(e.entities.org_name ?? '')) {
    s += 10;
    reasons.push('enterprise_client');
  }
  
  // Negative indicators - vendor/low-value
  if (/(agency|reseller|partnership|vendor|discount|cheap|free|student|academic)/i.test(e.entities.use_case ?? '')) { 
    s -= 15; 
    reasons.push('vendor_pitch'); 
  }
  
  // General interest (not immediate business)
  if (e.intent === 'supporter_fan' || e.intent === 'advice_request') { 
    s -= 10; 
    reasons.push('general_interest'); 
  }
  
  // Academic/research inquiries
  if (/(research|thesis|dissertation|university|academic|student)/i.test(e.entities.use_case ?? '')) {
    s -= 10;
    reasons.push('academic_inquiry');
  }

  // Ensure score stays within bounds
  s = Math.max(0, Math.min(100, s));
  
  return { score: s, reasons };
}

export function getLeadPriority(score: number): 'high' | 'medium' | 'low' {
  if (score >= 70) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

export function shouldNotifySlack(score: number, threshold: number = 70): boolean {
  return score >= threshold;
}

export function getScoreColor(score: number): string {
  if (score >= 70) return 'text-green-600';
  if (score >= 40) return 'text-yellow-600';
  return 'text-gray-500';
}

export function getScoreBadgeVariant(score: number): 'default' | 'secondary' | 'outline' {
  if (score >= 70) return 'default';
  if (score >= 40) return 'secondary';
  return 'outline';
}