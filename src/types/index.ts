// ============================================================
// Types globaux partagés (copiés du backend)
// ============================================================

export interface QuizOption {
    id: string; // 'A', 'B', 'C', 'D'
    text: string;
  }
  
  export interface Question {
    id: string;
    quiz_id: string;
    text: string;
    /** Voir `QuestionType` (backend #7) : `single`, `multiple`, `true_false`, `ordering`, `short_answer`, `poll`. */
    type: QuestionType;
    /** Vide pour `short_answer`. Pour `ordering`, envoyées **mélangées** aux joueurs. */
    options: QuizOption[];
    /** Sémantique par type : voir `QuestionType`. */
    correct_answers: string[];
    max_points: number;
    timer_seconds: number;
    order_index: number;
    created_at: string;
    /** Explication affichée aux joueurs après la clôture (facultative, 500 caractères max). */
    explanation?: string | null;
    /** URL publique de l'image d'illustration (bucket `question-images`), ou null. */
    image_url?: string | null;
  }
  
  export interface Quiz {
    id: string;
    creator_id: string;
    title: string;
    description?: string;
    global_timer_seconds: number;
    use_global_timer: boolean;
    total_questions: number;
    created_at: string;
    updated_at: string;
    questions?: Question[];
  }
  
  export interface Session {
    id: string;
    quiz_id: string;
    creator_id: string;
    password: string;
    status: 'waiting' | 'active' | 'paused' | 'finished';
    current_question_index: number;
    question_start_time?: string;
    started_at?: string;
    ended_at?: string;
    created_at: string;
    quiz_title?: string;
    total_questions?: number;
    /** Jointure renvoyée par GET /api/sessions et GET /api/sessions/:id. */
    quizzes?: { id?: string; title?: string | null; total_questions?: number } | null;
    /** Mode des pseudos : libres (filtrés côté serveur) ou générés (roulette). Défaut : "free". */
    nickname_mode?: 'free' | 'generated';
    /** Mode de score (backend #8). Absent sur un ancien backend : "speed". */
    scoring_mode?: 'speed' | 'accuracy';
    /** Classement visible par les élèves (backend #8). Absent : visible. */
    show_leaderboard?: boolean;
    /** `live` (défaut) ou `async` (devoir à faire à son rythme, backend #10). */
    mode?: SessionMode;
    /** Échéance d'un devoir (ISO 8601), `null` pour une session en direct. */
    due_at?: string | null;
    /** Devoir : correction après chaque question (`each`) ou à la fin (`end`). */
    show_explanations?: ExplanationTiming;
    /** Devoir : participants ayant terminé (si le backend le fournit). */
    completed_count?: number;
    /** Devoir : participants ayant commencé (si le backend le fournit). */
    participant_count?: number;
  }
  
  export interface Participant {
    id: string;
    session_id: string;
    pseudo: string;
    score: number;
    status: 'waiting' | 'answering' | 'answered' | 'timeout' | 'disconnected';
    socket_id?: string;
    joined_at: string;
  }
  
  export interface ParticipantAnswer {
    id: string;
    participant_id: string;
    session_id: string;
    question_id: string;
    answers: string[];
    time_taken_ms?: number;
    points_earned: number;
    is_correct: boolean;
    status: 'answered' | 'timeout' | 'skipped';
    answered_at: string;
  }
  
  export interface LeaderboardEntry {
    rank: number;
    participant_id: string;
    pseudo: string;
    score: number;
    last_points: number;
    answered_current: boolean;
    gap_to_next: number | null;
    gap_to_podium: number | null;
    on_podium: boolean;
  }
  
  export interface WsQuestionCountdownPayload {
    countdown: number;
    message: string;
  }
  
  export interface WsQuestionStartPayload {
    /** Ni la bonne réponse ni l'explication ne sont envoyées avant la clôture. */
    question: Omit<Question, 'correct_answers' | 'explanation'>;
    question_number: number;
    total_questions: number;
    timer_seconds: number;
    started_at: number;
  }
  
  export interface WsQuestionEndPayload {
    question_id: string;
    correct_answers: string[];
    leaderboard: LeaderboardEntry[];
  }
  
  export interface WsAnswerResultPayload {
    is_correct: boolean;
    points_earned: number;
    max_points: number;
    time_taken_ms: number;
    correct_answers: string[];
    your_answer: string[];
    total_score: number;
    rank: number;
    total_participants: number;
    gap_to_next: number | null;
    gap_to_podium: number | null;
    on_podium: boolean;
    waiting_for_timer: boolean;
  }
  
  export interface WsLeaderboardUpdatePayload {
    leaderboard: LeaderboardEntry[];
    question_number: number;
    total_questions: number;
  }
  
  export interface WsQuizFinishedPayload {
    final_leaderboard: LeaderboardEntry[];
    your_rank: number;
    your_score: number;
    is_winner: boolean;
    winner_pseudo: string | null;
    total_participants: number;
    total_questions: number;
    message: string;
  }
  
  export interface WsParticipantJoinedPayload {
    participant: Participant;
    total_participants: number;
  }
  
  // Payloads entrants client -> serveur
  export interface WsJoinSessionPayload {
    sessionId: string;
    participantId: string;
    role: 'creator' | 'participant';
  }
  
  export interface WsCreatorJoinPayload {
    sessionId: string;
    token: string;
  }
  
  export interface WsStartQuestionPayload {
    sessionId: string;
    questionIndex: number;
  }
  
  export interface WsSubmitAnswerPayload {
    sessionId: string;
    participantId: string;
    questionId: string;
    answers: string[];
    timeTakenMs: number;
  }
  
  export interface WsEndQuizPayload {
    sessionId: string;
  }
  
  export interface WsParticipantProgressPayload {
    participant_id: string;
    pseudo: string;
    answered_count: number;
    total_count: number;
    questions_answered: number;
    total_questions: number;
    progress_percentage: number;
  }
