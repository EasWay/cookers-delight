import { describe, it, expect } from 'vitest';
import { BRANCHES } from '../pages/BookingsPage';

describe('BookingsPage — BRANCHES constant', () => {
  it('contains exactly one branch', () => {
    expect(BRANCHES).toHaveLength(1);
  });

  it('has name Kaneshie and address containing Cocoa Clinic', () => {
    expect(BRANCHES[0].name).toBe('Kaneshie');
    expect(BRANCHES[0].address).toContain('Cocoa Clinic');
  });

  it('does not contain any fabricated legacy locations', () => {
    const names = BRANCHES.map(b => b.name);
    expect(names).not.toContain('Adenta Command');
    expect(names).not.toContain('Madina Zongo Junction');
    expect(names).not.toContain('Ashiyie');
    expect(names).not.toContain('Haatso');
  });
});
