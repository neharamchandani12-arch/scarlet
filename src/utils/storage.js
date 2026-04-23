const KEYS = {
  GOAL: 'scarlet_calorie_goal',
  MEALS: 'scarlet_meals',
  STREAK: 'scarlet_streak',
  LAST_DATE: 'scarlet_last_date',
  CHAT: 'scarlet_chat',
  PINNED: 'scarlet_pinned',
  RECIPES: 'scarlet_recipes',
  WEIGHT: 'scarlet_weight',
  THEME: 'scarlet_theme',
  VOLUME: 'scarlet_volume',
  PROTEIN_GOAL: 'scarlet_protein_goal',
  MICROPLASTICS: 'scarlet_microplastics',
};

const today = () => new Date().toISOString().split('T')[0];

// Dispatch update event so components re-render in real time
export function dispatchUpdate() {
  window.dispatchEvent(new CustomEvent('scarlet-update'));
}

export function getGoal() { return parseInt(localStorage.getItem(KEYS.GOAL) || '2000'); }
export function setGoal(v) { localStorage.setItem(KEYS.GOAL, v); dispatchUpdate(); }
export function getProteinGoal() { return parseInt(localStorage.getItem(KEYS.PROTEIN_GOAL) || '150'); }
export function setProteinGoal(v) { localStorage.setItem(KEYS.PROTEIN_GOAL, v); dispatchUpdate(); }

export function getMeals() {
  const raw = localStorage.getItem(KEYS.MEALS);
  if (!raw) return [];
  return JSON.parse(raw).filter(m => m.date === today());
}
export function getAllMeals() {
  const raw = localStorage.getItem(KEYS.MEALS);
  return raw ? JSON.parse(raw) : [];
}
export function addMeal(meal) {
  const all = getAllMeals();
  all.push({ ...meal, date: today(), id: Date.now() });
  localStorage.setItem(KEYS.MEALS, JSON.stringify(all));
  dispatchUpdate();
}
export function removeMeal(id) {
  const all = getAllMeals().filter(m => m.id !== id);
  localStorage.setItem(KEYS.MEALS, JSON.stringify(all));
  dispatchUpdate();
}

export function getCaloriesConsumed() {
  return getMeals().reduce((sum, m) => sum + (m.calories || 0), 0);
}
export function getProteinConsumed() {
  return getMeals().reduce((sum, m) => sum + (m.protein || 0), 0);
}
export function getCaloriesRemaining() {
  return getGoal() - getCaloriesConsumed();
}

export function getStreak() { return parseInt(localStorage.getItem(KEYS.STREAK) || '0'); }
export function updateStreak() {
  const last = localStorage.getItem(KEYS.LAST_DATE);
  const t = today();
  if (last === t) return;
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().split('T')[0];
  const streak = last === yStr ? getStreak() + 1 : 1;
  localStorage.setItem(KEYS.STREAK, streak);
  localStorage.setItem(KEYS.LAST_DATE, t);
}
export function checkAndUpdateStreak() {
  const goal = getGoal();
  const consumed = getCaloriesConsumed();
  if (consumed > 0 && consumed <= goal) updateStreak();
}

export function getChat() {
  const raw = localStorage.getItem(KEYS.CHAT);
  return raw ? JSON.parse(raw) : [];
}
export function saveChat(msgs) { localStorage.setItem(KEYS.CHAT, JSON.stringify(msgs.slice(-100))); }

export function getPinned() {
  const raw = localStorage.getItem(KEYS.PINNED);
  return raw ? JSON.parse(raw) : [];
}
export function addPinned(food) {
  const pinned = getPinned();
  if (pinned.find(p => p.name.toLowerCase() === food.name.toLowerCase())) return;
  pinned.push(food);
  localStorage.setItem(KEYS.PINNED, JSON.stringify(pinned));
}
export function removePinned(name) {
  const pinned = getPinned().filter(p => p.name !== name);
  localStorage.setItem(KEYS.PINNED, JSON.stringify(pinned));
  dispatchUpdate();
}

export function getRecipes() {
  const raw = localStorage.getItem(KEYS.RECIPES);
  return raw ? JSON.parse(raw) : [];
}
export function saveRecipe(recipe) {
  const recipes = getRecipes();
  const idx = recipes.findIndex(r => r.name.toLowerCase() === recipe.name.toLowerCase());
  if (idx >= 0) recipes[idx] = recipe;
  else recipes.push(recipe);
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
  dispatchUpdate();
}
export function deleteRecipe(name) {
  const recipes = getRecipes().filter(r => r.name !== name);
  localStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
  dispatchUpdate();
}

export function getWeightLog() {
  const raw = localStorage.getItem(KEYS.WEIGHT);
  return raw ? JSON.parse(raw) : [];
}
export function addWeight(kg) {
  const log = getWeightLog();
  const existing = log.findIndex(w => w.date === today());
  if (existing >= 0) log[existing].kg = kg;
  else log.push({ date: today(), kg });
  localStorage.setItem(KEYS.WEIGHT, JSON.stringify(log));
  dispatchUpdate();
}

export function getTheme() { return localStorage.getItem(KEYS.THEME) || 'rose'; }
export function setTheme(t) { localStorage.setItem(KEYS.THEME, t); }

export function getVolume() { return parseFloat(localStorage.getItem(KEYS.VOLUME) || '0.8'); }
export function setVolume(v) { localStorage.setItem(KEYS.VOLUME, v); }

export function getMicroplasticsToday() {
  const raw = localStorage.getItem(KEYS.MICROPLASTICS);
  if (!raw) return { total: 0, biggest: null };
  const all = JSON.parse(raw);
  const todayEntries = all.filter(e => e.date === today());
  if (!todayEntries.length) return { total: 0, biggest: null };
  const total = todayEntries.reduce((sum, e) => sum + e.particles, 0);
  const biggest = todayEntries.sort((a, b) => b.particles - a.particles)[0];
  return { total, biggest: biggest.food };
}
export function addMicroplastics(food, particles) {
  const raw = localStorage.getItem(KEYS.MICROPLASTICS);
  const all = raw ? JSON.parse(raw) : [];
  all.push({ date: today(), food, particles });
  localStorage.setItem(KEYS.MICROPLASTICS, JSON.stringify(all.slice(-500)));
}

export function getWeeklyMeals() {
  const all = getAllMeals();
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayMeals = all.filter(m => m.date === dateStr);
    days.push({ date: dateStr, calories: dayMeals.reduce((s, m) => s + (m.calories || 0), 0) });
  }
  return days;
}