// ------------------------------------------------------------
// Statistiques et correction de fin de question
// (contrat backend : boris913/quizmaster-backend#6)
// Tout écart avec le backend se corrige ici et dans les normaliseurs ci-dessous.
// ------------------------------------------------------------

/** `question:stats`, envoyé à la room créateur à la clôture de la question. Jamais nominatif. */
export interface WsQuestionStatsPayload {
  questionId: string;
  /** Type de la question (backend #7), absent sur un ancien backend. */
  type?: string | null;
  /** `false` pour un sondage (pas de réussite à afficher), absent sur un ancien backend. */
  graded?: boolean | null;
  /** Nombre de participants ayant coché chaque option (toutes les options, 0 par défaut). */
  distribution: Record<string, number>;
  correctAnswers: string[];
  /** Pourcentage entier (0-100) de bonnes réponses parmi `totalParticipants`. */
  accuracy: number;
  answeredCount: number;
  totalParticipants: number;
}

/** `question:reveal`, envoyé à chaque joueur à la clôture de la question. */
export interface WsQuestionRevealPayload {
  questionId: string;
  /** Type de la question (backend #7), absent sur un ancien backend. */
  type?: string | null;
  /** `false` pour un sondage, absent sur un ancien backend. */
  graded?: boolean | null;
  correctAnswers: string[];
  explanation: string | null;
  yourAnswers: string[];
  isCorrect: boolean;
}

/** Longueur maximale de l'explication d'une question (alignée sur le DTO backend). */
export const QUESTION_EXPLANATION_MAX_LENGTH = 500;

/** Borne `accuracy` (pourcentage entier envoyé par le backend) dans 0..100. */
export function accuracyToPercent(accuracy: number | null | undefined): number {
  const value = Number(accuracy);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value));
}

type RawPayload = Record<string, unknown> | null | undefined;

