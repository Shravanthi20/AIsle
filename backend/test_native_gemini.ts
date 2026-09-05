import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function test() {
  const key = process.env.LLM_API_KEY!;
  const model = process.env.LLM_MODEL || 'gemini-1.5-flash';
  
  // Use native Gemini endpoint instead of OpenAI compat
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: "Respond in JSON: {\"hello\":\"world\"}" }]
      }
    ],
    generationConfig: {
      responseMimeType: "application/json"
    }
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body
  });

  console.log(`Status: ${response.status}`);
  const text = await response.text();
  console.log(`Body: ${text}`);
}

test().catch(console.error);
