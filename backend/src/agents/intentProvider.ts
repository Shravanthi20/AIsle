export interface BuyerIntent {
  maxPrice?: number;
  attributes: Record<string, string>;
}

export interface IntentProvider {
  understand(message: string): BuyerIntent;
}

export class RuleBasedIntentProvider implements IntentProvider {
  understand(message: string): BuyerIntent {
    const priceMatch = message.match(/(?:under|below|less than|up to|within)\s*(?:₹|rs\.?|inr\s*)?([\d,]+)/i);
    const attributes: Record<string, string> = {};
    const color = message.match(/\b(black|white|blue|red|green|grey|gray|brown|pink|yellow)\b/i)?.[1];
    const size = message.match(/\bsize\s*([a-z0-9]+)\b/i)?.[1];
    if (color) attributes.color = color;
    if (size) attributes.size = size;
    return { maxPrice: priceMatch ? Number(priceMatch[1]?.replaceAll(',', '')) : undefined, attributes };
  }
}