function pick(raw: RawPayload, camel: string, snake: string): unknown {
  if (!raw || typeof raw !== 'object') return undefined;
  return raw[camel] !== undefined ? raw[camel] : raw[snake];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

function toCount(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Lit un `question:stats` reçu du serveur. Tolère la variante snake_case (convention des
 * autres événements) pour qu'un écart de nommage ne casse pas l'affichage.
 */
export function normalizeQuestionStats(raw: unknown): WsQuestionStatsPayload | null {
  const data = raw as RawPayload;
  const questionId = pick(data, 'questionId', 'question_id');
  if (questionId === undefined || questionId === null) return null;
  const rawDistribution = pick(data, 'distribution', 'distribution');
  const distribution: Record<string, number> = {};
  if (rawDistribution && typeof rawDistribution === 'object') {
    Object.entries(rawDistribution as Record<string, unknown>).forEach(([id, n]) => {
      distribution[id] = toCount(n);
    });
  }
  const type = pick(data, 'type', 'type');
  const graded = pick(data, 'graded', 'graded');
  return {
    questionId: String(questionId),
    // Champs du backend #7, omis s'ils sont absents (ancien backend).
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof graded === 'boolean' ? { graded } : {}),
    distribution,
    correctAnswers: toStringArray(pick(data, 'correctAnswers', 'correct_answers')),
    accuracy: Number(pick(data, 'accuracy', 'accuracy')) || 0,
    answeredCount: toCount(pick(data, 'answeredCount', 'answered_count')),
    totalParticipants: toCount(pick(data, 'totalParticipants', 'total_participants')),
  };
}

/** Lit un `question:reveal` reçu du serveur (même tolérance que `normalizeQuestionStats`). */
export function normalizeQuestionReveal(raw: unknown): WsQuestionRevealPayload | null {
  const data = raw as RawPayload;
  const questionId = pick(data, 'questionId', 'question_id');
  if (questionId === undefined || questionId === null) return null;
  const explanation = pick(data, 'explanation', 'explanation');
  const type = pick(data, 'type', 'type');
  const graded = pick(data, 'graded', 'graded');
  return {
    questionId: String(questionId),
    // Champs du backend #7, omis s'ils sont absents (ancien backend).
    ...(typeof type === 'string' ? { type } : {}),
    ...(typeof graded === 'boolean' ? { graded } : {}),
    correctAnswers: toStringArray(pick(data, 'correctAnswers', 'correct_answers')),
    explanation: typeof explanation === 'string' && explanation.trim() ? explanation.trim() : null,
    yourAnswers: toStringArray(pick(data, 'yourAnswers', 'your_answers')),
    isCorrect: Boolean(pick(data, 'isCorrect', 'is_correct')),
  };
}

// ============================================================
// Rapport de session (GET /api/sessions/:id/results)
// Contrat : quizmaster-backend src/session/results/session-results.ts
// ============================================================

export interface SessionResultsQuestion {
  questionId: string;
  orderIndex: number;
  text: string;
  /** 'single' | 'multiple' | 'poll'… : une question `poll` n'est pas notée (accuracy vaut 0). */
  type: string;
  /** 0..1 ; toujours 0 pour une question non notée, ne pas l'afficher comme un score. */
  accuracy: number;
  avgTimeMs: number;
  /** Nombre de participants ayant coché chaque option (toutes les options présentes). */
  answerDistribution: Record<string, number>;
  correctAnswers: string[];
}

export interface SessionResultsParticipant {
  participantId: string;
  pseudo: string;
  score: number;
  /** 0..1, calculée sur les seules questions notées (timeouts comptés faux). */
  accuracy: number;
  answered: number;
  timeouts: number;
  avgTimeMs: number;
}

export interface SessionResults {
  session: {
    id: string;
    quizTitle: string;
    status: string;
    startedAt: string | null;
    endedAt: string | null;
    participantCount: number;
  };
  /** Ratios 0..1 ; `avgScore` en points. */
  summary: { accuracy: number; avgScore: number; completionRate: number };
  perQuestion: SessionResultsQuestion[];
  /** Trié par score décroissant côté backend. */
  perParticipant: SessionResultsParticipant[];
}

// ============================================================
// Modes de score et classement masqué
// (contrat backend : boris913/quizmaster-backend#8)
// Tout écart avec le backend se corrige ici et dans les normaliseurs ci-dessous.
// ============================================================

/** `speed` (défaut) : points dégressifs avec le temps. `accuracy` : toute bonne réponse vaut le maximum. */
export type ScoringMode = 'speed' | 'accuracy';

/** Réglages envoyés à `POST /api/sessions` (en plus de `quiz_id` et `nicknameMode`). */
export interface SessionScoringOptions {
  scoringMode: ScoringMode;
  /** `false` : aucun classement ni rang n'est montré aux élèves (le créateur voit tout). */
  showLeaderboard: boolean;
}

/** Vrai si la session masque le classement aux élèves. Champ absent (ancien backend) : visible. */
export function isLeaderboardHidden(session: { show_leaderboard?: boolean | null } | null | undefined): boolean {
  return session?.show_leaderboard === false;
}

/** Mode de score de la session, `speed` si absent ou inconnu. */
export function getScoringMode(session: { scoring_mode?: string | null } | null | undefined): ScoringMode {
  return session?.scoring_mode === 'accuracy' ? 'accuracy' : 'speed';
}

/** `player:score`, envoyé à chaque joueur à la clôture de chaque question quand le classement est masqué. */
export interface WsPlayerScorePayload {
  /** Score total du joueur. */
  score: number;
  /** Nombre de bonnes réponses du joueur sur les questions jouées. */
  correctCount: number;
  /** Précision de la classe, pourcentage entier 0-100. */
  classAccuracy: number;
}

/** `quiz:finished` côté joueur quand le classement est masqué (remplace le podium). */
export interface WsHiddenQuizFinishedPayload {
  classAccuracy: number;
  yourScore: number;
}

/**
 * `answer:result` tel que consommé par l'écran joueur. Quand le classement est masqué, le
 * backend n'envoie ni rang, ni écarts, ni podium : ces champs valent alors `null` / `false`.
 */
export interface PlayerAnswerResult {
  is_correct: boolean;
  points_earned: number;
  max_points: number;
  time_taken_ms: number;
  correct_answers: string[];
  your_answer: string[];
  total_score: number;
  /** Rang (>= 1) ou `null` si absent (classement masqué). */
  rank: number | null;
  total_participants: number | null;
  gap_to_next: number | null;
  gap_to_podium: number | null;
  on_podium: boolean;
  waiting_for_timer: boolean;
}

/** `quiz:finished` côté joueur, sous ses deux formes. */
export type PlayerQuizFinished =
  | {
      kind: 'leaderboard';
      finalLeaderboard: LeaderboardEntry[];
      yourRank: number | null;
      yourScore: number;
      totalParticipants: number | null;
      message: string;
    }
  | { kind: 'hidden'; classAccuracy: number; yourScore: number };

function toFiniteOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toPositiveIntOrNull(value: unknown): number | null {
  const n = toFiniteOrNull(value);
  return n !== null && n >= 1 ? Math.round(n) : null;
}

/** Lit un `answer:result` ; tolère l'absence de `rank` / `gap_to_*` / `on_podium` (classement masqué). */
export function normalizeAnswerResult(raw: unknown): PlayerAnswerResult | null {
  const data = raw as RawPayload;
  if (!data || typeof data !== 'object') return null;
  return {
    is_correct: Boolean(pick(data, 'isCorrect', 'is_correct')),
    points_earned: toCount(pick(data, 'pointsEarned', 'points_earned')),
    max_points: toCount(pick(data, 'maxPoints', 'max_points')),
    time_taken_ms: toCount(pick(data, 'timeTakenMs', 'time_taken_ms')),
    correct_answers: toStringArray(pick(data, 'correctAnswers', 'correct_answers')),
    your_answer: toStringArray(pick(data, 'yourAnswer', 'your_answer')),
    total_score: toCount(pick(data, 'totalScore', 'total_score')),
    rank: toPositiveIntOrNull(pick(data, 'rank', 'rank')),
    total_participants: toPositiveIntOrNull(pick(data, 'totalParticipants', 'total_participants')),
    gap_to_next: toFiniteOrNull(pick(data, 'gapToNext', 'gap_to_next')),
    gap_to_podium: toFiniteOrNull(pick(data, 'gapToPodium', 'gap_to_podium')),
    on_podium: pick(data, 'onPodium', 'on_podium') === true,
    waiting_for_timer: Boolean(pick(data, 'waitingForTimer', 'waiting_for_timer')),
  };
}

/** Lit un `player:score` (tolère la variante snake_case). */
export function normalizePlayerScore(raw: unknown): WsPlayerScorePayload | null {
  const data = raw as RawPayload;
  if (!data || typeof data !== 'object') return null;
  const classAccuracy = pick(data, 'classAccuracy', 'class_accuracy');
  const score = pick(data, 'score', 'score');
  if (classAccuracy === undefined && score === undefined) return null;
  return {
    score: toCount(score),
    correctCount: toCount(pick(data, 'correctCount', 'correct_count')),
    classAccuracy: accuracyToPercent(classAccuracy as number),
  };
}

/**
 * Lit un `quiz:finished` reçu par un joueur. Forme masquée (`{ classAccuracy, yourScore }`,
 * sans `final_leaderboard`) ou forme habituelle avec classement.
 */
export function normalizePlayerQuizFinished(raw: unknown): PlayerQuizFinished {
  const data = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const leaderboard = pick(data, 'finalLeaderboard', 'final_leaderboard');
  const classAccuracy = pick(data, 'classAccuracy', 'class_accuracy');
  if (!Array.isArray(leaderboard) && classAccuracy !== undefined) {
    return {
      kind: 'hidden',
      classAccuracy: accuracyToPercent(classAccuracy as number),
      yourScore: toCount(pick(data, 'yourScore', 'your_score')),
    };
  }
  const message = pick(data, 'message', 'message');
  return {
    kind: 'leaderboard',
    finalLeaderboard: Array.isArray(leaderboard) ? (leaderboard as LeaderboardEntry[]) : [],
    yourRank: toPositiveIntOrNull(pick(data, 'yourRank', 'your_rank')),
    yourScore: toCount(pick(data, 'yourScore', 'your_score')),
    totalParticipants: toPositiveIntOrNull(pick(data, 'totalParticipants', 'total_participants')),
    message: typeof message === 'string' ? message : '',
  };
}

/**
 * Précision de la classe (0-100) cumulée sur les questions clôturées, à partir des
 * `question:stats` : bonnes réponses / réponses attendues (une par participant présent).
 * Même définition que `classAccuracy` côté backend. `null` sans aucune donnée.
 */
export function cumulativeClassAccuracy(
  stats: Pick<WsQuestionStatsPayload, 'accuracy' | 'totalParticipants'>[]
): number | null {
  let correct = 0;
  let expected = 0;
  stats.forEach((s) => {
    const total = toCount(s.totalParticipants);
    if (total === 0) return;
    correct += (accuracyToPercent(s.accuracy) / 100) * total;
    expected += total;
  });
  if (expected === 0) return null;
  return Math.round((correct / expected) * 100);
}

// ============================================================
// Types de questions et images
// (contrat backend : boris913/quizmaster-backend#7)
// Tout écart avec le backend se corrige ici et dans les normaliseurs ci-dessous.
// ============================================================

/**
 * Types de question et sémantique de `correct_answers` :
 * - `single` / `multiple` : ids des bonnes options ;
 * - `true_false` : `['true']` ou `['false']` (options fixes `TRUE_FALSE_OPTIONS`) ;
 * - `ordering` : ids des options dans l'ordre attendu (≥ 3 options, envoyées mélangées aux joueurs) ;
 * - `short_answer` : variantes acceptées (aucune option ; comparaison normalisée côté serveur) ;
 * - `poll` : `[]` (sondage : jamais juste, 0 point, exclu des précisions).
 */
export const QUESTION_TYPES = ['single', 'multiple', 'true_false', 'ordering', 'short_answer', 'poll'] as const;
export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Réponse unique',
  multiple: 'Réponses multiples',
  true_false: 'Vrai / Faux',
  ordering: 'Remettre dans l’ordre',
  short_answer: 'Réponse courte',
  poll: 'Sondage',
};

