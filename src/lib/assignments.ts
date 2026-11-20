/**
 * Mode devoir : appels API et normalisation des réponses.
 * Contrat : boris913/quizmaster-backend#10. Tout écart avec le backend se corrige ici
 * (et dans les types de `src/types/index.ts`), pas dans les pages.
 *
 * - Prof (authentifié) : `POST /api/sessions` avec `mode: 'async'`, `dueAt`, `scoringMode`,
 *   `showExplanations` ; `PATCH /api/sessions/:id` pour prolonger (`dueAt`) ou clore (`status`).
 * - Élève (public, REST) : `POST /api/assignments/:code/start`, `GET /api/assignments/:code/next`
 *   et `POST /api/assignments/:code/answer`, avec l'en-tête `X-Resume-Token`.
 */
import api from '@/lib/api';
import { getAppBaseUrl, normalizeSessionCode } from '@/lib/sessionCode';
import type {
  AssignmentAnswerResult,
  AssignmentNext,
  AssignmentOptions,
  AssignmentQuestion,
  AssignmentReviewItem,
  AssignmentStartResponse,
  AssignmentSummary,
  QuizOption,
  Session,
} from '@/types';

export const RESUME_TOKEN_HEADER = 'X-Resume-Token';

/** Délai minimal entre maintenant et l'échéance d'un devoir. */
export const MIN_DUE_DELAY_MS = 15 * 60 * 1000;

/** Échéance maximale acceptée par le backend (`MAX_DUE_IN_DAYS`). */
export const MAX_DUE_DAYS = 365;

// ------------------------------------------------------------
// Liens
// ------------------------------------------------------------

/** Lien élève d'un devoir : `${APP_URL}/player/assignment/XXXXXX`. */
export function buildAssignmentUrl(code: string, baseUrl: string = getAppBaseUrl()): string {
  return `${baseUrl}/player/assignment/${encodeURIComponent(normalizeSessionCode(code))}`;
}

// ------------------------------------------------------------
// Échéance (champ <input type="datetime-local">, heure locale)
// ------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Date -> valeur `YYYY-MM-DDTHH:mm` d'un `datetime-local` (heure locale). */
export function toDateTimeLocalValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

/** Valeur d'un `datetime-local` -> Date (heure locale), `null` si invalide. */
export function parseDateTimeLocalValue(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, mo, d, h, mi] = match.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Échéance proposée par défaut : demain, à l'heure pile suivante. */
export function defaultDueDate(now: Date = new Date()): Date {
  const date = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  date.setHours(date.getHours() + 1);
  return date;
}

/** Message d'erreur si l'échéance est invalide, `null` sinon. */
export function validateDueDate(value: string, now: Date = new Date()): string | null {
  const date = parseDateTimeLocalValue(value);
  if (!date) return 'Indiquez une date et une heure d’échéance.';
  if (date.getTime() < now.getTime() + MIN_DUE_DELAY_MS) {
    return 'L’échéance doit être au moins 15 minutes après maintenant.';
  }
  if (date.getTime() > now.getTime() + MAX_DUE_DAYS * 24 * 60 * 60 * 1000) {
    return `L’échéance ne peut pas dépasser ${MAX_DUE_DAYS} jours.`;
  }
  return null;
}

