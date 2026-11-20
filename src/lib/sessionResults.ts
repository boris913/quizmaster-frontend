import type { SessionResults, SessionResultsParticipant, SessionResultsQuestion } from '@/types';

/**
 * Types de question sans bonne réponse : le backend renvoie `accuracy: 0` pour eux,
 * il ne faut donc jamais l'afficher comme un score. Aligné sur
 * `UNGRADED_QUESTION_TYPES` (quizmaster-backend, src/session/results/session-results.ts).
 */
export const UNGRADED_QUESTION_TYPES: readonly string[] = ['poll'];

export function isGradedQuestion(question: Pick<SessionResultsQuestion, 'type'>): boolean {
  return !UNGRADED_QUESTION_TYPES.includes(question.type);
}

/** Vrai si au moins une question du quiz est notée (sinon, aucune précision n'a de sens). */
export function hasGradedQuestions(results: SessionResults): boolean {
  return results.perQuestion.some(isGradedQuestion);
}

/**
 * Les `count` questions notées les moins réussies (précision croissante, puis ordre du quiz).
 * Les sondages sont exclus.
 */
export function hardestQuestions(
  questions: SessionResultsQuestion[],
  count = 3
): SessionResultsQuestion[] {
  return questions
    .filter(isGradedQuestion)
    .sort((a, b) => a.accuracy - b.accuracy || a.orderIndex - b.orderIndex)
    .slice(0, count);
}

export type ParticipantSortKey = 'pseudo' | 'score' | 'accuracy' | 'avgTimeMs' | 'timeouts';
export type SortDirection = 'asc' | 'desc';

/** Tri stable du tableau élèves ; départage par pseudo pour un ordre déterministe. */
export function sortParticipants(
  participants: SessionResultsParticipant[],
  key: ParticipantSortKey,
  direction: SortDirection
): SessionResultsParticipant[] {
  const factor = direction === 'asc' ? 1 : -1;
  return [...participants].sort((a, b) => {
    const primary =
      key === 'pseudo'
        ? a.pseudo.localeCompare(b.pseudo, 'fr', { sensitivity: 'base' })
        : a[key] - b[key];
    return primary * factor || a.pseudo.localeCompare(b.pseudo, 'fr', { sensitivity: 'base' });
  });
}

/** Ratio 0..1 -> pourcentage entier lisible (« 67 % »). */
export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)} %`;
}

/** Millisecondes -> secondes avec une décimale, virgule française (« 3,2 s »). */
export function formatSeconds(ms: number): string {
  if (!ms) return '—';
  return `${(Math.round(ms / 100) / 10).toLocaleString('fr-FR')} s`;
}

/**
 * Nom de fichier du CSV, calqué sur `resultsCsvFilename` du backend. Utilisé quand
 * l'en-tête Content-Disposition n'est pas lisible (CORS sans `Access-Control-Expose-Headers`).
 */
export function resultsCsvFilename(session: SessionResults['session'] | null | undefined): string {
  const slug =
    (session?.quizTitle ?? '')
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 50) || 'session';
  const date = (session?.startedAt ?? '').slice(0, 10);
  return `resultats-${slug}${date ? `-${date}` : ''}.csv`;
}

/** Extrait `filename` d'un en-tête Content-Disposition, ou null. */
export function filenameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null;
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1].trim()) : null;
}
