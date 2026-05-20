import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { catIcon, getGreeting, normaliseItem, extractCategoriesFromRaw } from '../src/utils/menu';

const root = path.resolve(__dirname, '..');

// ── File existence ────────────────────────────────────────────────────────
describe('MenuPage files', () => {
  it('src/utils/menu.ts exists', () => {
    expect(fs.existsSync(path.join(root, 'src/utils/menu.ts'))).toBe(true);
  });

  it('src/pages/MenuPage.tsx exists', () => {
    expect(fs.existsSync(path.join(root, 'src/pages/MenuPage.tsx'))).toBe(true);
  });
});

// ── catIcon ───────────────────────────────────────────────────────────────
describe('catIcon', () => {
  it('returns correct emoji for "appetizers"', () => {
    expect(catIcon('appetizers')).toBe('🥟');
  });

  it('returns correct emoji for "drinks"', () => {
    expect(catIcon('drinks')).toBe('🥤');
  });

  it('is case-insensitive', () => {
    expect(catIcon('Desserts')).toBe(catIcon('desserts'));
  });

  it('returns fallback 🍽️ for unknown categories', () => {
    expect(catIcon('unknown-category-xyz')).toBe('🍽️');
  });
});

// ── getGreeting ───────────────────────────────────────────────────────────
describe('getGreeting', () => {
  it('returns an object with greeting and sub fields', () => {
    const result = getGreeting();
    expect(result).toHaveProperty('greeting');
    expect(result).toHaveProperty('sub');
  });

  it('greeting and sub are non-empty strings', () => {
    const { greeting, sub } = getGreeting();
    expect(typeof greeting).toBe('string');
    expect(greeting.length).toBeGreaterThan(0);
    expect(typeof sub).toBe('string');
    expect(sub.length).toBeGreaterThan(0);
  });
});

// ── normaliseItem ─────────────────────────────────────────────────────────
describe('normaliseItem', () => {
  const raw = {
    menu_id: '42',
    menu_name: 'Jollof Rice',
    menu_description: 'West African classic',
    menu_price: '18.50',
    prep_time_minutes: '20',
    thumb: 'https://example.com/jollof.jpg',
    categories: [{ category_id: 7, name: 'Mains' }],
  };

  it('coerces string ids and prices to numbers', () => {
    const item = normaliseItem(raw);
    expect(item.menu_id).toBe(42);
    expect(item.menu_price).toBe(18.5);
    expect(item.prep_time_minutes).toBe(20);
  });

  it('extracts category_id from categories[0]', () => {
    const item = normaliseItem(raw);
    expect(item.category_id).toBe(7);
  });

  it('falls back images to [thumb] when images field is absent', () => {
    const item = normaliseItem(raw);
    expect(item.images).toEqual(['https://example.com/jollof.jpg']);
  });

  it('sets category_id to null when categories is absent', () => {
    const item = normaliseItem({ ...raw, categories: undefined });
    expect(item.category_id).toBeNull();
  });
});

// ── extractCategoriesFromRaw ──────────────────────────────────────────────
describe('extractCategoriesFromRaw', () => {
  const raw = [
    { categories: [{ category_id: 1, name: 'Mains' }] },
    { categories: [{ category_id: 2, name: 'Drinks' }] },
    { categories: [{ category_id: 1, name: 'Mains' }] },
  ] as Record<string, unknown>[];

  it('prepends { id: "all", name: "All" } as the first entry', () => {
    const cats = extractCategoriesFromRaw(raw);
    expect(cats[0]).toEqual({ id: 'all', name: 'All' });
  });

  it('deduplicates categories with the same category_id', () => {
    const cats = extractCategoriesFromRaw(raw);
    const ids = cats.map(c => c.id);
    expect(ids).toEqual([...new Set(ids)]);
  });

  it('returns an empty array when input is empty', () => {
    expect(extractCategoriesFromRaw([])).toEqual([]);
  });
});

// ── Mandated copy strings ─────────────────────────────────────────────────
describe('MenuPage copy', () => {
  const src = fs.readFileSync(path.join(root, 'src/pages/MenuPage.tsx'), 'utf-8');

  it('cart bar empty state reads "Tap anything to begin"', () => {
    expect(src).toContain('Tap anything to begin');
  });

  it('cart sheet CTA reads "Send to the kitchen →"', () => {
    expect(src).toContain('Send to the kitchen →');
  });
});
