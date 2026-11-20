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
