/**
 * Duplication, partage et import de quiz : appels API et normalisation des réponses.
 * Contrat : boris913/quizmaster-backend#12. Tout écart avec le backend se corrige ici,
 * pas dans les pages.
 *
 * - `POST /api/quizzes/:id/duplicate` : copie du quiz (questions, ordre, images si possible).
 * - `POST /api/quizzes/:id/share` (crée ou régénère le jeton) et `DELETE /api/quizzes/:id/share`.
 * - `GET /api/quizzes/shared/:token` : aperçu public, sans bonnes réponses.
 * - `POST /api/quizzes/shared/:token/copy` : copie dans le compte connecté.
 * - `POST /api/quizzes/:id/import?format=csv|xlsx|kahoot&dryRun=true|false` (multipart, champ
 *   `file`, 2 Mo au plus) -> `{ format, dry_run, total_rows, valid, imported, questions,
 *   errors: [{ row, message }] }` (`imported` vaut 0 en dryRun ; `valid` = questions valides).
 *   Erreurs de fichier : 400 (structure), 413 (taille), 415 (type).
 * - `GET /api/quizzes/import-template.csv` : modèle CSV.
 */
import api from '@/lib/api';
import { API_URL, HTTP_PREFIX } from '@/constants';
import { getAppBaseUrl } from '@/lib/sessionCode';
import { normalizeQuestionType, type QuestionType, type QuizOption } from '@/types';

type Raw = Record<string, unknown>;

/**
 * Traducteur de l'espace `sharing` (messages/*.json), fourni par les composants via
 * `useTranslations('sharing')`. Les fonctions de ce module restent ainsi indépendantes de React.
 */
export type SharingTranslator = (key: string, values?: Record<string, string | number>) => string;

function pick(raw: unknown, ...keys: string[]): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Raw;
  for (const key of keys) {
    if (r[key] !== undefined && r[key] !== null) return r[key];
  }
  return undefined;
}

function toText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

// ------------------------------------------------------------
// Erreurs HTTP
// ------------------------------------------------------------

export function httpStatus(err: unknown): number | null {
  const status = (err as { response?: { status?: unknown } } | undefined)?.response?.status;
  return typeof status === 'number' ? status : null;
}

export function serverMessage(err: unknown): string | null {
  const message = (err as { response?: { data?: { message?: unknown } } } | undefined)?.response?.data
    ?.message;
  if (typeof message === 'string' && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const parts = message.filter((m): m is string => typeof m === 'string' && m.trim() !== '');
    if (parts.length) return parts.join(' ');
  }
  return null;
}

// ------------------------------------------------------------
// Duplication et copie
// ------------------------------------------------------------

export interface CopyWarning {
  /** Position (à partir de 1) de la question dans le quiz d'origine, `null` si inconnue. */
  questionNumber: number | null;
  message: string;
}

export interface QuizCopyResult {
  quizId: string;
  /**
   * Avertissements de la copie (backend #12) : image non copiée (question gardée sans image)
   * ou question invalide non copiée.
   */
  warnings: CopyWarning[];
}

/**
 * Normalise la réponse d'une duplication ou d'une copie. Contrat backend #12 :
 * `{ quiz: { id, … }, warnings: [{ question_number, message }] }`. Tolère aussi le quiz à plat
 * et des avertissements sous forme de chaînes.
 */
export function normalizeQuizCopy(raw: unknown): QuizCopyResult {
  const quiz = pick(raw, 'quiz');
  const id = pick(quiz, 'id') ?? pick(raw, 'id', 'quizId', 'quiz_id');
  if (id === undefined) throw new Error('Réponse inattendue du serveur (identifiant de la copie absent).');
  const list = pick(raw, 'warnings');
  const warnings: CopyWarning[] = Array.isArray(list)
    ? list
        .map((w) => {
          if (typeof w === 'string') return { questionNumber: null, message: w };
          const n = Number(pick(w, 'question_number', 'questionNumber'));
          const message = toText(pick(w, 'message')) ?? toText(pick(w, 'code'));
          return message
            ? { questionNumber: Number.isFinite(n) && n > 0 ? n : null, message }
            : null;
        })
        .filter((w): w is CopyWarning => w !== null)
    : [];
  return { quizId: String(id), warnings };
}