/** « jeudi 21 novembre à 18:00 » */
export function formatDueDate(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ------------------------------------------------------------
// Côté prof
// ------------------------------------------------------------

export function isAssignment(session: Pick<Session, 'mode'> | null | undefined): boolean {
  return session?.mode === 'async';
}

/** Devoir ni clos ni échu. */
export function isOpenAssignment(
  session: Pick<Session, 'mode' | 'status' | 'due_at'>,
  now: number = Date.now()
): boolean {
  if (!isAssignment(session) || session.status === 'finished') return false;
  if (!session.due_at) return true;
  const due = new Date(session.due_at).getTime();
  return Number.isNaN(due) || due > now;
}

/** `POST /api/sessions` en mode devoir. */
export async function createAssignment(quizId: string, options: AssignmentOptions): Promise<Session> {
  const { data } = await api.post<Session>('/sessions', {
    quiz_id: quizId,
    mode: 'async',
    dueAt: options.dueAt,
    scoringMode: options.scoringMode,
    showExplanations: options.showExplanations,
  });
  return data;
}

/** `PATCH /api/sessions/:id { dueAt }` : prolonge l'échéance. */
export async function extendAssignment(sessionId: string, dueAt: string): Promise<Session> {
  const { data } = await api.patch<Session>(`/sessions/${sessionId}`, { dueAt });
  return data;
}

/** `PATCH /api/sessions/:id { status: 'finished' }` : clôt le devoir. */
export async function closeAssignment(sessionId: string): Promise<Session> {
  const { data } = await api.patch<Session>(`/sessions/${sessionId}`, { status: 'finished' });
  return data;
}

/** Complétion d'un devoir si le backend la fournit (`completed_count` / `participant_count`). */
export function getAssignmentCompletion(
  session: Session
): { completed: number; started: number } | null {
  const raw = session as unknown as Record<string, unknown>;
  const completed = Number(raw.completed_count ?? raw.completedCount);
  const started = Number(raw.participant_count ?? raw.participantCount);
  if (!Number.isFinite(completed) || !Number.isFinite(started)) return null;
  return { completed: Math.max(0, completed), started: Math.max(0, started) };
}

// ------------------------------------------------------------
// Côté élève : jeton de reprise (localStorage, toujours sous try/catch)
// ------------------------------------------------------------

export interface StoredAssignmentSession {
  participantId: string;
  resumeToken: string;
  pseudo: string;
}

export function resumeStorageKey(code: string): string {
  return `kwizora_assignment:${normalizeSessionCode(code)}`;
}

export function loadAssignmentSession(code: string): StoredAssignmentSession | null {
  try {
    const raw = window.localStorage.getItem(resumeStorageKey(code));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredAssignmentSession>;
    if (typeof parsed?.resumeToken !== 'string' || !parsed.resumeToken) return null;
    return {
      participantId: String(parsed.participantId ?? ''),
      resumeToken: parsed.resumeToken,
      pseudo: String(parsed.pseudo ?? ''),
    };
  } catch {
    return null;
  }
}

export function saveAssignmentSession(code: string, value: StoredAssignmentSession): void {
  try {
    window.localStorage.setItem(resumeStorageKey(code), JSON.stringify(value));
  } catch {
    // Navigation privée ou stockage bloqué : la reprise ne sera simplement pas possible.
  }
}

export function clearAssignmentSession(code: string): void {
  try {
    window.localStorage.removeItem(resumeStorageKey(code));
  } catch {
    // idem
  }
}

// ------------------------------------------------------------
// Côté élève : appels
// ------------------------------------------------------------

type Raw = Record<string, unknown>;

function pick(raw: unknown, camel: string, snake: string): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Raw;
  return r[camel] !== undefined ? r[camel] : r[snake];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toCountOrNull(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toOptions(value: unknown): QuizOption[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((o): o is Raw => !!o && typeof o === 'object')
    .map((o) => ({ id: String(o.id), text: String(o.text ?? '') }));
}

function encodedCode(code: string): string {
  return encodeURIComponent(normalizeSessionCode(code));
}

function tokenHeaders(resumeToken: string) {
  return { headers: { [RESUME_TOKEN_HEADER]: resumeToken } };
}

export async function startAssignment(code: string, pseudo: string): Promise<AssignmentStartResponse> {
  const { data } = await api.post(`/assignments/${encodedCode(code)}/start`, { pseudo });
  const participantId = pick(data, 'participantId', 'participant_id');
  const resumeToken = pick(data, 'resumeToken', 'resume_token');
  if (typeof resumeToken !== 'string' || !resumeToken) {
    throw new Error('Réponse inattendue du serveur (jeton de reprise absent).');
  }
  return { participantId: String(participantId ?? ''), resumeToken };
}

/**
 * Question publique du devoir -> forme attendue par `QuestionView` (snake_case du type
 * `Question`). Le backend envoie `timerSeconds`, `maxPoints`, `imageUrl` en camelCase ;
 * les champs supplémentaires (nouveaux types de questions) sont conservés tels quels.
 */
function normalizeQuestion(raw: Raw): AssignmentQuestion {
  const rest: Raw = { ...raw };
  delete rest.correct_answers;
  delete rest.correctAnswers;
  delete rest.explanation;
  return {
    ...(rest as unknown as AssignmentQuestion),
    id: String(raw.id),
    text: String(raw.text ?? ''),
    type: ((raw.type as string) || 'single') as AssignmentQuestion['type'],
    options: toOptions(raw.options),
    max_points: toCount(pick(raw, 'maxPoints', 'max_points')),
    timer_seconds: toCount(pick(raw, 'timerSeconds', 'timer_seconds')),
  };
}

function normalizeReviewItem(raw: unknown): AssignmentReviewItem | null {
  const question = pick(raw, 'question', 'question');
  const questionId = pick(raw, 'questionId', 'question_id') ?? pick(question, 'id', 'id');
  if (questionId === undefined || questionId === null) return null;
  return {
    questionId: String(questionId),
    text: String(pick(raw, 'text', 'text') ?? pick(question, 'text', 'text') ?? ''),
    options: toOptions(pick(raw, 'options', 'options') ?? pick(question, 'options', 'options')),
    yourAnswers: toStringArray(pick(raw, 'yourAnswers', 'your_answers') ?? pick(raw, 'answers', 'answers')),
    correctAnswers: toStringArray(pick(raw, 'correctAnswers', 'correct_answers')),
    isCorrect: Boolean(pick(raw, 'isCorrect', 'is_correct')),
    explanation: toText(pick(raw, 'explanation', 'explanation')),
  };
}

function normalizeSummary(raw: unknown): AssignmentSummary {
  // Backend #10 : champs à la racine ; variante tolérée : objet `summary`.
  const nested = pick(raw, 'summary', 'summary');
  const source = nested && typeof nested === 'object' ? nested : raw;
  const review = pick(source, 'review', 'review') ?? pick(raw, 'review', 'review');
  return {
    score: toCount(pick(source, 'score', 'score') ?? pick(source, 'totalScore', 'total_score')),
    correctCount: toCountOrNull(pick(source, 'correctCount', 'correct_count')),
    totalQuestions: toCountOrNull(
      pick(source, 'total', 'total') ?? pick(source, 'totalQuestions', 'total_questions')
    ),
    review: Array.isArray(review)
      ? review.map(normalizeReviewItem).filter((r): r is AssignmentReviewItem => r !== null)
      : [],
  };
}

function readDueAt(raw: unknown): string | null {
  return (
    toText(pick(raw, 'dueAt', 'due_at')) ??
    toText(pick(pick(raw, 'assignment', 'assignment'), 'dueAt', 'due_at'))
  );
}

/**
 * Normalise la réponse de `GET /next`. Forme backend #10 : `{ done: false, position, total,
 * question, timeRemainingMs, assignment: { dueAt } }` ou `{ done: true, score, correctCount,
 * total, review }`. Tolère camelCase et snake_case.
 */
export function normalizeAssignmentNext(raw: unknown): AssignmentNext {
  const dueAt = readDueAt(raw);
  const question = pick(raw, 'question', 'question') as Raw | null | undefined;
  const done =
    pick(raw, 'done', 'done') === true ||
    pick(raw, 'finished', 'finished') === true ||
    !question ||
    typeof question !== 'object';
  if (done || !question) return { done: true, summary: normalizeSummary(raw), dueAt };

  const normalized = normalizeQuestion(question);
  const total =
    toCount(pick(raw, 'total', 'total')) || toCount(pick(raw, 'totalQuestions', 'total_questions'));
  const number =
    toCount(pick(raw, 'position', 'position')) ||
    toCount(pick(raw, 'questionNumber', 'question_number')) ||
    1;
  const remainingMs = toCountOrNull(pick(raw, 'timeRemainingMs', 'time_remaining_ms'));
  const remaining = remainingMs !== null ? Math.ceil(remainingMs / 1000) : 0;
  const timer =
    remaining ||
    toCount(pick(raw, 'timerSeconds', 'timer_seconds')) ||
    normalized.timer_seconds ||
    30;
  return {
    done: false,
    question: normalized,
    questionNumber: number,
    totalQuestions: Math.max(total, number),
    // Après une reprise, le chrono repart du temps restant mesuré par le serveur.
    timerSeconds: Math.max(1, timer),
    dueAt,
  };
}

/**
 * Normalise `POST /answer`. Forme backend #10 : `{ questionId, status, alreadyAnswered,
 * timeTakenMs, finished, result: { isCorrect, pointsEarned, maxPoints, correctAnswers,
 * explanation, totalScore } | null }` (`result` nul quand la correction est à la fin).
 * Tolère aussi un verdict à plat.
 */
export function normalizeAssignmentAnswer(raw: unknown): AssignmentAnswerResult {
  const nested = pick(raw, 'result', 'result');
  const v = nested && typeof nested === 'object' ? nested : raw;
  const verdict = pick(v, 'isCorrect', 'is_correct');
  return {
    isCorrect: typeof verdict === 'boolean' ? verdict : null,
    pointsEarned: toCount(pick(v, 'pointsEarned', 'points_earned')),
    maxPoints: toCount(pick(v, 'maxPoints', 'max_points')),
    timeTakenMs: toCount(pick(raw, 'timeTakenMs', 'time_taken_ms') ?? pick(v, 'timeTakenMs', 'time_taken_ms')),
    correctAnswers: toStringArray(pick(v, 'correctAnswers', 'correct_answers')),
    explanation: toText(pick(v, 'explanation', 'explanation')),
    totalScore: toCountOrNull(pick(v, 'totalScore', 'total_score')),
    timedOut: pick(raw, 'status', 'status') === 'timeout',
    done: pick(raw, 'finished', 'finished') === true || pick(raw, 'done', 'done') === true,
  };
}

export async function fetchNextQuestion(code: string, resumeToken: string): Promise<AssignmentNext> {
  const { data } = await api.get(`/assignments/${encodedCode(code)}/next`, tokenHeaders(resumeToken));
  return normalizeAssignmentNext(data);
}

export async function submitAssignmentAnswer(
  code: string,
  resumeToken: string,
  questionId: string,
  answers: string[]
): Promise<AssignmentAnswerResult> {
  const { data } = await api.post(
    `/assignments/${encodedCode(code)}/answer`,
    { questionId, answers },
    tokenHeaders(resumeToken)
  );
  return normalizeAssignmentAnswer(data);
}

// ------------------------------------------------------------
// Erreurs
// ------------------------------------------------------------

/** Vrai si `POST /sessions/join` a refusé un code de devoir (404 avec `mode: 'async'`). */
export function isAssignmentCodeError(err: unknown): boolean {
  const response = (err as { response?: { status?: number; data?: { mode?: unknown } } } | undefined)?.response;
  return response?.status === 404 && response.data?.mode === 'async';
}

export type AssignmentErrorKind =
  | 'notFound'
  | 'expired'
  | 'closed'
  | 'nickname'
  | 'nicknameTaken'
  | 'invalidToken'
  | 'alreadyAnswered'
  | 'kicked'
  | 'network'
  | 'generic';

export interface AssignmentError {
  kind: AssignmentErrorKind;
  message: string;
}

export const ASSIGNMENT_ERROR_MESSAGES: Record<AssignmentErrorKind, string> = {
  notFound: 'Ce devoir est introuvable. Vérifie le lien ou le code donné par ton enseignant.',
  expired: 'L’échéance de ce devoir est passée : il n’est plus possible d’y répondre.',
  closed: 'Ce devoir a été clos par ton enseignant : il n’est plus possible d’y répondre.',
  nickname: "Ce pseudo n'est pas accepté. Choisis-en un autre.",
  nicknameTaken: 'Ce pseudo est déjà utilisé pour ce devoir. Choisis-en un autre.',
  invalidToken: 'Ta progression n’a pas pu être retrouvée. Saisis ton pseudo pour recommencer.',
  alreadyAnswered: 'Tu as déjà répondu à cette question.',
  kicked: "Tu as été exclu de ce devoir par l'enseignant.",
  network: 'Impossible de joindre le serveur. Vérifie ta connexion et réessaie.',
  generic: 'Une erreur est survenue. Réessaie dans un instant.',
};

function serverMessage(data: unknown): string | null {
  const message = (data as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string' && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (parts.length > 0) return parts.join(' ');
  }
  return null;
}

/** `reason` (backend #10 : 'expired' | 'closed' sur un 410) ou `code` éventuel. */
function serverCode(data: unknown): string {
  const d = data as { reason?: unknown; code?: unknown } | undefined;
  const value = d?.reason ?? d?.code;
  return typeof value === 'string' ? value.toUpperCase() : '';
}

const EXPIRED_RE = /(échéance|echeance|expir|due|dépass|depass|passée|passee)/i;
const CLOSED_RE = /(clos|clôtur|clotur|ferm|termin|closed|finished)/i;

/**
 * Classe une erreur d'API du parcours élève (backend #10) : 404 code inconnu (ou session en
 * direct) ; 410 `reason: 'expired' | 'closed'` ; 400 pseudo refusé ; 409 pseudo pris (start)
 * ou question qui n'est plus la question en cours (answer) ; 401 jeton de reprise manquant ou
 * invalide ; 403 participant exclu.
 */
export function getAssignmentError(
  err: unknown,
  step: 'start' | 'next' | 'answer'
): AssignmentError {
  const response = (err as { response?: { status?: number; data?: unknown } } | undefined)?.response;
  if (!response) return { kind: 'network', message: ASSIGNMENT_ERROR_MESSAGES.network };
  const fromServer = serverMessage(response.data);
  const code = serverCode(response.data);
  const text = `${code} ${fromServer ?? ''}`;
  const make = (kind: AssignmentErrorKind, preferServer = false): AssignmentError => ({
    kind,
    message: preferServer && fromServer ? fromServer : ASSIGNMENT_ERROR_MESSAGES[kind],
  });

  if (code === 'EXPIRED') return make('expired');
  if (code === 'CLOSED') return make('closed');

  switch (response.status) {
    case 404:
      // Code d'une session en direct (`mode: 'live'`) : le message du serveur l'explique.
      return make('notFound', (response.data as { mode?: unknown } | undefined)?.mode === 'live');
    case 410:
      return CLOSED_RE.test(text) && !EXPIRED_RE.test(text) ? make('closed') : make('expired');
    case 403:
      if (EXPIRED_RE.test(text)) return make('expired');
      if (CLOSED_RE.test(text)) return make('closed');
      return step === 'start' ? make('nickname', true) : make('kicked', true);
    case 401:
      return make('invalidToken');
    case 400:
      return step === 'start' ? make('nickname', true) : make('generic', true);
    case 409:
      return step === 'start' ? make('nicknameTaken', true) : make('alreadyAnswered');
    default:
      return make('generic', true);
  }
}