/** Types sans bonne réponse : aucun score ni pourcentage de réussite ne doit être affiché. */
export const UNGRADED_QUESTION_TYPES: readonly string[] = ['poll'];

/** Options fixes d'une question Vrai/Faux : `correct_answers` vaut `['true']` ou `['false']`. */
export const TRUE_FALSE_OPTIONS: QuizOption[] = [
  { id: 'true', text: 'Vrai' },
  { id: 'false', text: 'Faux' },
];

/**
 * Identifiants d'options acceptés par le DTO backend : A-D pour `single`/`multiple`,
 * A-F pour `ordering`/`poll` (`CHOICE_OPTION_IDS` / `EXTENDED_OPTION_IDS` côté serveur).
 */
export const QUESTION_OPTION_IDS = ['A', 'B', 'C', 'D', 'E', 'F'] as const;

/** Nombre maximal d'options par type (validation DTO backend). */
export const QUESTION_MAX_OPTIONS: Record<QuestionType, number> = {
  single: 4,
  multiple: 4,
  true_false: 2,
  ordering: 6,
  short_answer: 0,
  poll: 6,
};

/** Ids d'option autorisés pour un type (préfixe de `QUESTION_OPTION_IDS`). */
export function allowedOptionIds(type: QuestionType): readonly string[] {
  return QUESTION_OPTION_IDS.slice(0, QUESTION_MAX_OPTIONS[type]);
}