export async function duplicateQuiz(quizId: string): Promise<QuizCopyResult> {
  const { data } = await api.post(`/quizzes/${encodeURIComponent(quizId)}/duplicate`);
  return normalizeQuizCopy(data);
}

export async function copySharedQuiz(token: string): Promise<QuizCopyResult> {
  const { data } = await api.post(`/quizzes/shared/${encodeURIComponent(token)}/copy`);
  return normalizeQuizCopy(data);
}

/** URL de la page d'un quiz copié. */
export function copiedQuizPath({ quizId }: Pick<QuizCopyResult, 'quizId'>): string {
  return `/creator/quiz/${encodeURIComponent(quizId)}`;
}

// Avertissements transmis à la page de la copie (navigation client : mémoire ; rechargement :
// sessionStorage, toujours sous try/catch). Lus une seule fois.
const pendingCopyWarnings = new Map<string, CopyWarning[]>();
const copyWarningsKey = (quizId: string) => `kwizora_copy_warnings:${quizId}`;

export function rememberCopyWarnings({ quizId, warnings }: QuizCopyResult): void {
  if (warnings.length === 0) return;
  pendingCopyWarnings.set(quizId, warnings);
  try {
    window.sessionStorage.setItem(copyWarningsKey(quizId), JSON.stringify(warnings));
  } catch {
    // Stockage indisponible : la mémoire suffit pour la navigation client.
  }
}

export function takeCopyWarnings(quizId: string): CopyWarning[] {
  let warnings = pendingCopyWarnings.get(quizId) ?? null;
  pendingCopyWarnings.delete(quizId);
  try {
    const raw = window.sessionStorage.getItem(copyWarningsKey(quizId));
    window.sessionStorage.removeItem(copyWarningsKey(quizId));
    if (!warnings && raw) warnings = normalizeQuizCopy({ id: quizId, warnings: JSON.parse(raw) }).warnings;
  } catch {
    // idem
  }
  return warnings ?? [];
}

/** Libellé d'un avertissement : « Question 2 : image non copiée (…) ». */
export function copyWarningLabel(w: CopyWarning, t: SharingTranslator): string {
  return w.questionNumber ? t('copyWarningItem', { number: w.questionNumber, message: w.message }) : w.message;
}

export function duplicateErrorMessage(err: unknown, t: SharingTranslator): string {
  switch (httpStatus(err)) {
    case null:
      return t('errors.network');
    case 403:
    case 404:
      return t('errors.duplicateNotFound');
    default:
      return serverMessage(err) ?? t('errors.duplicateFailed');
  }
}

// ------------------------------------------------------------
// Lien de partage
// ------------------------------------------------------------

/** Jeton de partage courant d'un quiz (`share_token` ou `shareToken`), `null` si non partagé. */
export function readShareToken(quiz: unknown): string | null {
  return toText(pick(quiz, 'share_token', 'shareToken'));
}

export function buildShareUrl(token: string, baseUrl: string = getAppBaseUrl()): string {
  return `${baseUrl}/creator/quiz/shared/${encodeURIComponent(token)}`;
}

/** `POST /share` : crée le lien ou le régénère (l'ancien lien cesse alors de fonctionner). */
export async function createShareLink(quizId: string): Promise<string> {
  const { data } = await api.post(`/quizzes/${encodeURIComponent(quizId)}/share`);
  const token = toText(pick(data, 'token', 'shareToken', 'share_token'));
  if (!token) throw new Error('Réponse inattendue du serveur (jeton de partage absent).');
  return token;
}

export async function revokeShareLink(quizId: string): Promise<void> {
  await api.delete(`/quizzes/${encodeURIComponent(quizId)}/share`);
}

// ------------------------------------------------------------
// Aperçu public d'un quiz partagé
// ------------------------------------------------------------

export interface SharedQuestionPreview {
  text: string;
  type: QuestionType;
  /** Options sans indication de bonne réponse (vide pour une réponse courte). */
  options: QuizOption[];
  imageUrl: string | null;
}

export interface SharedQuizPreview {
  title: string;
  description: string | null;
  questionCount: number;
  questions: SharedQuestionPreview[];
  authorPseudo: string | null;
}

/**
 * Normalise l'aperçu public. Les bonnes réponses ne doivent pas être envoyées par le
 * backend ; par précaution, seuls l'énoncé, le type, les options (id, texte) et l'image
 * sont conservés.
 */
