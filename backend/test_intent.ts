import { RecommendationService } from './src/services/recommendationService.js';
import { LlmIntentProvider } from './src/agents/intentProvider.js';
import dotenv from 'dotenv';
dotenv.config();
async function test() {
  const intentProvider = new LlmIntentProvider();
  const service = new RecommendationService();
  try {
    const intent = await intentProvider.understand('i want to buy a black saree that is below 4200');
    console.log('--- INTENT ---');
    console.log(JSON.stringify(intent, null, 2));
    const result = await service.recommend({ query: 'i want to buy a black saree that is below 4200' });
    console.log('--- RESULT ---');
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error);
  }
}

test();
