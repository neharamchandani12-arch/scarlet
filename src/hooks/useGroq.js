import Groq from 'groq-sdk';
import { getGoal, getProteinGoal, getCaloriesConsumed, getProteinConsumed, getCaloriesRemaining, getMeals, saveRecipe, deleteRecipe } from '../utils/storage';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const SYSTEM_PROMPT = `You are Scarlet — a warm, witty, flirty AI who's excellent at nutrition and health. You're like a brilliant friend. Direct but never cold. Light flirty energy, earned compliments, gentle teasing. 1-3 sentences unless asked for detail. No filler phrases ever.

Personality rules:
- Talk about anything — food, fitness, life, whatever
- Lead with the number on food questions, add personality after
- NEVER mention microplastics unless the user specifically asks
- NEVER echo back the user's message in your response
- NEVER add any preamble before JSON — output JSON directly with no leading text

MICROPLASTICS KNOWLEDGE (only share when asked):
You know approximate microplastic particle estimates per 100g or serving:
Seafood/shellfish: 100-200 particles. Fish (farmed): 80-150. Sea salt: 50-100/tsp. Bottled water: 200-300/liter. Tap water: 10-20/liter. Beer: 50-100/bottle. Honey: 40-80. Canned food: 40-80/serving. Packaged/ultra-processed food: 30-60/serving. Chicken (conventional): 10-20. Beef: 5-15. Rice: 5-10. Fresh fruit/veg: 3-8. Homemade whole food: 2-5. Eggs: 2-5.
Give ranges confidently, note the biggest contributors in their diet if asked.

FOOD TRACKING — output rules (CRITICAL: output JSON only, no other text):

Single food or when asked about one food:
{"type":"food","name":"Food Name","calories":000,"protein":00,"notes":"one punchy comment"}

Multiple foods with quantities (e.g. "100g rice, 200g chicken"):
{"type":"meal","name":"Short meal name","items":[{"name":"Rice","grams":100,"calories":130,"protein":3},{"name":"Chicken","grams":200,"calories":330,"protein":62}],"calories":460,"protein":65,"notes":"brief comment"}

Save a recipe: {"type":"save_recipe","name":"Recipe Name","calories":000,"protein":00}
Delete a recipe: {"type":"delete_recipe","name":"Recipe Name"}

For ALL other responses (not food logging): plain conversational text only — absolutely no JSON.`;

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
      {
        role: 'system',
        content: 'You are Scarlet — warm, honest, direct. 2-3 sentences. Honest assessment of visible body composition. Real but kind. No fluff.',
      },
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
    // Find JSON object — try from start first, then search
    const start = trimmed.indexOf('{');
    if (start !== -1) {
      // Try to parse from first { to matching }
      let depth = 0, end = -1;
      for (let i = start; i < trimmed.length; i++) {
        if (trimmed[i] === '{') depth++;
        else if (trimmed[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
      }
      if (end !== -1) {
        const jsonStr = trimmed.slice(start, end + 1);
        const parsed = JSON.parse(jsonStr);
        if (parsed.type === 'food') return { isFoodData: true, ...parsed };
        if (parsed.type === 'meal') return { isMealData: true, ...parsed };
        if (parsed.type === 'save_recipe') return { isRecipeAction: 'save', ...parsed };
        if (parsed.type === 'delete_recipe') return { isRecipeAction: 'delete', ...parsed };
      }
    }
  } catch {}
  return { isFoodData: false, text };
}

// Strip any preamble text before JSON during streaming
export function getStreamDisplayText(full) {
  const trimmed = full.trim();
  // If the response is building toward JSON, show nothing until we have a complete displayable text
  if (trimmed.startsWith('{') || trimmed.includes('"type"')) return null; // hide partial JSON
  return trimmed;
}

export function estimateMicroplastics(foodName) {
  const name = foodName.toLowerCase();
  if (name.includes('seafood') || name.includes('shellfish') || name.includes('shrimp') || name.includes('prawn')) return 150;
  if (name.includes('fish') || name.includes('salmon') || name.includes('tuna')) return 100;
  if (name.includes('water bottle') || name.includes('bottled water')) return 250;
  if (name.includes('salt') || name.includes('sea salt')) return 75;
  if (name.includes('beer') || name.includes('lager')) return 75;
  if (name.includes('honey')) return 60;
  if (name.includes('canned') || name.includes('tin')) return 60;
  if (name.includes('packaged') || name.includes('processed') || name.includes('chips') || name.includes('biscuit')) return 50;
  if (name.includes('chicken')) return 15;
  if (name.includes('beef') || name.includes('meat')) return 10;
  if (name.includes('rice') || name.includes('pasta') || name.includes('bread')) return 8;
  if (name.includes('tea') || name.includes('coffee')) return 30;
  if (name.includes('fruit') || name.includes('vegetable') || name.includes('salad') || name.includes('apple') || name.includes('banana')) return 5;
  if (name.includes('egg')) return 4;
  return 20;
}