/** Nombre minimal d'options par type (validation DTO backend). */
export const QUESTION_MIN_OPTIONS: Record<QuestionType, number> = {
  single: 2,
  multiple: 2,
  true_false: 2,
  ordering: 3,
  short_answer: 0,
  poll: 2,
};

/** Longueur maximale de la réponse courte saisie par un joueur. */
export const SHORT_ANSWER_MAX_LENGTH = 200;
/** Longueur maximale d'une variante acceptée, et nombre maximal de variantes (DTO backend). */
export const SHORT_ANSWER_VARIANT_MAX_LENGTH = 100;
export const SHORT_ANSWER_MAX_VARIANTS = 20;

export function isQuestionType(value: unknown): value is QuestionType {
  return typeof value === 'string' && (QUESTION_TYPES as readonly string[]).includes(value);
}

/** Type lu depuis le serveur ; un type inconnu (ou absent) retombe sur `single`. */
export function normalizeQuestionType(value: unknown): QuestionType {
  return isQuestionType(value) ? value : 'single';
}

export function isGradedQuestionType(type: unknown): boolean {
  return !UNGRADED_QUESTION_TYPES.includes(String(type));
}

/** Vrai si le type se joue avec des options cliquables (tout sauf `short_answer`). */
export function questionTypeHasOptions(type: QuestionType): boolean {
  return type !== 'short_answer';
}