export function normalizeSharedPreview(raw: unknown): SharedQuizPreview {
  const source = pick(raw, 'quiz') ?? raw;
  const list = pick(source, 'questions') ?? pick(raw, 'questions');
  const questions: SharedQuestionPreview[] = Array.isArray(list)
    ? list
        .filter((q): q is Raw => !!q && typeof q === 'object')
        .map((q) => {
          const type = normalizeQuestionType(q.type);
          const options = Array.isArray(q.options)
            ? q.options
                .filter((o): o is Raw => !!o && typeof o === 'object')
                .map((o) => ({ id: String(o.id ?? ''), text: String(o.text ?? '') }))
            : [];
          // « Remettre dans l'ordre » : les options sont stockées dans l'ordre attendu ;
          // on les trie pour ne pas révéler la réponse.
          if (type === 'ordering') options.sort((a, b) => a.text.localeCompare(b.text, 'fr'));
          return { text: String(q.text ?? ''), type, options, imageUrl: toText(pick(q, 'image_url', 'imageUrl')) };
        })
    : [];
  const author = pick(source, 'author', 'creator');
  return {
    title: toText(pick(source, 'title')) ?? '',
    description: toText(pick(source, 'description')),
    questionCount:
      toCount(pick(source, 'questionCount', 'question_count', 'total_questions', 'totalQuestions')) ||
      questions.length,
    questions,
    authorPseudo:
      toText(pick(source, 'authorPseudo', 'author_pseudo', 'creatorPseudo', 'creator_pseudo')) ??
      toText(pick(author, 'pseudo')),
  };
}

export async function fetchSharedQuiz(token: string): Promise<SharedQuizPreview> {
  const { data } = await api.get(`/quizzes/shared/${encodeURIComponent(token)}`);
  return normalizeSharedPreview(data);
}

/** Jeton inconnu ou révoqué : 404 (ou 410 si le backend distingue la révocation). */
export function isInvalidShareTokenError(err: unknown): boolean {
  const status = httpStatus(err);
  return status === 404 || status === 410;
}

/** Nombre de questions par type, dans l'ordre d'apparition. */
export function countQuestionTypes(questions: SharedQuestionPreview[]): [QuestionType, number][] {
  const counts = new Map<QuestionType, number>();
  for (const q of questions) counts.set(q.type, (counts.get(q.type) ?? 0) + 1);
  return Array.from(counts.entries());
}

// ------------------------------------------------------------
// Retour après connexion
// ------------------------------------------------------------

export const REDIRECT_PARAM = 'next';

/** Chemin interne sûr (commence par un seul `/`), sinon `null` : évite les redirections ouvertes. */
export function safeRedirectPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  return value;
}

export function loginUrlWithReturn(path: string): string {
  return `/login?${REDIRECT_PARAM}=${encodeURIComponent(path)}`;
}

/** Destination après connexion, lue dans la query string (`?next=/…`). */
export function redirectAfterLogin(search: string, fallback = '/creator/dashboard'): string {
  const params = new URLSearchParams(search);
  return safeRedirectPath(params.get(REDIRECT_PARAM)) ?? fallback;
}

// ------------------------------------------------------------
// Import tableur / Kahoot
// ------------------------------------------------------------

export type FileImportFormat = 'csv' | 'xlsx' | 'kahoot';

/** Taille maximale d'un fichier importé, alignée sur `IMPORT_MAX_FILE_BYTES` du backend (2 Mo). */
export const IMPORT_MAX_BYTES = 2 * 1024 * 1024;

export const IMPORT_TEMPLATE_PATH = '/quizzes/import-template.csv';
export const IMPORT_TEMPLATE_URL = `${API_URL}${HTTP_PREFIX}${IMPORT_TEMPLATE_PATH}`;

function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/**
 * Format d'import d'un fichier selon l'onglet : « Tableur » accepte `.csv` et `.xlsx`,
 * « Kahoot » uniquement `.xlsx` (export Kahoot). Renvoie un message d'erreur sinon.
 */
