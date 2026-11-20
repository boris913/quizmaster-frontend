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
    type: 'single' | 'multiple';
    options: QuizOption[];
    correct_answers: string[];
    max_points: number;
    timer_seconds: number;
    order_index: number;
    created_at: string;
    /** Explication affichée aux joueurs après la clôture (facultative, 500 caractères max). */
    explanation?: string | null;
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
  return {
    questionId: String(questionId),
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
  return {
    questionId: String(questionId),
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
