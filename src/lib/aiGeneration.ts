/**
 * Génération de questions par IA : appel API et normalisation des réponses.
 * Contrat : boris913/quizmaster-backend#11. Tout écart avec le backend se corrige ici, pas
 * dans les pages.
 *
 * `POST /api/quizzes/generate` (authentifié), `multipart/form-data` :
 * - `text?` : texte du cours, ou `file?` : PDF de 10 Mo au plus ;
 * - `level` (ex. « 4e »), `count` (1-30), `types[]` (types de question demandés, sans sondage).
 *
 * Réponse : un brouillon de questions (rien n'est enregistré côté serveur), le nombre de
 * questions écartées par la validation et, si fourni, l'état du quota mensuel.
 * Erreurs : 429 quota atteint, 503 IA non configurée, 422 PDF sans texte exploitable,
 * 413 fichier trop lourd, 400 paramètres invalides.
 */
import axios from 'axios';
import api from '@/lib/api';
import {
  QUESTION_TYPES,
  isQuestionType,
  type QuestionDraft,
  type QuestionType,
  type QuizOption,
} from '@/types';

export const AI_GENERATE_ENDPOINT = '/quizzes/generate';
export const AI_PDF_MAX_BYTES = 10 * 1024 * 1024;
export const AI_MIN_COUNT = 1;
export const AI_MAX_COUNT = 30;
export const AI_DEFAULT_COUNT = 10;
/** Le texte est découpé côté serveur ; on refuse seulement l'absurde côté client. */
export const AI_TEXT_MIN_LENGTH = 50;
/** Délai d'attente : la génération peut prendre plus d'une minute sur un long cours. */
export const AI_GENERATE_TIMEOUT_MS = 180_000;

/** Types proposés à la génération : tous sauf le sondage (pas de bonne réponse à générer). */
export const AI_GENERATABLE_TYPES: readonly QuestionType[] = QUESTION_TYPES.filter((t) => t !== 'poll');

export const AI_LEVELS = [
  'CP',
  'CE1',
  'CE2',
  'CM1',
  'CM2',
  '6e',
  '5e',
  '4e',
  '3e',
  'Seconde',
  'Première',
  'Terminale',
  'Supérieur',
] as const;

/** Valeurs par défaut d'une question générée (le backend ne fournit ni points ni durée). */
const DEFAULT_MAX_POINTS = 100;
const DEFAULT_TIMER_SECONDS = 30;

export interface GenerationRequest {
  /** Texte du cours (ignoré si un fichier est fourni). */
  text?: string;
  file?: File | null;
  level: string;
  count: number;
  types: QuestionType[];
}

export interface GenerationQuota {
  limit: number | null;
  used: number | null;
  remaining: number | null;
  /** Date ISO de remise à zéro, si le serveur la donne. */
  resetAt: string | null;
}

export interface GenerationResult {
  /** Brouillon prêt pour l'éditeur (`QuizForm` / `QuestionBuilder`). */
  questions: QuestionDraft[];
  /** Questions écartées par la validation serveur (ou invalides à la réception). */
  discarded: number;
  /** Titre suggéré, si le serveur en propose un. */
  title: string | null;
  quota: GenerationQuota | null;
}

// ------------------------------------------------------------
// Contrôles côté client
// ------------------------------------------------------------

function isPdf(file: { name: string; type: string }): boolean {
  if (file.type) return file.type === 'application/pdf';
  return /\.pdf$/i.test(file.name);
}

/** Message d'erreur si le fichier n'est pas un PDF de 10 Mo au plus, `null` sinon. */
export function validateCourseFile(file: { name: string; type: string; size: number }): string | null {
  if (!isPdf(file)) return 'Seuls les fichiers PDF sont acceptés.';
  if (file.size > AI_PDF_MAX_BYTES) return 'Le PDF dépasse 10 Mo. Allégez-le ou collez le texte du cours.';
  if (file.size === 0) return 'Ce fichier est vide.';
  return null;
}

/** Erreurs de saisie du formulaire de génération (clé = champ). */
export function validateGenerationRequest(req: GenerationRequest): Partial<Record<'source' | 'level' | 'count' | 'types', string>> {
  const errors: Partial<Record<'source' | 'level' | 'count' | 'types', string>> = {};
  if (req.file) {
    const fileError = validateCourseFile(req.file);
    if (fileError) errors.source = fileError;
  } else if ((req.text ?? '').trim().length < AI_TEXT_MIN_LENGTH) {
    errors.source = `Collez le texte du cours (${AI_TEXT_MIN_LENGTH} caractères au moins) ou déposez un PDF.`;
  }
  if (!req.level.trim()) errors.level = 'Choisissez un niveau.';
  if (!Number.isInteger(req.count) || req.count < AI_MIN_COUNT || req.count > AI_MAX_COUNT) {
    errors.count = `Entre ${AI_MIN_COUNT} et ${AI_MAX_COUNT} questions.`;
  }
  if (req.types.length === 0) errors.types = 'Cochez au moins un type de question.';
  return errors;
}

