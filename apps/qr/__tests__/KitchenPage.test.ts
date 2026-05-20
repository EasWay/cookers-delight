import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('KitchenLoginPage', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/pages/KitchenLoginPage.tsx'), 'utf-8');
  it('exists', () => expect(fs.existsSync(path.resolve(__dirname, '../src/pages/KitchenLoginPage.tsx'))).toBe(true));
  it('verifies PIN via /api/kitchen/verify-pin', () => expect(src).toContain('/api/kitchen/verify-pin'));
  it('stores PIN in cd_kitchen_pin', () => expect(src).toContain('cd_kitchen_pin'));
  it('navigates to /kitchen/display on success', () => expect(src).toContain('/kitchen/display'));
});

describe('KitchenPage', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../src/pages/KitchenPage.tsx'), 'utf-8');
  it('exists', () => expect(fs.existsSync(path.resolve(__dirname, '../src/pages/KitchenPage.tsx'))).toBe(true));
  it('polls /api/kitchen/orders', () => expect(src).toContain('/api/kitchen/orders'));
  it('sends X-Kitchen-Pin header', () => expect(src).toContain('X-Kitchen-Pin'));
  it('separates dine-in from collection orders', () => {
    expect(src).toContain('order_type');
    expect(src).toContain('collection');
  });
  it('shows correct new order alert copy', () => expect(src).toContain('New Order!'));
  it('uses GHS for prices — not GH₵', () => {
    expect(src).toContain('GHS');
    expect(src).not.toContain('GH₵');
  });
  it('clears cd_kitchen_pin on logout', () => {
    expect(src).toContain('removeItem');
    expect(src).toContain('cd_kitchen_pin');
  });
  it('polls every 5 seconds', () => expect(src).toContain('5000'));
});