/**
 * Type d'une question quand l'appelant ne le transmet pas (composants réutilisés ailleurs,
 * ex. mode devoir) : `true_false` si les options sont `true`/`false`, `short_answer` sans
 * option, `poll` si la correction ne contient aucune bonne réponse. `ordering` ne se
 * devine pas : il faut passer le type explicitement.
 */
export function inferQuestionType(input: {
  type?: unknown;
  options?: { id: string }[] | null;
  correctAnswers?: string[] | null;
}): QuestionType | null {
  if (isQuestionType(input.type)) return input.type;
  const ids = (input.options ?? []).map((o) => o.id);
  if (ids.length === 2 && ids.includes('true') && ids.includes('false')) return 'true_false';
  if (input.options && input.options.length === 0) return 'short_answer';
  if (input.correctAnswers && input.correctAnswers.length === 0) return 'poll';
  return null;
}

/** Options Vrai/Faux à afficher : celles du serveur si elles ont la bonne forme, sinon les options fixes. */
export function trueFalseOptions(options: QuizOption[] | null | undefined): QuizOption[] {
  if (Array.isArray(options) && options.length === 2) {
    return options.map((o) => ({
      id: o.id,
      text: o.text || (o.id === 'false' ? 'Faux' : 'Vrai'),
    }));
  }
  return TRUE_FALSE_OPTIONS;
}

/** Libellé d'une réponse (id d'option, `true`/`false` ou texte libre) pour l'affichage. */
export function answerLabel(id: string, options: QuizOption[] | null | undefined): string {
  const text = options?.find((o) => o.id === id)?.text;
  if (text) return text;
  if (id === 'true') return 'Vrai';
  if (id === 'false') return 'Faux';
  return id;
}

/**
 * Normalisation d'une réponse courte, alignée sur `checkAnswer` côté serveur : casse, accents,
 * espaces multiples et ponctuation finale. Sert uniquement à l'affichage (regroupements) :
 * la correction fait foi côté serveur.
 */
