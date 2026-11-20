import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildJoinUrl, getAppBaseUrl, normalizeSessionCode } from '@/lib/sessionCode';

describe('normalizeSessionCode', () => {
  it('trim, retire tous les espaces et met en majuscules (comme le backend)', () => {
    expect(normalizeSessionCode(' k7m 2p9 ')).toBe('K7M2P9');
    expect(normalizeSessionCode('\tk7m\n2p9')).toBe('K7M2P9');
    expect(normalizeSessionCode('ab\u00a0cd')).toBe('ABCD');
  });

  it('renvoie une chaîne vide pour une valeur non textuelle', () => {
    expect(normalizeSessionCode(undefined)).toBe('');
    expect(normalizeSessionCode(null)).toBe('');
  });
});

describe('buildJoinUrl / getAppBaseUrl', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('utilise NEXT_PUBLIC_APP_URL sans slash final', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://quiz.example.fr/');
    expect(getAppBaseUrl()).toBe('https://quiz.example.fr');
    expect(buildJoinUrl('k7m2p9')).toBe('https://quiz.example.fr/player/join?code=K7M2P9');
  });

  it("se rabat sur l'origine du navigateur", () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
    expect(getAppBaseUrl()).toBe(window.location.origin);
  });

  it('accepte une base explicite', () => {
    expect(buildJoinUrl('abc 123', 'http://10.0.0.2:3000')).toBe(
      'http://10.0.0.2:3000/player/join?code=ABC123'
    );
  });
});
