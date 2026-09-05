import type { MerchantAnalytics, ProductPerformance } from '../types/merchantAnalytics.js';
import type { Product } from '../models/product.js';
import type { CampaignDraftInput } from '../types/campaign.js';

export interface MerchantAgentLlmResponse {
  answer: string;
  suggestedActions: string[];
  relevantProductIds: string[];
  campaignDraft?: CampaignDraftInput;
}

const merchantCache = new Map<string, MerchantAgentLlmResponse>();

export class MerchantAgentLlm {
  constructor(
    private readonly provider = process.env.LLM_PROVIDER ?? 'openai',
    private readonly endpoint = process.env.LLM_API_URL || (process.env.LLM_PROVIDER === 'ollama' ? `${process.env.OLLAMA_BASE_URL}/api/chat` : undefined),
    private readonly apiKey = process.env.LLM_API_KEY,
    private readonly model = process.env.LLM_MODEL ?? process.env.OLLAMA_MODEL ?? 'gpt-4o-mini',
  ) {}

  async orchestrate(message: string, analytics: MerchantAnalytics, catalog: Product[], performance: ProductPerformance[]): Promise<MerchantAgentLlmResponse> {
    if (!this.endpoint || (this.provider !== 'ollama' && !this.apiKey)) {
      throw new Error('LLM is not configured properly for Merchant Agent');
    }

    const cacheKey = message.trim().toLowerCase();
    if (merchantCache.has(cacheKey)) {
      return merchantCache.get(cacheKey)!;
    }

    const systemPrompt = `You are a Merchant AI Assistant acting as a Campaign Orchestrator. 
Your goal is to analyze the merchant's store data and respond to their query.
If they ask to increase sales, design a campaign (cross-sell, upsell, or reengage).
You must respond with valid JSON ONLY matching this structure:
{
  "answer": "A detailed explanation of your analysis and proposed campaign design (Target, Product, Offer, Message, Guardrails).",
  "suggestedActions": ["Actionable steps like 'Draft a 10% discount campaign'"],
  "relevantProductIds": ["uuid-of-product-1"],
  "campaignDraft": {
    "name": "Campaign Name",
    "objective": "CROSS_SELL" | "UPSELL" | "REENGAGE",
    "productIds": ["uuid-of-target-product"],
    "audience": {},
    "content": { "offer": "10% off", "message": "Campaign copy" }
  }
}
Note: "campaignDraft" is optional and should only be included if a campaign makes sense for the query.

Store Analytics:
Total Orders: ${analytics.totalOrders}
Revenue: ${analytics.revenue} ${analytics.currency ?? ''}

Catalog (Available products):
${catalog.slice(0, 50).map(p => `- ${p.name} (ID: ${p.id}, Price: ${p.price}, Stock: ${p.stock})`).join('\n')}

Performance (Top items):
${performance.slice(0, 10).map(p => `- ID: ${p.productId}, Units Sold: ${p.unitsSold}, Revenue: ${p.revenue}`).join('\n')}
`;

    try {
      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message }
      ];

      let body;
      if (this.provider === 'ollama') {
        body = JSON.stringify({
          model: this.model,
          options: { temperature: 0.2 },
          format: 'json',
          stream: false,
          messages,
        });
      } else {
        body = JSON.stringify({
          model: this.model,
          temperature: 0.2,
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
          signal: AbortSignal.timeout(15000),
        });
        if (response.status === 429 && attempt < 3) {
          console.warn(`Merchant LLM 429 Rate Limit. Retrying attempt ${attempt + 1}...`);
          await new Promise(resolve => setTimeout(resolve, attempt * 3000));
          continue;
        }
        if (!response.ok) throw new Error(`Merchant LLM returned ${response.status}`);
        break;
      }
      
      if (!response) throw new Error('Merchant LLM failed to initialize request');
      const payload = await response.json() as any;
      const content = this.provider === 'ollama' 
        ? payload.message?.content 
        : payload.choices?.[0]?.message?.content;
        
      if (!content) throw new Error('Merchant LLM returned no content');
      
      const cleanContent = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleanContent) as Partial<MerchantAgentLlmResponse>;
      
      const result = {
        answer: parsed.answer || 'I could not generate a proper response.',
        suggestedActions: parsed.suggestedActions || [],
        relevantProductIds: parsed.relevantProductIds || [],
        campaignDraft: parsed.campaignDraft as CampaignDraftInput | undefined
      };
      
      merchantCache.set(cacheKey, result);
      return result;
    } catch (error) {
      console.error('Merchant LLM failed:', error);
      throw new Error('I could not analyze your request right now. Please check LLM configuration.');
    }
  }
}
