import type { ShoppingIntent } from '../types/commerceIntelligence.js';

export class ShoppingIntentService {
  parse(query: string): ShoppingIntent {
    const text = query.trim();
    const lower = text.toLowerCase();
    const budgetMatch = lower.match(/(?:under|below|less than|up to|within|around|budget of|₹|rs\.?|inr)\s*([\d,]+)/i);
    const budget = budgetMatch?.[1] ? Number(budgetMatch[1].replaceAll(',', '')) : undefined;
    const budgetFlexibility = /around|better|premium|upgrade|best|slightly more|stretch/i.test(text) ? 0.1 : 0;
    const mandatoryRequirements = [...new Set((text.match(/\b(?:must|need|requires?)\s+([a-z0-9 -]+)/gi) ?? []).map((item) => item.replace(/^\w+\s+/i, '').trim()))];
    const preferredRequirements = [...new Set((text.match(/\b(?:prefer|preferably|ideally|want)\s+([a-z0-9 -]+)/gi) ?? []).map((item) => item.replace(/^\w+\s+/i, '').trim()))];
    const useCases = [...new Set((lower.match(/\b(?:for|used for)\s+([a-z0-9 -]+?)(?=\s+(?:around|under|below|up to|within|prefer|preferably|ideally)|,|$)/gi) ?? []).map((item) => item.replace(/^(?:for|used for)\s+/i, '').trim()))];
    return { query: text, budget, budgetFlexibility, mandatoryRequirements, preferredRequirements, useCases, confidence: text.length > 8 ? 0.8 : 0.45 };
  }
}
