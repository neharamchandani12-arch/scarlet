import Groq from 'groq-sdk';
import { getGoal, getProteinGoal, getCaloriesConsumed, getProteinConsumed, getCaloriesRemaining, getMeals, getRecipes, saveRecipe, deleteRecipe } from '../utils/storage';

const client = new Groq({ apiKey: import.meta.env.VITE_GROQ_API_KEY, dangerouslyAllowBrowser: true });

const SYSTEM_PROMPT = `You are Scarlet — a sharp, flirty, direct AI calorie coach. Zero filler. No "Great question!", no "Of course!", no "Sure!". Lead with the answer, fast. When asked about food, always lead with calories first, then protein, then anything else. Keep responses under 3 sentences unless absolutely necessary. Compliments feel earned. Roasts are playful, never mean.

When you identify food from an image or description, always respond in this exact JSON format if it's a food query:
{"type":"food","name":"Food Name","calories":000,"protein":00,"notes":"brief note"}

For saving a recipe, respond with:
{"type":"save_recipe","name":"Recipe Name","calories":000,"protein":00}

For deleting a recipe, respond with:
{"type":"delete_recipe","name":"Recipe Name"}

For all other responses, just reply as normal text — no JSON.`;

function buildContext() {
  const remaining = getCaloriesRemaining();
  const consumed = getCaloriesConsumed();
  const goal = getGoal();
  const protein = getProteinConsumed();
  const proteinGoal = getProteinGoal();
  const meals = getMeals().map(m => m.name).join(', ') || 'nothing yet';
  return `[Context: ${consumed}/${goal} kcal consumed, ${remaining} remaining, ${protein}/${proteinGoal}g protein, today's meals: ${meals}]`;
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
    max_tokens: 300,
    stream: true,
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
      { role: 'system', content: 'You are Scarlet — direct, honest, encouraging but real. Give a brief honest assessment of visible body composition and progress. No fluff, no excessive compliments. 2-3 sentences max.' },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}` } },
          { type: 'text', text: 'Give me an honest assessment of my body composition and visible progress.' },
        ],
      },
    ],
    max_tokens: 200,
  });
  return response.choices[0].message.content;
}

export function parseFoodResponse(text) {
  try {
    const jsonMatch = text.match(/\{[^}]+\}/s);
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
