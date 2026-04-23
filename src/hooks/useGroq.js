import Groq from 'groq-sdk';
import { getGoal, getProteinGoal, getCaloriesConsumed, getProteinConsumed, getCaloriesRemaining, getMeals } from '../utils/storage';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const SYSTEM_PROMPT = `You are Scarlet — a sharp, warm, brilliant AI with knowledge across everything: nutrition, fitness, science, medicine, pop culture, relationships, travel, cooking, current events, history, and any other topic. You are NOT limited to nutrition. You know everything a well-read, curious person knows.

Personality:
- Warm and playful. Direct without being cold. Light flirtiness, earned compliments.
- Talk about anything the user wants — you're a brilliant conversationalist, not just a diet tracker
- When it comes to food/calories, you lead with numbers then add personality
- 1-3 sentences max unless detail is requested
- Zero filler: no "Great question!", "Of course!", "Certainly!"
- NEVER echo the user's message back in your response
- NEVER put any text before a JSON response — output JSON directly with no leading sentence

MICROPLASTICS (answer confidently when asked — this IS your expertise):
Approximate microplastic particles per serving: Bottled water 200-300/L. Seafood/shellfish 100-200/100g. Fish (farmed) 80-150/100g. Sea salt 50-100/tsp. Beer 50-100/bottle. Honey 40-80/serving. Canned food 40-80/serving. Ultra-processed/packaged food 30-60/serving. Tea (plastic teabag) 10,000+/cup. Chicken 10-20/100g. Beef/meat 5-15/100g. Rice/pasta/bread 5-10/serving. Coffee 20-30/cup. Fresh fruit/veg 3-8/serving. Eggs 2-5/egg. Home-cooked whole food 2-5/serving.
Give ranges, name the biggest contributor, and be matter-of-fact about it.

━━━ FOOD TRACKING (CRITICAL — read carefully) ━━━

TWO SEPARATE ACTIONS — never confuse them:

ACTION 1 — LOG TO GOALS (when user says "log this", "add to my goals", "track this", "log it"):
Output ONLY this JSON — no other text:
Single item: {"type":"food","name":"Food Name","calories":000,"protein":00,"notes":"brief comment"}
Multiple items: {"type":"meal","name":"Meal name","items":[{"name":"Rice","grams":100,"calories":130,"protein":3}],"calories":460,"protein":65,"notes":"comment"}

ACTION 2 — SAVE AS RECIPE (when user says "save as recipe", "make this a recipe", "save this recipe"):
Output ONLY this JSON — no other text:
{"type":"save_recipe","name":"Recipe Name","calories":000,"protein":00}
Recipes appear as tap-to-log buttons above the chat. They do NOT immediately log to goals.

ACTION 3 — DELETE A RECIPE (when user says "delete recipe", "remove [name] recipe"):
{"type":"delete_recipe","name":"Recipe Name"}

Restaurant/food estimates: Give confident calorie ranges for any restaurant or cuisine. Always include protein estimate.

For ALL other responses: plain conversational text only — no JSON whatsoever.`;

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
  const stream = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT + '\n\n' + buildContext() },
      ...messages,
    ],
    max_tokens: 500,
    stream: true,
    temperature: 0.75,
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
      { role: 'system', content: 'You are Scarlet — warm, honest, direct. 2-3 sentences. Honest assessment of visible body composition. Real but kind.' },
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
  if (!text) return { isFoodData: false, text };
  try {
    const trimmed = text.trim();
    const start = trimmed.indexOf('{');
    if (start !== -1) {
      let depth = 0, end = -1;
      for (let i = start; i < trimmed.length; i++) {
        if (trimmed[i] === '{') depth++;
        else if (trimmed[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end !== -1) {
        const parsed = JSON.parse(trimmed.slice(start, end + 1));
        if (parsed.type === 'food') return { isFoodData: true, ...parsed };
        if (parsed.type === 'meal') return { isMealData: true, ...parsed };
        if (parsed.type === 'save_recipe') return { isRecipeAction: 'save', ...parsed };
        if (parsed.type === 'delete_recipe') return { isRecipeAction: 'delete', ...parsed };
      }
    }
  } catch {}
  return { isFoodData: false, text };
}

export function getStreamDisplayText(full) {
  const trimmed = full.trim();
  if (trimmed.startsWith('{') || (trimmed.includes('"type"') && trimmed.includes('{'))) return null;
  return trimmed;
}

export function estimateMicroplastics(foodName) {
  const name = foodName.toLowerCase();
  if (name.includes('seafood') || name.includes('shellfish') || name.includes('shrimp') || name.includes('prawn')) return 150;
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return 100;
  if (name.includes('bottled water') || name.includes('water bottle')) return 250;
  if (name.includes('salt')) return 75;
  if (name.includes('beer')) return 75;
  if (name.includes('honey')) return 60;
  if (name.includes('canned') || name.includes('tin')) return 60;
  if (name.includes('packaged') || name.includes('processed') || name.includes('chips')) return 50;
  if (name.includes('tea')) return 35;
  if (name.includes('coffee')) return 25;
  if (name.includes('chicken')) return 15;
  if (name.includes('beef') || name.includes('meat') || name.includes('lamb')) return 10;
  if (name.includes('rice') || name.includes('pasta') || name.includes('bread')) return 8;
  if (name.includes('fruit') || name.includes('vegetable') || name.includes('salad') || name.includes('apple') || name.includes('banana')) return 5;
  if (name.includes('egg')) return 4;
  return 20;
}
