import { describe, expect, it } from 'vitest';
import {
  buildAssignmentUrl,
  getAssignmentError,
  normalizeAssignmentAnswer,
  normalizeAssignmentNext,
  parseDateTimeLocalValue,
  toDateTimeLocalValue,
  validateDueDate,
} from '@/lib/assignments';

const err = (status: number, message?: string, code?: string) => ({
  response: { status, data: { message, code } },
});

describe('assignments : liens et échéance', () => {
  it('construit le lien élève avec le code normalisé', () => {
    expect(buildAssignmentUrl(' ab c234 ', 'https://kwizora.fr')).toBe('https://kwizora.fr/player/assignment/ABC234');
  });

  it('aller-retour datetime-local', () => {
    const date = new Date(2030, 0, 10, 18, 5);
    expect(toDateTimeLocalValue(date)).toBe('2030-01-10T18:05');
    expect(parseDateTimeLocalValue('2030-01-10T18:05')?.getTime()).toBe(date.getTime());
    expect(parseDateTimeLocalValue('n/a')).toBeNull();
  });

  it('impose au moins maintenant + 15 min', () => {
    const now = new Date(2030, 0, 10, 12, 0);
    expect(validateDueDate('2030-01-10T12:14', now)).toMatch(/15 minutes/);
    expect(validateDueDate('2030-01-10T12:15', now)).toBeNull();
    expect(validateDueDate('', now)).toMatch(/Indiquez/);
    expect(validateDueDate('2031-01-11T12:00', now)).toMatch(/365 jours/);
  });
});

describe('assignments : normalisation', () => {
  it('lit une question (camelCase ou snake_case) sans bonne réponse', () => {
    const next = normalizeAssignmentNext({
      question: {
        id: 'q1',
        text: 'Q ?',
        type: 'single',
        options: [{ id: 'A', text: 'a' }],
        correct_answers: ['A'],
        explanation: 'secret',
        timer_seconds: 20,
      },
      question_number: 2,
      total_questions: 5,
      due_at: '2030-01-10T17:00:00.000Z',
    });
    expect(next.done).toBe(false);
    if (next.done) return;
    expect(next.questionNumber).toBe(2);
    expect(next.totalQuestions).toBe(5);
    expect(next.timerSeconds).toBe(20);
    expect(next.dueAt).toBe('2030-01-10T17:00:00.000Z');
    expect(next.question).not.toHaveProperty('correct_answers');
    expect(next.question).not.toHaveProperty('explanation');
  });

  it('forme backend #10 : position, total, temps restant, assignment.dueAt', () => {
    const next = normalizeAssignmentNext({
      done: false,
      assignment: { dueAt: '2030-01-10T17:00:00.000Z' },
      position: 3,
      total: 4,
      question: { id: 'q3', text: 'Q ?', type: 'multiple', options: [], imageUrl: null, maxPoints: 500, timerSeconds: 30 },
      timeRemainingMs: 12_300,
    });
    expect(next.done).toBe(false);
    if (next.done) return;
    expect(next.questionNumber).toBe(3);
    expect(next.totalQuestions).toBe(4);
    expect(next.timerSeconds).toBe(13);
    expect(next.dueAt).toBe('2030-01-10T17:00:00.000Z');
    expect(next.question).toMatchObject({ id: 'q3', type: 'multiple', max_points: 500, timer_seconds: 30 });
  });

  it('forme backend #10 : bilan à la racine avec correction', () => {
    const next = normalizeAssignmentNext({
      done: true,
      total: 2,
      score: 1000,
      maxScore: 2000,
      correctCount: 1,
      review: [
        {
          position: 1,
          question: { id: 'q1', text: 'Q1', options: [{ id: 'A', text: 'a' }] },
          yourAnswers: ['A'],
          status: 'answered',
          isCorrect: true,
          correctAnswers: ['A'],
          explanation: 'Parce que.',
        },
      ],
    });
    expect(next).toEqual({
      done: true,
      dueAt: null,
      summary: {
        score: 1000,
        correctCount: 1,
        totalQuestions: 2,
        review: [
          {
            questionId: 'q1',
            text: 'Q1',
            options: [{ id: 'A', text: 'a' }],
            yourAnswers: ['A'],
            correctAnswers: ['A'],
            isCorrect: true,
            explanation: 'Parce que.',
          },
        ],
      },
    });
  });

  it('forme backend #10 : verdict imbriqué dans `result`, timeout', () => {
    const result = normalizeAssignmentAnswer({
      questionId: 'q1',
      status: 'timeout',
      alreadyAnswered: false,
      timeTakenMs: null,
      finished: true,
      result: { isCorrect: false, pointsEarned: 0, maxPoints: 1000, correctAnswers: ['B'], explanation: 'X', totalScore: 0 },
    });
    expect(result).toMatchObject({
      isCorrect: false,
      maxPoints: 1000,
      correctAnswers: ['B'],
      explanation: 'X',
      timedOut: true,
      done: true,
    });
  });

  it('sans question : devoir terminé', () => {
    const next = normalizeAssignmentNext({ done: true, score: 1500, correctCount: 2, totalQuestions: 3 });
    expect(next).toEqual({
      done: true,
      dueAt: null,
      summary: { score: 1500, correctCount: 2, totalQuestions: 3, review: [] },
    });
  });

  it('réponse sans verdict (correction à la fin)', () => {
    const result = normalizeAssignmentAnswer({ done: false });
    expect(result.isCorrect).toBeNull();
    expect(result.correctAnswers).toEqual([]);
    expect(result.explanation).toBeNull();
  });
});

describe('assignments : erreurs', () => {
  it('classe les statuts du contrat', () => {
    expect(getAssignmentError({}, 'start').kind).toBe('network');
    expect(getAssignmentError(err(404), 'start').kind).toBe('notFound');
    expect(getAssignmentError(err(410, 'Échéance dépassée'), 'next').kind).toBe('expired');
    expect(getAssignmentError(err(410, 'Devoir clos'), 'next').kind).toBe('closed');
    expect(getAssignmentError(err(410), 'answer').kind).toBe('expired');
    expect(getAssignmentError(err(403, 'Ce devoir est clos'), 'start').kind).toBe('closed');
    expect(getAssignmentError(err(403, undefined, 'ASSIGNMENT_EXPIRED'), 'start').kind).toBe('expired');
    expect(getAssignmentError(err(401), 'next').kind).toBe('invalidToken');
    expect(getAssignmentError(err(409), 'start').kind).toBe('nicknameTaken');
    expect(getAssignmentError(err(409), 'answer').kind).toBe('alreadyAnswered');
    expect(getAssignmentError({ response: { status: 410, data: { message: 'x', reason: 'closed' } } }, 'next').kind).toBe(
      'closed'
    );
    expect(getAssignmentError({ response: { status: 410, data: { message: 'x', reason: 'expired' } } }, 'next').kind).toBe(
      'expired'
    );
    expect(getAssignmentError(err(403, 'Tu as été exclu'), 'next').kind).toBe('kicked');
    expect(
      getAssignmentError({ response: { status: 404, data: { message: 'Session en direct', mode: 'live' } } }, 'start')
    ).toEqual({ kind: 'notFound', message: 'Session en direct' });
  });

  it('pseudo refusé : message du serveur', () => {
    expect(getAssignmentError(err(400, 'Pseudo inapproprié'), 'start')).toEqual({
      kind: 'nickname',
      message: 'Pseudo inapproprié',
    });
    expect(getAssignmentError(err(400, ['a', 'b'] as unknown as string), 'start').message).toBe('a b');
  });
});
