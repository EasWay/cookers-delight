import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../pages/CheckoutPage.tsx');
const src = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

describe('CheckoutPage', () => {
  it('exists as a file', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('posts to /api/checkout', () => {
    expect(src).toContain('/api/checkout');
  });

  it('uses server-side price — does not send price in cart payload', () => {
    // Cart items sent to server must only have id and quantity — never price
    const cartPayloadSection = src.match(/cart\.map\([^)]+\)/s)?.[0] ?? src;
    expect(cartPayloadSection).not.toContain('menu_price');
  });

  it('contains the correct CTA copy', () => {
    expect(src).toContain('Confirm —');
  });

  it('contains the trust signal copy', () => {
    expect(src).toContain('Secure payment via Paystack');
  });

  it('handles payment error with correct copy', () => {
    expect(src).toContain("wasn't charged");
  });
});
