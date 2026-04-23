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

━━━ NUTRITION ACCURACY (CRITICAL) ━━━
You MUST use accurate, research-backed nutritional values. Do NOT hallucinate protein or calorie numbers.
Most plant foods and grain-based foods have LOW protein. Most vegetables have near-zero protein.

VERIFIED INDIAN FOOD VALUES (per standard serving — memorise these exactly):
Dosa plain (1 medium, 120g): 165 kcal, 3g protein
Masala dosa (1 piece, 200g): 230 kcal, 5g protein
Idli (2 pieces, 100g): 76 kcal, 2g protein
Vada (1 piece, 60g): 165 kcal, 4g protein
Sambar (1 cup, 240ml): 80 kcal, 4g protein
Coconut chutney (2 tbsp): 60 kcal, 1g protein
Rice cooked plain (1 cup, 200g): 260 kcal, 5g protein
Roti/chapati (1 piece, 40g): 105 kcal, 3g protein
Naan (1 piece, 90g): 260 kcal, 8g protein
Paratha (1 piece, 80g): 200 kcal, 4g protein
Aloo paratha (1 piece, 120g): 270 kcal, 5g protein
Dal makhani (1 cup, 240ml): 220 kcal, 10g protein
Dal tadka (1 cup, 240ml): 170 kcal, 9g protein
Rajma (1 cup, 240ml): 210 kcal, 12g protein
Chole (1 cup, 240ml): 200 kcal, 10g protein
Paneer (100g raw): 265 kcal, 18g protein
Paneer butter masala (1 cup, 200ml): 350 kcal, 16g protein
Palak paneer (1 cup): 300 kcal, 14g protein
Chicken curry (150g with gravy): 275 kcal, 28g protein
Butter chicken (1 cup, 200ml): 380 kcal, 32g protein
Biryani chicken (1 plate, 350g): 520 kcal, 30g protein
Biryani veg (1 plate, 300g): 420 kcal, 9g protein
Egg (1 large, boiled): 78 kcal, 6g protein
Omelette (2 eggs): 185 kcal, 12g protein
Upma (1 cup, 200g): 200 kcal, 5g protein
Poha (1 cup, 200g): 200 kcal, 4g protein
Puri (2 pieces, 60g): 200 kcal, 4g protein
Bhaji/sabzi mixed veg (1 cup): 120 kcal, 3g protein
Kadai paneer (1 cup): 320 kcal, 15g protein
Pav bhaji (1 plate): 380 kcal, 8g protein
Vada pav (1 piece): 290 kcal, 6g protein
Misal pav (1 plate): 380 kcal, 12g protein
Curd/dahi (100g): 60 kcal, 3g protein
Lassi plain (1 glass, 250ml): 180 kcal, 6g protein
Masala chai (1 cup with milk): 60 kcal, 2g protein

VERIFIED COMMON FOODS:
Banana (1 medium, 120g): 105 kcal, 1g protein
Apple (1 medium, 180g): 95 kcal, 0g protein
Rice white cooked (100g): 130 kcal, 2.7g protein
Oats cooked (1 cup, 240g): 150 kcal, 5g protein
Whole milk (1 cup, 240ml): 149 kcal, 8g protein
Greek yogurt (150g): 100 kcal, 17g protein
Chicken breast cooked (100g): 165 kcal, 31g protein
Salmon (100g): 208 kcal, 20g protein
Whey protein (1 scoop, 30g): 120 kcal, 24g protein
Almonds (30g): 174 kcal, 6g protein
Peanut butter (2 tbsp, 32g): 190 kcal, 8g protein
Lentils cooked (1 cup): 230 kcal, 18g protein
Quinoa cooked (1 cup): 222 kcal, 8g protein

RULES for nutrition:
- NEVER round protein UP — round down or give exact value
- If unsure, give a RANGE (e.g., "2-4g protein")
- Grains and most vegetables are LOW protein (1-5g per serving max)
- Only meat, fish, eggs, dairy, legumes, and protein powders are high protein

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

Restaurant/food estimates: Use the verified values above when available. For unlisted foods, research-based accurate estimates only.

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
