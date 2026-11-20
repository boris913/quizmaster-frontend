import { describe, expect, it } from 'vitest';
import { JOIN_ERROR_MESSAGES, NICKNAME_PATTERN, getJoinErrorMessage } from '@/lib/nickname';

const httpError = (status: number, data?: unknown) => ({ response: { status, data } });

describe('NICKNAME_PATTERN (aligné sur JoinSessionDto)', () => {
  it.each(['Alice', 'Alice_42', 'Jean-Luc', 'Éléonore', 'Loutre Curieuse', 'Ours Brun Calme', 'Zoé'])(
    'accepte « %s »',
    (pseudo) => expect(NICKNAME_PATTERN.test(pseudo)).toBe(true)
  );

  it.each([' Alice', 'Alice ', 'Loutre  Curieuse', 'Alice!', 'a.b', 'Bob\tDylan'])('refuse « %s »', (pseudo) =>
    expect(NICKNAME_PATTERN.test(pseudo)).toBe(false)
  );
});

describe('getJoinErrorMessage', () => {
  it('403 : message dédié au participant exclu, quel que soit le message serveur', () => {
    expect(getJoinErrorMessage(httpError(403, { message: 'Forbidden' }))).toBe(JOIN_ERROR_MESSAGES.kicked);
  });

  it('400 : message du serveur (pseudo refusé)', () => {
    const message = "Ce pseudo n'est pas autorisé. Merci d'en choisir un autre.";
    expect(getJoinErrorMessage(httpError(400, { message }))).toBe(message);
  });

  it('400 : messages de validation en tableau', () => {
    expect(
      getJoinErrorMessage(httpError(400, { message: ['Le pseudo doit faire au moins 3 caractères'] }))
    ).toBe('Le pseudo doit faire au moins 3 caractères');
  });

  it('400 sans message : message par défaut', () => {
    expect(getJoinErrorMessage(httpError(400))).toBe(JOIN_ERROR_MESSAGES.invalidNickname);
  });

  it('404 / 409 : message du serveur, sinon message par défaut', () => {
    expect(getJoinErrorMessage(httpError(404, { message: 'Session introuvable' }))).toBe('Session introuvable');
    expect(getJoinErrorMessage(httpError(404))).toBe(JOIN_ERROR_MESSAGES.notFound);
    expect(getJoinErrorMessage(httpError(409))).toBe(JOIN_ERROR_MESSAGES.nicknameTaken);
  });

  it('erreur réseau (pas de réponse)', () => {
    expect(getJoinErrorMessage(new Error('Network Error'))).toBe(JOIN_ERROR_MESSAGES.network);
  });
});
