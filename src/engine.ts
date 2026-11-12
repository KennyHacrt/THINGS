export type Scenario = 'recipes' | 'tabs' | 'plan';
export type Step = { label: string; target: string; action: 'open' | 'filter' | 'select' | 'save' };
export type Plan = { scenario: Scenario; title: string; steps: Step[] };

export const suggestions = [
  { scenario: 'recipes' as const, title: 'Find dinner inspiration', prompt: 'Find three vegetarian dinners under 30 minutes', icon: 'utensils', detail: 'A little less scrolling. A little more cooking.' },
  { scenario: 'tabs' as const, title: 'Tidy my open tabs', prompt: 'Organize my open tabs into useful groups', icon: 'layers', detail: 'Give that beautiful chaos a little order.' },
  { scenario: 'plan' as const, title: 'Make room to focus', prompt: 'Plan a focused afternoon with breaks', icon: 'sun', detail: 'A small plan for the things that matter.' },
];

/** Explicit demo intent router, not an LLM. Unmatched instructions never start an unrelated task. */
export function createPlan(prompt: string): Plan | null {
  const p = prompt.toLowerCase();
  if (/recipe|dinner|vegetarian|cooking|晚餐|食譜/.test(p)) return {
    scenario: 'recipes', title: 'Three little dinner discoveries', steps: [
      {label: 'Open the recipe collection', target: 'workspace-open', action: 'open'},
      {label: 'Filter vegetarian meals under 30 minutes', target: 'workspace-filter', action: 'filter'},
      {label: 'Pick three recipes for tonight', target: 'workspace-select', action: 'select'},
      {label: 'Save your dinner shortlist', target: 'workspace-save', action: 'save'},
    ],
  };
  if (/tab|organize|tidy|分頁|整理/.test(p)) return {
    scenario: 'tabs', title: 'A little order, restored', steps: [
      {label: 'Open the sample tab collection', target: 'workspace-open', action: 'open'},
      {label: 'Sort by research, inspiration and tools', target: 'workspace-filter', action: 'filter'},
      {label: 'Group all six sample tabs', target: 'workspace-select', action: 'select'},
      {label: 'Save your organized collection', target: 'workspace-save', action: 'save'},
    ],
  };
  if (/plan|focus|afternoon|break|專注|計劃/.test(p)) return {
    scenario: 'plan', title: 'Your afternoon, with breathing room', steps: [
      {label: 'Open the afternoon planner', target: 'workspace-open', action: 'open'},
      {label: 'Add focus blocks and short breaks', target: 'workspace-filter', action: 'filter'},
      {label: 'Check your three-hour schedule', target: 'workspace-select', action: 'select'},
      {label: 'Save the plan for later', target: 'workspace-save', action: 'save'},
    ],
  };
  return null;
}

export const recipes = [
  {id: 'lemon', name: 'Lemon & pea pasta', time: 20, vegetarian: true, color: 'green', emoji: '🥬', note: 'Bright, creamy, one happy pot.'},
  {id: 'salmon', name: 'Miso glazed salmon', time: 25, vegetarian: false, color: 'peach', emoji: '🍣', note: 'Sweet miso, ginger and rice.'},
  {id: 'bowl', name: 'Crispy chickpea bowl', time: 25, vegetarian: true, color: 'peach', emoji: '🥗', note: 'Crunchy things. A tahini drizzle.'},
  {id: 'risotto', name: 'Slow mushroom risotto', time: 50, vegetarian: true, color: 'cream', emoji: '🍄', note: 'A little patience, a lot of comfort.'},
  {id: 'toast', name: 'Tomato & ricotta toast', time: 15, vegetarian: true, color: 'rose', emoji: '🍅', note: 'Juicy tomatoes. A very good toast.'},
];

export function dinnerShortlist() { return recipes.filter(r => r.vegetarian && r.time < 30).slice(0, 3); }

export type SavedTask = { id: string; title: string; scenario: Scenario; prompt: string; completedAt: string };
export function readHistory(raw: string | null): SavedTask[] {
  try {
    const parsed: unknown = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((v): v is SavedTask => !!v && typeof v === 'object' && typeof v.id === 'string' && typeof v.title === 'string' && typeof v.prompt === 'string' && typeof v.completedAt === 'string' && ['recipes', 'tabs', 'plan'].includes(v.scenario)).slice(0, 30);
  } catch { return []; }
}
