import dotenv from 'dotenv';
import path from 'path';

// load from root .env
dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function test() {
  const url = process.env.LLM_API_URL!;
  const key = process.env.LLM_API_KEY!;
  const model = process.env.LLM_MODEL || 'gemini-3.6-flash';

  console.log(`URL: ${url}`);
  console.log(`Model: ${model}`);

  const messages = [
    { role: 'user', content: 'Say hello' }
  ];

  const body = JSON.stringify({
    model,
    messages
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`
    },
    body
  });

  console.log(`Status: ${response.status}`);
  const text = await response.text();
  console.log(`Body: ${text}`);
}

test().catch(console.error);
