import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');

describe('apps/qr scaffold', () => {
  const requiredFiles = [
    'index.html',
    'package.json',
    'tsconfig.json',
    'vite.config.ts',
    'src/main.tsx',
    'src/App.tsx',
    'src/index.css',
    'src/types/index.ts',
    'src/utils/haptics.ts',
    'src/contexts/CartContext.tsx',
    'src/contexts/SessionContext.tsx',
    'src/pages/ScanPage.tsx',
    'src/pages/MenuPage.tsx',
    'src/pages/CheckoutPage.tsx',
    'src/pages/OrderTrackingPage.tsx',
  ];

  requiredFiles.forEach(file => {
    it(`${file} exists`, () => {
      expect(fs.existsSync(path.join(root, file))).toBe(true);
    });
  });

  it('CartContext uses cd_qr_cart_v1 storage key (not cd_cart_v1)', () => {
    const src = fs.readFileSync(path.join(root, 'src/contexts/CartContext.tsx'), 'utf-8');
    expect(src).toContain('cd_qr_cart_v1');
    expect(src).not.toContain("'cd_cart_v1'");
  });

  it('SessionContext uses cd_qr_session_v1 storage key', () => {
    const src = fs.readFileSync(path.join(root, 'src/contexts/SessionContext.tsx'), 'utf-8');
    expect(src).toContain('cd_qr_session_v1');
  });

  it('ScanPage posts to the correct session endpoint', () => {
    const src = fs.readFileSync(path.join(root, 'src/pages/ScanPage.tsx'), 'utf-8');
    expect(src).toContain('/api/table-sessions/by-table/');
  });

  it('App routes all four pages', () => {
    const src = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf-8');
    expect(src).toContain('/table/:stableToken');
    expect(src).toContain('/menu');
    expect(src).toContain('/checkout');
    expect(src).toContain('/track');
  });
});
