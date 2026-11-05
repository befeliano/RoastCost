import { describe, expect, it, vi } from 'vitest';

vi.mock('./kv', () => ({
  kv: { storage: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() } },
}));

const { persistOptions } = await import('./persist');

describe('persisted preferences survive app updates', () => {
  it('carries an older version over unchanged', () => {
    const o = persistOptions<{ palette: string }>('theme_v1');
    expect(o.version).toBeGreaterThan(0);
    expect(o.migrate({ palette: 'bordo' })).toEqual({ palette: 'bordo' });
  });
  it('repairs bad values instead of dropping everything', () => {
    const o = persistOptions<{ monthlyKg: number; recipeId: string }>('cost', (s) => ({
      ...s,
      monthlyKg: typeof s.monthlyKg === 'number' && s.monthlyKg > 0 ? s.monthlyKg : 5,
    }));
    expect(o.migrate({ monthlyKg: -1, recipeId: 'r1' })).toEqual({ monthlyKg: 5, recipeId: 'r1' });
  });
  it('tolerates garbage', () => {
    expect(persistOptions('x').migrate(null)).toEqual({});
  });
});
