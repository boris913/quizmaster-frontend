import { describe, expect, it } from 'vitest';
import {
  inferQuestionType,
  normalizeImageUploadUrl,
  normalizePlayerQuestion,
  normalizeShortAnswer,
  toQuestionPayload,
  validateQuestionDraft,
  validateQuestionImageFile,
  type QuestionDraft,
} from '@/types';

const draft = (o: Partial<QuestionDraft>): QuestionDraft => ({
  text: ' Q ',
  type: 'single',
  options: [
    { id: 'A', text: 'a' },
    { id: 'B', text: 'b' },
    { id: 'C', text: 'c' },
  ],
  correct_answers: [],
  max_points: 100,
  ...o,
});

describe('types de questions : payload et validation', () => {
  it('sémantique de correct_answers par type', () => {
    expect(toQuestionPayload(draft({ type: 'true_false', correct_answers: ['false'] }))).toMatchObject({
      options: [{ id: 'true' }, { id: 'false' }],
      correct_answers: ['false'],
    });
    expect(toQuestionPayload(draft({ type: 'ordering' })).correct_answers).toEqual(['A', 'B', 'C']);
    expect(toQuestionPayload(draft({ type: 'short_answer', correct_answers: [' Rome', '', 'Rome', 'Roma'] }))).toMatchObject({
      options: [],
      correct_answers: ['Rome', 'Roma'],
    });
    expect(toQuestionPayload(draft({ type: 'poll', correct_answers: ['A'] })).correct_answers).toEqual([]);
    expect(toQuestionPayload(draft({ correct_answers: ['B', 'C'] })).correct_answers).toEqual(['B']);
    expect(toQuestionPayload(draft({ image_url: 'https://x/y.png' })).image_url).toBe('https://x/y.png');
    expect(toQuestionPayload(draft({ image_url: null }))).not.toHaveProperty('image_url');
  });

  it('validation par type', () => {
    expect(validateQuestionDraft(draft({ type: 'true_false' }))[0].path).toBe('correct_answers');
    expect(validateQuestionDraft(draft({ type: 'ordering', options: [{ id: 'A', text: 'a' }, { id: 'B', text: 'b' }] }))[0].path).toBe('options');
    expect(validateQuestionDraft(draft({ type: 'short_answer', options: [], correct_answers: ['  '] }))).toHaveLength(1);
    expect(validateQuestionDraft(draft({ type: 'poll' }))).toEqual([]);
    expect(validateQuestionDraft(draft({ correct_answers: ['A'] }))).toEqual([]);
  });

  it('déduction du type et normalisation joueur', () => {
    expect(inferQuestionType({ options: [{ id: 'true' }, { id: 'false' }] })).toBe('true_false');
    expect(inferQuestionType({ options: [] })).toBe('short_answer');
    expect(inferQuestionType({ options: [{ id: 'A' }], correctAnswers: [] })).toBe('poll');
    expect(inferQuestionType({ options: [{ id: 'A' }], correctAnswers: ['A'] })).toBeNull();
    const q = normalizePlayerQuestion({ id: 'q', type: 'true_false', options: undefined, imageUrl: 'https://i' } as any);
    expect(q.options.map((o) => o.text)).toEqual(['Vrai', 'Faux']);
    expect(q.image_url).toBe('https://i');
    expect(normalizePlayerQuestion({ type: 'inconnu' }).type).toBe('single');
  });

  it('normalisation de réponse courte', () => {
    expect(normalizeShortAnswer('  Évry   Courcouronnes ! ')).toBe('evry courcouronnes');
  });

  it('URL signée et contrôle des images', () => {
    expect(normalizeImageUploadUrl({ uploadUrl: 'u', publicUrl: 'p' })).toEqual({ uploadUrl: 'u', publicUrl: 'p', path: null, token: null });
    expect(normalizeImageUploadUrl({ signed_url: 'u', image_url: 'p', path: 'x' })?.path).toBe('x');
    expect(normalizeImageUploadUrl({ signedUrl: 'u' })).toBeNull();
    expect(validateQuestionImageFile({ type: 'image/svg+xml', size: 1 })).toMatch(/Format/);
    expect(validateQuestionImageFile({ type: 'image/png', size: 2 * 1024 * 1024 + 1 })).toMatch(/2 Mo/);
    expect(validateQuestionImageFile({ type: 'image/gif', size: 2 * 1024 * 1024 })).toBeNull();
  });
});

describe('payload exact accepté par le DTO backend (forbidNonWhitelisted)', () => {
  const DTO_KEYS = ['text', 'type', 'options', 'correct_answers', 'max_points', 'timer_seconds', 'explanation', 'image_url'];

  it.each([
    ['single', { correct_answers: ['B'] }, { options: 3, correct_answers: ['B'] }],
    ['multiple', { correct_answers: ['C', 'A'] }, { options: 3, correct_answers: ['A', 'C'] }],
    ['true_false', { correct_answers: ['true'] }, { options: 2, correct_answers: ['true'] }],
    ['ordering', {}, { options: 3, correct_answers: ['A', 'B', 'C'] }],
    ['short_answer', { correct_answers: ['Rome'] }, { options: 0, correct_answers: ['Rome'] }],
    ['poll', {}, { options: 3, correct_answers: [] }],
  ] as const)('%s : aucun champ hors DTO', (type, extra, expected) => {
    const payload = toQuestionPayload(
      draft({ type, timer_seconds: 30, explanation: '  ', image_url: '', ...extra } as Partial<QuestionDraft>)
    );
    Object.keys(payload).forEach((key) => expect(DTO_KEYS).toContain(key));
    expect(payload).toEqual({
      text: 'Q',
      type,
      options: expect.any(Array),
      correct_answers: expected.correct_answers,
      max_points: 100,
      timer_seconds: 30,
    });
    expect(payload.options).toHaveLength(expected.options);
  });

  it('options A-D pour single/multiple, A-F pour ordering/poll', () => {
    const six = ['A', 'B', 'C', 'D', 'E', 'F'].map((id) => ({ id, text: id }));
    expect(validateQuestionDraft(draft({ type: 'ordering', options: six }))).toEqual([]);
    expect(validateQuestionDraft(draft({ type: 'poll', options: six }))).toEqual([]);
    expect(validateQuestionDraft(draft({ type: 'single', options: six, correct_answers: ['A'] }))[0].path).toBe('options');
  });

  it('short_answer : 20 variantes et 100 caractères au plus', () => {
    const many = Array.from({ length: 21 }, (_, i) => `v${i}`);
    expect(validateQuestionDraft(draft({ type: 'short_answer', options: [], correct_answers: many }))).toHaveLength(1);
    expect(validateQuestionDraft(draft({ type: 'short_answer', options: [], correct_answers: ['x'.repeat(101)] }))).toHaveLength(1);
  });
});

describe('question:stats / question:reveal : champs type et graded (backend #7)', () => {
  it('lus quand présents, omis sinon', async () => {
    const { normalizeQuestionStats, normalizeQuestionReveal } = await import('@/types');
    expect(normalizeQuestionStats({ questionId: 'q', type: 'poll', graded: false })).toMatchObject({ type: 'poll', graded: false });
    expect(normalizeQuestionReveal({ questionId: 'q', type: 'ordering', graded: true })).toMatchObject({ type: 'ordering', graded: true });
    expect(normalizeQuestionStats({ questionId: 'q' })).not.toHaveProperty('type');
  });
});