// ------------------------------------------------------------
// Requête
// ------------------------------------------------------------

/** Corps multipart : le fichier prime sur le texte, un seul des deux est envoyé. */
export function buildGenerationFormData(req: GenerationRequest): FormData {
  const form = new FormData();
  if (req.file) form.append('file', req.file, req.file.name);
  else form.append('text', (req.text ?? '').trim());
  form.append('level', req.level.trim());
  form.append('count', String(req.count));
  req.types
    .filter((t) => AI_GENERATABLE_TYPES.includes(t))
    .forEach((t) => form.append('types[]', t));
  return form;
}

export interface GenerateOptions {
  signal?: AbortSignal;
  /** Progression de l'envoi (0-1), utile pour un PDF. */
  onUploadProgress?: (ratio: number) => void;
}

export async function generateQuizDraft(req: GenerationRequest, options: GenerateOptions = {}): Promise<GenerationResult> {
  const { data } = await api.post(AI_GENERATE_ENDPOINT, buildGenerationFormData(req), {
    // L'instance envoie du JSON par défaut : sans cet en-tête, axios sérialiserait le FormData
    // en JSON. Le navigateur remplace ensuite l'en-tête par celui qui porte la frontière.
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: AI_GENERATE_TIMEOUT_MS,
    signal: options.signal,
    onUploadProgress: options.onUploadProgress
      ? (e) => {
          if (e.total) options.onUploadProgress!(Math.min(1, e.loaded / e.total));
        }
      : undefined,
  });
  return normalizeGenerationResponse(data);
}

// ------------------------------------------------------------
// Normalisation de la réponse
// ------------------------------------------------------------

type Raw = Record<string, unknown>;

function isObject(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(obj: Raw, ...keys: string[]): unknown {
  for (const key of keys) {
    if (obj[key] !== undefined && obj[key] !== null) return obj[key];
  }
  return undefined;
}

function toCount(value: unknown): number | null {
  const n = typeof value === 'string' ? Number(value) : value;
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : null;
}

function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function normalizeQuota(raw: unknown): GenerationQuota | null {
  if (!isObject(raw)) return null;
  const limit = toCount(pick(raw, 'limit', 'monthlyLimit', 'monthly_limit', 'max'));
  const used = toCount(pick(raw, 'used', 'count', 'usedThisMonth'));
  let remaining = toCount(pick(raw, 'remaining', 'left'));
  if (remaining === null && limit !== null && used !== null) remaining = Math.max(0, limit - used);
  const resetAt = toIsoDate(pick(raw, 'resetAt', 'reset_at', 'resetsAt', 'resets_at'));
  if (limit === null && used === null && remaining === null && resetAt === null) return null;
  return { limit, used, remaining, resetAt };
}

/** Question générée (format `CreateQuestionDto`) -> brouillon d'éditeur, ou `null` si inexploitable. */
export function normalizeGeneratedQuestion(raw: unknown, allowed?: readonly QuestionType[]): QuestionDraft | null {
  if (!isObject(raw)) return null;
  const text = typeof raw.text === 'string' ? raw.text.trim() : '';
  if (!text || !isQuestionType(raw.type) || raw.type === 'poll') return null;
  if (allowed && allowed.length > 0 && !allowed.includes(raw.type)) return null;
  const options: QuizOption[] = Array.isArray(raw.options)
    ? raw.options
        .filter(isObject)
        .map((o) => ({ id: String(o.id ?? ''), text: typeof o.text === 'string' ? o.text : '' }))
        .filter((o) => o.id)
    : [];
  const correctRaw = pick(raw, 'correct_answers', 'correctAnswers');
  const correct = Array.isArray(correctRaw) ? correctRaw.map((v) => String(v)) : [];
  const explanation = typeof raw.explanation === 'string' ? raw.explanation : undefined;
  return {
    text,
    type: raw.type,
    options,
    correct_answers: correct,
    max_points: DEFAULT_MAX_POINTS,
    timer_seconds: DEFAULT_TIMER_SECONDS,
    explanation,
    image_url: null,
  };
}

export function normalizeGenerationResponse(raw: unknown, allowed?: readonly QuestionType[]): GenerationResult {
  const body = isObject(raw) ? raw : {};
  const container = isObject(body.draft) ? body.draft : body;
  const list = Array.isArray(raw) ? raw : Array.isArray(container.questions) ? container.questions : [];
  const questions = list
    .map((q) => normalizeGeneratedQuestion(q, allowed))
    .filter((q): q is QuestionDraft => q !== null);
  const serverDiscarded =
    toCount(pick(body, 'discarded', 'discardedCount', 'discarded_count', 'rejected', 'rejectedCount', 'invalidCount')) ??
    toCount(pick(container, 'discarded', 'discardedCount', 'discarded_count')) ??
    0;
  const title = pick(container, 'title', 'suggestedTitle');
  return {
    questions,
    discarded: serverDiscarded + (list.length - questions.length),
    title: typeof title === 'string' && title.trim() ? title.trim() : null,
    quota: normalizeQuota(pick(body, 'quota', 'usage')),
  };
}

// ------------------------------------------------------------
// Erreurs
// ------------------------------------------------------------

export type GenerationErrorKind =
  | 'quota'
  | 'unavailable'
  | 'pdf_no_text'
  | 'too_large'
  | 'invalid'
  | 'no_questions'
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'unknown';

export interface GenerationError {
  kind: GenerationErrorKind;
  message: string;
  quota: GenerationQuota | null;
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

export function formatResetDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso));
}