export function resolveImportFile(
  file: File,
  source: 'spreadsheet' | 'kahoot',
  t: SharingTranslator
): { format: FileImportFormat } | { error: string } {
  const ext = extensionOf(file.name);
  if (source === 'kahoot') {
    if (ext !== 'xlsx') return { error: t('import.errorKahootType') };
  } else if (ext !== 'csv' && ext !== 'xlsx') {
    return { error: t('import.errorType') };
  }
  if (file.size === 0) return { error: t('import.errorEmpty') };
  if (file.size > IMPORT_MAX_BYTES) {
    return { error: t('import.errorSize', { size: formatBytes(file.size, t) }) };
  }
  if (source === 'kahoot') return { format: 'kahoot' };
  return { format: ext === 'csv' ? 'csv' : 'xlsx' };
}

export function formatBytes(bytes: number, t: SharingTranslator): string {
  if (bytes < 1024) return t('import.bytes', { value: bytes });
  if (bytes < 1024 * 1024) return t('import.kilobytes', { value: Math.round(bytes / 1024) });
  return t('import.megabytes', { value: Math.round((bytes / (1024 * 1024)) * 10) / 10 });
}

export interface ImportRowError {
  /** Numéro de ligne du fichier (ou `null` si l'erreur concerne le fichier entier). */
  row: number | null;
  message: string;
}

export interface ImportReport {
  /** Questions valides (celles qui sont ou seraient importées). */
  valid: number;
  /** Questions réellement enregistrées (0 en dryRun). */
  imported: number;
  errors: ImportRowError[];
}

/** « 3 questions seront importées, 2 lignes ignorées. » */
export function importSummary(report: Pick<ImportReport, 'valid' | 'errors'>, t: SharingTranslator): string {
  return t('import.summary', { valid: report.valid, ignored: report.errors.length });
}

export function normalizeImportReport(raw: unknown): ImportReport {
  const errors = pick(raw, 'errors');
  const imported = toCount(pick(raw, 'imported'));
  const valid = pick(raw, 'valid');
  return {
    valid: valid !== undefined ? toCount(valid) : imported,
    imported,
    errors: Array.isArray(errors)
      ? errors.map((e) => {
          if (typeof e === 'string') return { row: null, message: e };
          const row = Number(pick(e, 'row', 'line'));
          return {
            row: Number.isFinite(row) && row > 0 ? row : null,
            message: String(pick(e, 'message') ?? 'Ligne invalide'),
          };
        })
      : [],
  };
}

export async function importQuizFile(
  quizId: string,
  file: File,
  format: FileImportFormat,
  dryRun: boolean
): Promise<ImportReport> {
  const form = new FormData();
  form.append('file', file, file.name);
  const { data } = await api.post(`/quizzes/${encodeURIComponent(quizId)}/import`, form, {
    params: { format, dryRun },
    // Sans cela, axios convertirait le FormData en JSON (Content-Type par défaut de l'instance).
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return normalizeImportReport(data);
}

export function importErrorMessage(err: unknown, t: SharingTranslator): string {
  switch (httpStatus(err)) {
    case null:
      return t('errors.network');
    case 413:
      return t('import.errorTooLarge');
    case 415:
      return t('import.errorUnsupported');
    default:
      return serverMessage(err) ?? t('import.errorGeneric');
  }
}

/** Télécharge le modèle CSV (via l'instance axios, pour envoyer le jeton si nécessaire). */
export async function downloadImportTemplate(): Promise<void> {
  const { data } = await api.get(IMPORT_TEMPLATE_PATH, { responseType: 'blob' });
  const blob = data instanceof Blob ? data : new Blob([String(data)], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'modele-import-kwizora.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

// ------------------------------------------------------------
// Quiz brouillon créé pour l'aperçu d'un import
// ------------------------------------------------------------

/** Supprime (au mieux) un quiz créé uniquement pour l'aperçu d'un import. */
export async function deleteDraftQuiz(quizId: string): Promise<void> {
  try {
    await api.delete(`/quizzes/${encodeURIComponent(quizId)}`);
  } catch {
    // Au mieux : un échec laisse un quiz vide, que l'enseignant peut supprimer lui-même.
  }
}

/**
 * Variante pour la fermeture de l'onglet (`pagehide`) : `fetch` avec `keepalive`, qui survit
 * au déchargement de la page, sans boîte de dialogue.
 */
export function deleteDraftQuizOnPageHide(quizId: string, token: string | null): void {
  try {
    void fetch(`${API_URL}${HTTP_PREFIX}/quizzes/${encodeURIComponent(quizId)}`, {
      method: 'DELETE',
      keepalive: true,
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }).catch(() => undefined);
  } catch {
    // idem
  }
}
