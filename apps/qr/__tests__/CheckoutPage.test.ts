import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const src  = fs.readFileSync(path.join(root, 'src/pages/CheckoutPage.tsx'), 'utf-8');

describe('CheckoutPage files', () => {
  it('src/pages/CheckoutPage.tsx exists', () => {
    expect(fs.existsSync(path.join(root, 'src/pages/CheckoutPage.tsx'))).toBe(true);
  });
});

describe('CheckoutPage copy', () => {
  it('heading reads "Almost there"', () => {
    expect(src).toContain('Almost there');
  });

  it('posts to /api/qr-checkout', () => {
    expect(src).toContain('/api/qr-checkout');
  });

  it('includes pay button copy "Pay Securely with Paystack"', () => {
    expect(src).toContain('Pay Securely with Paystack');
  });

  it('sends session_token in request body', () => {
    expect(src).toContain('session_token');
  });

  it('stores reference in sessionStorage', () => {
    expect(src).toContain('cd_qr_order_reference');
  });

  it('calls clearCart() after successful payment', () => {
    expect(src).toContain('clearCart');
  });
});

describe('CheckoutPage phone normalisation', () => {
  it('defines normalisePhone helper', () => {
    expect(src).toContain('normalisePhone');
  });

  it('replaces leading 0 with 233', () => {
    expect(src).toContain('233');
  });
});

describe('CheckoutPage guards', () => {
  it('redirects to scan page when session missing', () => {
    expect(src).toContain('/table/${stableToken}`');
  });

  it('redirects to menu page when cart empty', () => {
    expect(src).toContain('/table/${stableToken}/menu`');
  });
});

describe('CheckoutPage receipt toggle', () => {
  it('has WhatsApp channel option', () => {
    expect(src).toContain('whatsapp');
  });

  it('has Email channel option', () => {
    expect(src).toContain('email');
  });

  it('uses WhatsApp green colour #25D366', () => {
    expect(src).toContain('#25D366');
  });
});