/** Message de quota atteint : limite et date de remise à zéro quand le serveur les donne. */
export function quotaReachedMessage(quota: GenerationQuota | null): string {
  const limit = quota?.limit;
  const parts = [
    limit
      ? `Vous avez utilisé vos ${limit} générations du mois.`
      : 'Vous avez atteint votre quota mensuel de générations.',
  ];
  parts.push(
    quota?.resetAt
      ? `Le compteur sera remis à zéro le ${formatResetDate(quota.resetAt)}.`
      : 'Le compteur est remis à zéro au début du mois prochain.'
  );
  parts.push('En attendant, vous pouvez créer le quiz manuellement ou l’importer.');
  return parts.join(' ');
}

function serverMessage(data: unknown): string {
  if (!isObject(data)) return '';
  const message = data.message;
  if (Array.isArray(message)) return message.map(String).join(' ');
  return typeof message === 'string' ? message : '';
}

function errorCode(data: unknown): string {
  if (!isObject(data)) return '';
  const code = pick(data, 'code', 'errorCode', 'error');
  return typeof code === 'string' ? code.toUpperCase() : '';
}

export function classifyGenerationError(error: unknown): GenerationError {
  if (!axios.isAxiosError(error)) {
    return { kind: 'unknown', message: 'La génération a échoué. Réessayez dans un instant.', quota: null };
  }
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return {
      kind: 'timeout',
      message: 'La génération prend trop de temps. Réessayez avec un cours plus court ou moins de questions.',
      quota: null,
    };
  }
  const response = error.response;
  if (!response) {
    return {
      kind: 'network',
      message: 'Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.',
      quota: null,
    };
  }
  const { status, data } = response;
  const code = errorCode(data);
  const text = serverMessage(data);
  const body = isObject(data) ? data : {};
  if (status === 429 || code.includes('QUOTA')) {
    const quota =
      normalizeQuota(pick(body, 'quota', 'usage')) ??
      normalizeQuota(body) ??
      normalizeQuota({ resetAt: response.headers?.['x-quota-reset'] });
    return { kind: 'quota', message: quotaReachedMessage(quota), quota };
  }
  if (status === 503) {
    return {
      kind: 'unavailable',
      message:
        'La génération par IA est indisponible pour le moment (service non configuré ou momentanément hors ligne). Vous pouvez créer le quiz manuellement.',
      quota: null,
    };
  }
  if (status === 401) {
    return { kind: 'unauthorized', message: 'Votre session a expiré. Reconnectez-vous puis réessayez.', quota: null };
  }
  if (status === 413) {
    return { kind: 'too_large', message: 'Le PDF dépasse 10 Mo. Allégez-le ou collez le texte du cours.', quota: null };
  }
  if (code.includes('NO_QUESTION') || (status === 422 && /aucune question/i.test(text))) {
    return {
      kind: 'no_questions',
      message: 'Aucune question exploitable n’a pu être générée à partir de ce cours. Essayez un extrait plus riche.',
      quota: null,
    };
  }
  if (status === 422 || code.includes('NO_TEXT')) {
    return {
      kind: 'pdf_no_text',
      message:
        'Aucun texte n’a pu être extrait de ce PDF (document scanné ou image ?). Collez le texte du cours à la place.',
      quota: null,
    };
  }
  if (status === 504) {
    return {
      kind: 'timeout',
      message: 'La génération prend trop de temps. Réessayez avec un cours plus court ou moins de questions.',
      quota: null,
    };
  }
  if (status === 400) {
    return {
      kind: 'invalid',
      message: text ? `Paramètres refusés : ${text}` : 'Paramètres refusés par le serveur. Vérifiez le formulaire.',
      quota: null,
    };
  }
  return { kind: 'unknown', message: 'La génération a échoué. Réessayez dans un instant.', quota: null };
}
