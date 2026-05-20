import type { QRMenuItem, QRCategory } from '../types';

const CAT_ICONS: Record<string, string> = {
  'all': '📋', 'all items': '📋',
  'appetizer': '🥟', 'appetizers': '🥟',
  'main course': '🍛', 'main courses': '🍛', 'main': '🍛', 'mains': '🍛',
  'seafood': '🦐', 'seafoods': '🦐',
  'salad': '🥗', 'salads': '🥗',
  'traditional': '🍲',
  'specials': '⭐', 'special': '⭐',
  "chef's choice": '👨‍🍳', "chef's picks": '👨‍🍳',
  'drinks': '🥤', 'beverages': '🥤',
  'dessert': '🍮', 'desserts': '🍮',
  'soup': '🍜', 'soups': '🍜',
  'snacks': '🥨',
  'grill': '🍖', 'grills': '🍖',
  'rice': '🍚',
};

export function catIcon(name: string): string {
  return CAT_ICONS[name.toLowerCase()] ?? '🍽️';
}

export function getGreeting(): { greeting: string; sub: string } {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { greeting: 'Good morning ☀️',  sub: 'Something warm to start your day?' };
  if (h >= 12 && h < 17) return { greeting: 'Good afternoon 🌿', sub: "What's calling to you today?" };
  if (h >= 17 && h < 22) return { greeting: 'Good evening 🌙',   sub: 'Tonight, eat something worth remembering' };
  return                         { greeting: 'Still here? 🌟',    sub: "Hungry late — we've got you" };
}

export function normaliseItem(raw: Record<string, unknown>): QRMenuItem {
  const thumb = raw.thumb as string | undefined;
  return {
    menu_id:           Number(raw.menu_id),
    menu_name:         String(raw.menu_name ?? ''),
    menu_description:  String(raw.menu_description ?? ''),
    menu_price:        Number(raw.menu_price ?? 0),
    prep_time_minutes: Number(raw.prep_time_minutes ?? 15),
    thumb,
    images:            Array.isArray(raw.images) && raw.images.length
                         ? raw.images as string[]
                         : thumb ? [thumb] : [],
    category_id:       (raw.categories as { category_id: number }[])?.[0]?.category_id ?? null,
    ingredients:       Array.isArray(raw.ingredients) ? raw.ingredients as string[] : [],
    calories:          raw.calories != null ? Number(raw.calories) : null,
  };
}

export function extractCategoriesFromRaw(raw: Record<string, unknown>[]): QRCategory[] {
  const seen = new Map<string, string>();
  raw.forEach(item => {
    const cats = item.categories as { category_id: number; name: string }[] | undefined;
    if (cats?.[0]) {
      seen.set(String(cats[0].category_id), cats[0].name);
    }
  });
  if (!seen.size) return [];
  return [
    { id: 'all', name: 'All' },
    ...Array.from(seen.entries()).map(([id, name]) => ({ id, name })),
  ];
}
