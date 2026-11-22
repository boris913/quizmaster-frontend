// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { GET } from '../route';

describe('GET /api/health', () => {
  it('répond 200 avec { status: "ok" } et sans cache', async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe('no-store');
    await expect(res.json()).resolves.toEqual({ status: 'ok' });
  });
});
