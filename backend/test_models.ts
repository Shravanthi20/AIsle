import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '../.env') });

async function test() {
  const key = process.env.LLM_API_KEY!;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  
  const response = await fetch(url);
  console.log(`Status: ${response.status}`);
  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

test().catch(console.error);
