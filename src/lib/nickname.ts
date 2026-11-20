/**
 * Pseudos des participants : validation locale, propositions du serveur (mode « généré ») et
 * messages d'erreur du join. Contrat : boris913/quizmaster-backend#5 (livré par le backend #18).
 */
import api from '@/lib/api';

export type NicknameMode = 'free' | 'generated';

export const NICKNAME_MIN_LENGTH = 3;
export const NICKNAME_MAX_LENGTH = 50;

/**
 * Même règle que `JoinSessionDto.pseudo` côté backend : lettres (accents compris), chiffres,
 * tirets, underscores, et espaces simples entre les mots (« Loutre Curieuse »).
 * Construite via `RegExp` : le littéral avec `\p{…}` et le drapeau `u` n'est pas accepté par
 * TypeScript avec la cible `es5` du projet.
 */
export const NICKNAME_PATTERN = new RegExp('^[\\p{L}\\p{N}_-]+(?: [\\p{L}\\p{N}_-]+)*$', 'u');

export const NICKNAME_PATTERN_MESSAGE =
  'Lettres, chiffres, - et _ uniquement, avec un seul espace entre les mots';

/** Nombre maximum de tirages de la roulette en mode « pseudos générés ». */
export const MAX_NICKNAME_DRAWS = 3;

export interface NicknameSuggestions {
  nickname_mode: NicknameMode;
  suggestions: string[];
}

/** `GET /api/sessions/join/nicknames?code=` (public). Rejette avec l'erreur axios (404 si code inconnu). */
export async function fetchNicknameSuggestions(code: string): Promise<NicknameSuggestions> {
  const { data } = await api.get<NicknameSuggestions>('/sessions/join/nicknames', {
    params: { code },
  });
  return {
    nickname_mode: data?.nickname_mode === 'generated' ? 'generated' : 'free',
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
  };
}

export type JoinErrorMessages = Record<
  'kicked' | 'notFound' | 'invalidNickname' | 'nicknameTaken' | 'network' | 'generic',
  string
>;

/** Messages par défaut (français). L'interface passe les messages traduits (`join.errors`). */
export const JOIN_ERROR_MESSAGES: JoinErrorMessages = {
  kicked: "Tu as été exclu de cette session par l'enseignant : tu ne peux pas la rejoindre à nouveau.",
  notFound: 'Session introuvable ou terminée. Vérifie le code.',
  invalidNickname: "Ce pseudo n'est pas accepté. Choisis-en un autre.",
  nicknameTaken: 'Ce pseudo est déjà utilisé dans cette session. Choisis-en un autre.',
  network: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.',
  generic: 'Erreur lors de la connexion. Réessaie.',
};

function serverMessage(data: unknown): string | null {
  const message = (data as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string' && message.trim()) return message;
  // Erreurs de validation class-validator : tableau de messages.
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (parts.length > 0) return parts.join(' ');
  }
  return null;
}

/**
 * Message à afficher pour un échec de `POST /api/sessions/join`.
 * - 400 : pseudo refusé (filtre, format ou pseudo hors générateur) : message du serveur ;
 * - 403 : participant exclu par le créateur : message dédié ;
 * - 404 / 409 : message du serveur, sinon message par défaut.
 */
export function getJoinErrorMessage(
  err: unknown,
  messages: JoinErrorMessages = JOIN_ERROR_MESSAGES,
  /** Le serveur répond en français : hors français, on préfère nos messages traduits. */
  { preferServer = true }: { preferServer?: boolean } = {}
): string {
  const response = (err as { response?: { status?: number; data?: unknown } } | undefined)?.response;
  if (!response) return messages.network;

  const fromServer = preferServer ? serverMessage(response.data) : null;
  switch (response.status) {
    case 403:
      return messages.kicked;
    case 400:
      return fromServer ?? messages.invalidNickname;
    case 404:
      return fromServer ?? messages.notFound;
    case 409:
      return fromServer ?? messages.nicknameTaken;
    default:
      return fromServer ?? messages.generic;
  }
}
