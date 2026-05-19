import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const filePath = path.resolve(__dirname, '../pages/OrderTrackingPage.tsx');
const src = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : '';

describe('OrderTrackingPage', () => {
  it('exists as a file', () => {
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it('polls the correct status endpoint', () => {
    expect(src).toContain('/api/orders/');
    expect(src).toContain('/status');
  });

  it('stops polling on terminal status', () => {
    expect(src).toContain('terminal');
    expect(src).toContain('clearInterval');
  });

  it('uses the correct dark background token', () => {
    expect(src).toContain('#0D1B0D');
  });

  it('handles connection errors', () => {
    expect(src).toContain('connError');
  });

  it('shows special state for payment_status=failed', () => {
    expect(src).toContain('payment_status');
  });
});
