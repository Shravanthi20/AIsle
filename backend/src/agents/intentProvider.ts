export interface BuyerIntent {
  searchTerms: string[];
  minPrice?: number;
  maxPrice?: number;
  attributes: Record<string, string>;
  budgetFlexibility: number;
  confidence: number;
}

export interface IntentProvider {
  understand(message: string): Promise<BuyerIntent>;
}

export class RuleBasedIntentProvider implements IntentProvider {
  async understand(message: string): Promise<BuyerIntent> {
    const priceMatch = message.match(/(?:under|below|less than|up to|within|around|budget of|₹|rs\.?|inr)\s*([\d,]+)/i);
    const parsedPrice = priceMatch?.[1] ? Number(priceMatch[1].replaceAll(',', '')) : undefined;
    return {
      searchTerms: message.split(/\s+/).filter((term) => term.length > 2),
      minPrice: undefined,
      maxPrice: parsedPrice,
      attributes: {},
      budgetFlexibility: /\baround\b/i.test(message) ? 0.1 : 0,
      confidence: 0.45,
    };
  }
}

const intentCache = new Map<string, BuyerIntent>();

export class LlmIntentProvider implements IntentProvider {
  constructor(
    private readonly provider = process.env.LLM_PROVIDER ?? 'openai',
    private readonly endpoint = process.env.LLM_API_URL || (process.env.LLM_PROVIDER === 'ollama' ? `${process.env.OLLAMA_BASE_URL}/api/chat` : undefined),
    private readonly apiKey = process.env.LLM_API_KEY,
    private readonly model = process.env.LLM_MODEL ?? process.env.OLLAMA_MODEL ?? 'gpt-4o-mini',
    private readonly fallback: IntentProvider = new RuleBasedIntentProvider(),
  ) {}

  async understand(message: string): Promise<BuyerIntent> {
    if (!this.endpoint) return this.fallback.understand(message);
    if (this.provider !== 'ollama' && !this.apiKey) return this.fallback.understand(message);
    
    const cacheKey = message.trim().toLowerCase();
    if (intentCache.has(cacheKey)) {
      return intentCache.get(cacheKey)!;
    }
    try {
      const messages = [
        { role: 'system', content: 'Extract shopping intent as JSON only. Do not invent product facts. Return searchTerms:string[], minPrice:number|null, maxPrice:number|null, attributes:object, budgetFlexibility:number. Only explicit mandatory requirements belong in attributes or price limits. budgetFlexibility must be between 0 and 0.1.' },
        { role: 'user', content: message },
      ];
      
      let body;
      if (this.provider === 'ollama') {
        body = JSON.stringify({
          model: this.model,
          options: { temperature: 0 },
          format: 'json',
          stream: false,
          messages,
        });
      } else {
        body = JSON.stringify({
          model: this.model,
          temperature: 0,
          response_format: { type: 'json_object' },
          messages,
        });
      }

      let response;
      for (let attempt = 1; attempt <= 3; attempt++) {
        response = await fetch(this.endpoint, {
          method: 'POST',
          headers: { 
            'content-type': 'application/json', 
            ...(this.apiKey ? { authorization: `Bearer ${this.apiKey}` } : {})
          },
          body,
          signal: AbortSignal.timeout(10000), // Increased timeout for local LLMs
        });
        if (response.status === 429 && attempt < 3) {
          console.warn(`Intent LLM 429 Rate Limit. Retrying attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 3000));
          continue;
        }
        if (!response.ok) throw new Error(`Intent provider returned ${response.status}`);
        break;
      }
      if (!response) throw new Error('Intent provider failed to initialize request');
      const payload = await response.json() as any;
      const content = this.provider === 'ollama' 
        ? payload.message?.content 
        : payload.choices?.[0]?.message?.content;
      if (!content) throw new Error('Intent provider returned no content');
      const cleanContent = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanContent) as Partial<BuyerIntent>;
      const validated = this.validate(parsed, message);
      intentCache.set(cacheKey, validated);
      if (intentCache.size > 1000) {
        const firstKey = intentCache.keys().next().value;
        if (firstKey) intentCache.delete(firstKey);
      }
      return validated;
    } catch (error) {
      console.error('LLM Intent Extraction failed:', error);
      return this.fallback.understand(message);
    }
  }

  private validate(value: Partial<BuyerIntent>, original: string): BuyerIntent {
    const numberValue = (candidate: unknown): number | undefined => typeof candidate === 'number' && Number.isFinite(candidate) && candidate >= 0 ? candidate : undefined;
    const attributes = value.attributes && typeof value.attributes === 'object' && !Array.isArray(value.attributes)
      ? Object.fromEntries(Object.entries(value.attributes).filter(([, item]) => typeof item === 'string')) as Record<string, string>
      : {};

    return {
      searchTerms: Array.isArray(value.searchTerms) ? value.searchTerms.filter((item): item is string => typeof item === 'string').slice(0, 20) : original.split(/\s+/).filter((term) => term.length > 2),
      minPrice: numberValue(value.minPrice),
      maxPrice: numberValue(value.maxPrice),
      attributes,
      budgetFlexibility: Math.min(0.1, Math.max(0, numberValue(value.budgetFlexibility) ?? 0)),
      confidence: 0.8,
    };
  }
}