import { describe, expect, it } from 'vitest';
import {
  cumulativeClassAccuracy,
  getScoringMode,
  isLeaderboardHidden,
  normalizeAnswerResult,
  normalizePlayerQuizFinished,
  normalizePlayerScore,
} from '@/types';

describe('normalisation des payloads « classement masqué » (backend #8)', () => {
  it('answer:result sans rang ni écarts : null / false, sans planter', () => {
    const r = normalizeAnswerResult({
      is_correct: true,
      points_earned: 100,
      max_points: 'q1', // valeur actuelle du backend (questionId) : ramenée à 0
      time_taken_ms: 1000,
      correct_answers: [],
      your_answer: ['B'],
      total_score: 100,
      waiting_for_timer: true,
    });
    expect(r).toMatchObject({
      is_correct: true,
      total_score: 100,
      max_points: 0,
      rank: null,
      total_participants: null,
      gap_to_next: null,
      gap_to_podium: null,
      on_podium: false,
    });
  });

  it('answer:result complet (mode par défaut) : valeurs conservées', () => {
    const r = normalizeAnswerResult({ rank: 3, total_participants: 8, gap_to_next: 40, gap_to_podium: null, on_podium: true });
    expect(r).toMatchObject({ rank: 3, total_participants: 8, gap_to_next: 40, gap_to_podium: null, on_podium: true });
  });

  it('player:score : camelCase et snake_case, précision bornée', () => {
    expect(normalizePlayerScore({ score: 300, correctCount: 2, classAccuracy: 78 })).toEqual({
      score: 300,
      correctCount: 2,
      classAccuracy: 78,
    });
    expect(normalizePlayerScore({ score: 1, correct_count: 1, class_accuracy: 140 })?.classAccuracy).toBe(100);
    expect(normalizePlayerScore(null)).toBeNull();
  });

  it('quiz:finished : forme masquée ou forme avec classement', () => {
    expect(normalizePlayerQuizFinished({ classAccuracy: 50, yourScore: 100 })).toEqual({
      kind: 'hidden',
      classAccuracy: 50,
      yourScore: 100,
    });
    const full = normalizePlayerQuizFinished({ final_leaderboard: [], your_rank: 2, your_score: 10, total_participants: 4, message: 'ok' });
    expect(full).toMatchObject({ kind: 'leaderboard', yourRank: 2, yourScore: 10, totalParticipants: 4, message: 'ok' });
  });

  it('réglages de session : valeurs par défaut sur un ancien backend', () => {
    expect(isLeaderboardHidden({ show_leaderboard: false })).toBe(true);
    expect(isLeaderboardHidden({})).toBe(false);
    expect(isLeaderboardHidden(null)).toBe(false);
    expect(getScoringMode({ scoring_mode: 'accuracy' })).toBe('accuracy');
    expect(getScoringMode({})).toBe('speed');
  });

  it('précision cumulée : pondérée par le nombre de participants de chaque question', () => {
    expect(cumulativeClassAccuracy([])).toBeNull();
    expect(
      cumulativeClassAccuracy([
        { accuracy: 100, totalParticipants: 2 },
        { accuracy: 50, totalParticipants: 6 },
      ])
    ).toBe(63); // (2 + 3) / 8
  });
});
