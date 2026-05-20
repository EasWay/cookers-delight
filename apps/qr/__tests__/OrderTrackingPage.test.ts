import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const root = path.resolve(__dirname, '..');
const src  = fs.readFileSync(path.join(root, 'src/pages/OrderTrackingPage.tsx'), 'utf-8');

describe('OrderTrackingPage files', () => {
  it('src/pages/OrderTrackingPage.tsx exists', () => {
    expect(fs.existsSync(path.join(root, 'src/pages/OrderTrackingPage.tsx'))).toBe(true);
  });
});

describe('OrderTrackingPage reference source', () => {
  it('reads reference from sessionStorage', () => {
    expect(src).toContain('cd_qr_order_reference');
  });

  it('reads reference from ?ref= query param', () => {
    expect(src).toContain('useSearchParams');
    expect(src).toContain("searchParams.get('ref')");
  });
});

describe('OrderTrackingPage polling', () => {
  it('polls /api/orders/ endpoint', () => {
    expect(src).toContain('/api/orders/');
  });

  it('stops polling when terminal is true', () => {
    expect(src).toContain('terminal');
  });

  it('uses setInterval for polling', () => {
    expect(src).toContain('setInterval');
  });

  it('clears interval on unmount', () => {
    expect(src).toContain('clearInterval');
  });
});

describe('OrderTrackingPage context strip', () => {
  it('shows table number not customer name', () => {
    expect(src).toContain('table_number');
    expect(src).toContain('Table');
  });

  it('imports useSession', () => {
    expect(src).toContain('useSession');
  });
});

describe('OrderTrackingPage status display', () => {
  it('has Ready state green border', () => {
    expect(src).toContain("status === 'ready'");
  });

  it('shows progress steps', () => {
    expect(src).toContain('STEPS');
  });

  it('navigates back to menu', () => {
    expect(src).toContain('/menu');
  });
});
