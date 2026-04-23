import Groq from 'groq-sdk';
import { getGoal, getProteinGoal, getCaloriesConsumed, getProteinConsumed, getCaloriesRemaining, getMeals, saveRecipe, deleteRecipe } from '../utils/storage';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const SYSTEM_PROMPT = `You are Scarlet — a warm, witty, flirty AI who happens to be excellent at nutrition and health. You're like a brilliant friend who knows everything about food, fitness, and life. You're direct but never cold. You have opinions, you tease a little, you care genuinely.

Personality:
- Warm and playful first, informative second
- You can talk about anything — relationships, fitness, life advice, pop culture, whatever comes up
- When topics are about food or calories, you lead with the number then add personality
- Never robotic. Never list-heavy unless specifically asked
- Light flirty energy — earned compliments, gentle teasing
- 1-3 sentences max unless they ask for detail
- No filler phrases: no "Great question!", "Of course!", "Certainly!", "Absolutely!"

Calorie tracking (when relevant):
When you identify food from description or image, respond ONLY with this JSON — nothing else:
{"type":"food","name":"Food Name","calories":000,"protein":00,"notes":"one brief punchy comment"}

For saving a recipe: {"type":"save_recipe","name":"Recipe Name","calories":000,"protein":00}
For deleting a recipe: {"type":"delete_recipe","name":"Recipe Name"}

Restaurant knowledge: You know approximate calories for most restaurants and cuisines. Give confident estimates with a brief range (e.g. "around 650-800 kcal"). Always mention protein if you know it.

For all non-food responses: reply as normal warm conversational text — no JSON.`;

function buildContext() {
  const remaining = getCaloriesRemaining();
  const consumed = getCaloriesConsumed();
  const goal = getGoal();
  const protein = getProteinConsumed();
  const proteinGoal = getProteinGoal();
  const meals = getMeals().map(m => m.name).join(', ') || 'nothing yet';
  return `[Today: ${consumed}/${goal} kcal eaten, ${remaining} remaining, ${protein}/${proteinGoal}g protein, meals: ${meals}]`;
}

export async function askScarlet(messages, onChunk) {
  const context = buildContext();
  const systemWithContext = SYSTEM_PROMPT + '\n\n' + context;

  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemWithContext },
      ...messages,
    ],
    max_tokens: 400,
    stream: true,
    temperature: 0.85,
  });

  let full = '';
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    full += delta;
    onChunk(delta, full);
  }
  return full;
}

export async function analyzeImage(base64Image, prompt = 'What food is this? Give me calories and protein.') {
  const response = await client.chat.completions.create({
    model: 'llama-3.2-90b-vision-preview',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + buildContext() },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: 'text', text: prompt },
        ],
      },
    ],
    max_tokens: 300,
  });
  return response.choices[0].message.content;
}

export async function analyzeBodyPhoto(base64Image) {
  const response = await client.chat.completions.create({
    model: 'llama-3.2-90b-vision-preview',
    messages: [
      { role: 'system', content: 'You are Scarlet — warm, honest, direct. Give a 2-3 sentence honest assessment of visible body composition. Be real but kind. No excessive praise, no harshness.' },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: 'text', text: 'Honest assessment of my progress.' },
        ],
      },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content;
}

export function parseFoodResponse(text) {
  try {
    const trimmed = text.trim();
    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.type === 'food') return { isFoodData: true, ...parsed };
      if (parsed.type === 'save_recipe') return { isRecipeAction: 'save', ...parsed };
      if (parsed.type === 'delete_recipe') return { isRecipeAction: 'delete', ...parsed };
    }
    // Also try to find JSON embedded in text
    const jsonMatch = text.match(/\{[^{}]*"type"\s*:\s*"(?:food|save_recipe|delete_recipe)"[^{}]*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (parsed.type === 'food') return { isFoodData: true, ...parsed };
      if (parsed.type === 'save_recipe') return { isRecipeAction: 'save', ...parsed };
      if (parsed.type === 'delete_recipe') return { isRecipeAction: 'delete', ...parsed };
    }
  } catch {}
  return { isFoodData: false, text };
}

export function estimateMicroplastics(foodName) {
  const name = foodName.toLowerCase();
  if (name.includes('water bottle') || name.includes('plastic')) return 150;
  if (name.includes('seafood') || name.includes('fish') || name.includes('shrimp')) return 100;
  if (name.includes('salt') || name.includes('sea salt')) return 80;
  if (name.includes('packaged') || name.includes('processed') || name.includes('chips')) return 60;
  if (name.includes('canned')) return 50;
  if (name.includes('tea') || name.includes('coffee')) return 30;
  if (name.includes('fruit') || name.includes('vegetable') || name.includes('salad')) return 5;
  return 20;
}