export function normalizeShortAnswer(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[‘’ʼ`´]/g, "'")
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s.!?;:,…]+$/, '')
    .trim();
}

/** Question reçue par un joueur : type connu, options en tableau, image `string | null`. */
export function normalizePlayerQuestion<T extends { type?: unknown; options?: unknown; image_url?: unknown }>(
  question: T
): Omit<T, 'type' | 'options' | 'image_url'> & {
  type: QuestionType;
  options: QuizOption[];
  image_url: string | null;
} {
  const type = normalizeQuestionType(question.type);
  const raw = Array.isArray(question.options) ? (question.options as QuizOption[]) : [];
  const imageUrl = pick(question as unknown as RawPayload, 'imageUrl', 'image_url');
  return {
    ...question,
    type,
    options: type === 'true_false' ? trueFalseOptions(raw) : raw,
    image_url: typeof imageUrl === 'string' && imageUrl.trim() ? imageUrl.trim() : null,
  };
}

// ------------------------------------------------------------
// Création de question : brouillon de formulaire -> payload API
// ------------------------------------------------------------

/** Question telle qu'envoyée à `POST /api/quizzes` et `POST /api/quizzes/:id/questions`. */
export interface QuestionPayload {
  text: string;
  type: QuestionType;
  options: QuizOption[];
  correct_answers: string[];
  max_points: number;
  timer_seconds?: number;
  explanation?: string;
  image_url?: string;
}

/** État d'une question dans l'éditeur (les champs non pertinents pour le type sont ignorés). */
export interface QuestionDraft {
  text: string;
  type: QuestionType;
  options: QuizOption[];
  /** Ids cochés (`single`/`multiple`), `['true'|'false']`, ou variantes (`short_answer`). */
  correct_answers: string[];
  max_points: number;
  timer_seconds?: number;
  explanation?: string;
  image_url?: string | null;
}

export interface QuestionDraftIssue {
  path: 'options' | 'correct_answers';
  message: string;
}

function cleanVariants(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  values.forEach((v) => {
    const trimmed = String(v ?? '').trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    out.push(trimmed);
  });
  return out;
}

/** Règles de validation par type, alignées sur le DTO backend. */
export function validateQuestionDraft(draft: QuestionDraft): QuestionDraftIssue[] {
  const issues: QuestionDraftIssue[] = [];
  const options = draft.options ?? [];
  const filled = options.filter((o) => o.text?.trim());
  switch (draft.type) {
    case 'true_false':
      if (!['true', 'false'].includes(draft.correct_answers?.[0])) {
        issues.push({ path: 'correct_answers', message: 'Choisissez Vrai ou Faux' });
      }
      break;
    case 'short_answer': {
      const variants = cleanVariants(draft.correct_answers ?? []);
      if (variants.length === 0) {
        issues.push({ path: 'correct_answers', message: 'Au moins une réponse acceptée' });
      } else if (variants.length > SHORT_ANSWER_MAX_VARIANTS) {
        issues.push({ path: 'correct_answers', message: `${SHORT_ANSWER_MAX_VARIANTS} réponses acceptées au plus` });
      } else if (variants.some((v) => v.length > SHORT_ANSWER_VARIANT_MAX_LENGTH)) {
        issues.push({
          path: 'correct_answers',
          message: `${SHORT_ANSWER_VARIANT_MAX_LENGTH} caractères au plus par réponse acceptée`,
        });
      }
      break;
    }
    default: {
      const min = QUESTION_MIN_OPTIONS[draft.type];
      const allowed = allowedOptionIds(draft.type);
      if (options.length < min || filled.length !== options.length) {
        issues.push({ path: 'options', message: `Au moins ${min} options, toutes renseignées` });
      } else if (options.length > allowed.length || options.some((o) => !allowed.includes(o.id))) {
        issues.push({ path: 'options', message: `${allowed.length} options au plus` });
      }
      if (
        (draft.type === 'single' || draft.type === 'multiple') &&
        !(draft.correct_answers ?? []).some((id) => options.some((o) => o.id === id))
      ) {
        issues.push({ path: 'correct_answers', message: 'Au moins une bonne réponse' });
      }
    }
  }
  return issues;
}

/** Construit le payload envoyé au backend selon le type (sémantique de `correct_answers`). */
export function toQuestionPayload(draft: QuestionDraft): QuestionPayload {
  const base = {
    text: draft.text.trim(),
    type: draft.type,
    max_points: draft.max_points,
    ...(typeof draft.timer_seconds === 'number' && Number.isFinite(draft.timer_seconds)
      ? { timer_seconds: draft.timer_seconds }
      : {}),
    ...(draft.explanation && draft.explanation.trim() ? { explanation: draft.explanation.trim() } : {}),
    ...(draft.image_url && draft.image_url.trim() ? { image_url: draft.image_url.trim() } : {}),
  };
  const options = (draft.options ?? []).map((o) => ({ id: o.id, text: (o.text ?? '').trim() }));
  const correct = draft.correct_answers ?? [];
  switch (draft.type) {
    case 'true_false':
      return { ...base, options: TRUE_FALSE_OPTIONS, correct_answers: [correct[0] === 'false' ? 'false' : 'true'] };
    case 'ordering':
      return { ...base, options, correct_answers: options.map((o) => o.id) };
    case 'short_answer':
      return { ...base, options: [], correct_answers: cleanVariants(correct) };
    case 'poll':
      return { ...base, options, correct_answers: [] };
    case 'single': {
      const first = correct.find((id) => options.some((o) => o.id === id));
      return { ...base, options, correct_answers: first ? [first] : [] };
    }
    default:
      return {
        ...base,
        options,
        correct_answers: options.filter((o) => correct.includes(o.id)).map((o) => o.id),
      };
  }
}

// ------------------------------------------------------------
// Images de question : URL signée d'upload
// POST /api/quizzes/:id/questions/image-upload-url
// ------------------------------------------------------------

/** Taille maximale d'une image de question (contrôlée aussi côté serveur). */
export const QUESTION_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const QUESTION_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/** Corps de la demande d'URL signée. */
export interface ImageUploadUrlRequest {
  content_type: string;
  size: number;
}

/** Réponse normalisée : URL où envoyer le fichier (PUT) et URL publique à enregistrer dans `image_url`. */
export interface ImageUploadUrl {
  uploadUrl: string;
  publicUrl: string;
  path: string | null;
  token: string | null;
}

export function buildImageUploadUrlRequest(file: { type: string; size: number }): ImageUploadUrlRequest {
  return { content_type: file.type, size: file.size };
}

/**
 * Lit la réponse de l'endpoint d'URL signée. Tolère camelCase / snake_case et les noms
 * de `createSignedUploadUrl` de Supabase (`signedUrl`).
 */
export function normalizeImageUploadUrl(raw: unknown): ImageUploadUrl | null {
  const data = raw as RawPayload;
  if (!data || typeof data !== 'object') return null;
  const str = (...keys: string[]) => {
    for (const key of keys) {
      const value = data[key];
      if (typeof value === 'string' && value) return value;
    }
    return null;
  };
  const uploadUrl = str('uploadUrl', 'upload_url', 'signedUrl', 'signed_url', 'signedUploadUrl', 'signed_upload_url');
  const publicUrl = str('publicUrl', 'public_url', 'imageUrl', 'image_url');
  if (!uploadUrl || !publicUrl) return null;
  return { uploadUrl, publicUrl, path: str('path'), token: str('token') };
}

/** Contrôle client du type et de la taille d'une image ; renvoie un message d'erreur ou null. */
export function validateQuestionImageFile(file: { type: string; size: number }): string | null {
  if (!(QUESTION_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
    return 'Format non accepté : PNG, JPEG, WebP ou GIF uniquement.';
  }
  if (file.size > QUESTION_IMAGE_MAX_BYTES) {
    return 'Image trop lourde : 2 Mo maximum.';
  }
  return null;
}

// ============================================================
// Mode devoir (sessions asynchrones)
// (contrat backend : boris913/quizmaster-backend#10)
// Tout écart avec le backend se corrige ici et dans src/lib/assignments.ts.
// ============================================================

export type SessionMode = 'live' | 'async';

/** Moment où l'élève voit la correction et l'explication : après chaque question ou à la fin. */
export type ExplanationTiming = 'each' | 'end';

/** Réglages d'un devoir envoyés à `POST /api/sessions` avec `mode: 'async'`. */
export interface AssignmentOptions {
  /** Échéance ISO 8601 (au moins maintenant + 15 min côté interface). */
  dueAt: string;
  scoringMode: ScoringMode;
  showExplanations: ExplanationTiming;
}

/** `POST /api/assignments/:code/start` */
export interface AssignmentStartResponse {
  participantId: string;
  resumeToken: string;
}

/** Question envoyée à l'élève : ni bonne réponse ni explication. */
export type AssignmentQuestion = Omit<Question, 'correct_answers' | 'explanation'>;

/** Correction d'une question (après la réponse en mode `each`, à la fin en mode `end`). */
export interface AssignmentReviewItem {
  questionId: string;
  text: string;
  /** Type de la question (#7) ; `null` si le backend ne le transmet pas. */
  type: string | null;
  options: QuizOption[];
  yourAnswers: string[];
  correctAnswers: string[];
  isCorrect: boolean;
  explanation: string | null;
}

export interface AssignmentSummary {
  score: number;
  correctCount: number | null;
  totalQuestions: number | null;
  /** Correction complète, fournie à la fin quand `show_explanations = 'end'`. */
  review: AssignmentReviewItem[];
}

/** `GET /api/assignments/:code/next` normalisé. */
export type AssignmentNext =
  | {
      done: false;
      question: AssignmentQuestion;
      questionNumber: number;
      totalQuestions: number;
      timerSeconds: number;
      dueAt: string | null;
    }
  | { done: true; summary: AssignmentSummary; dueAt: string | null };

/** `POST /api/assignments/:code/answer` normalisé. */
export interface AssignmentAnswerResult {
  /** `null` si le backend ne renvoie pas le verdict (correction différée). */
  isCorrect: boolean | null;
  pointsEarned: number;
  maxPoints: number;
  timeTakenMs: number;
  /** Vide quand la correction est différée à la fin. */
  correctAnswers: string[];
  explanation: string | null;
  totalScore: number | null;
  /** Réponse arrivée après le chrono (0 point). */
  timedOut: boolean;
  /** Vrai si c'était la dernière question. */
  done: boolean;
}
