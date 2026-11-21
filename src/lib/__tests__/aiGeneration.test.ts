import { describe, expect, it } from 'vitest';
import {
  AI_GENERATABLE_TYPES,
  AI_PDF_MAX_BYTES,
  buildGenerationFormData,
  classifyGenerationError,
  normalizeGenerationResponse,
  validateCourseFile,
  validateGenerationRequest,
} from '@/lib/aiGeneration';

function axiosError(status: number | null, data: unknown = {}, code?: string) {
  return {
    isAxiosError: true,
    code,
    message: 'Request failed',
    response: status === null ? undefined : { status, data, headers: {} },
  };
}

describe('aiGeneration : contrôles client', () => {
  it('le sondage n’est pas proposé à la génération', () => {
    expect(AI_GENERATABLE_TYPES).not.toContain('poll');
    expect(AI_GENERATABLE_TYPES).toEqual(['single', 'multiple', 'true_false', 'ordering', 'short_answer']);
  });

  it('refuse un fichier qui n’est pas un PDF, ou de plus de 10 Mo', () => {
    expect(validateCourseFile({ name: 'cours.pdf', type: 'application/pdf', size: 1000 })).toBeNull();
    expect(validateCourseFile({ name: 'cours.docx', type: 'application/msword', size: 1000 })).toMatch(/PDF/);
    expect(validateCourseFile({ name: 'cours.pdf', type: 'application/pdf', size: AI_PDF_MAX_BYTES + 1 })).toMatch(
      /10 Mo/
    );
    // Type MIME absent (certains navigateurs) : on se fie à l'extension.
    expect(validateCourseFile({ name: 'cours.PDF', type: '', size: 10 })).toBeNull();
  });

  it('valide les paramètres (source, niveau, nombre 1-30, types)', () => {
    const errors = validateGenerationRequest({ text: 'court', level: '', count: 31, types: [] });
    expect(Object.keys(errors).sort()).toEqual(['count', 'level', 'source', 'types']);
    expect(
      validateGenerationRequest({ text: 'x'.repeat(250), level: '4e', count: 30, types: ['single'] })
    ).toEqual({});
  });
});

describe('aiGeneration : corps multipart', () => {
  it('texte : text, level, count et types (champ répété)', () => {
    const form = buildGenerationFormData({
      text: '  Les volcans  ',
      level: '4e',
      count: 5,
      types: ['single', 'short_answer'],
    });
    expect(form.get('text')).toBe('Les volcans');
    expect(form.get('file')).toBeNull();
    expect(form.get('level')).toBe('4e');
    expect(form.get('count')).toBe('5');
    expect(form.getAll('types')).toEqual(['single', 'short_answer']);
    expect(form.getAll('types[]')).toEqual([]);
  });

  it('PDF : le fichier remplace le texte', () => {
    const file = new File(['%PDF-1.4'], 'cours.pdf', { type: 'application/pdf' });
    const form = buildGenerationFormData({ text: 'ignoré', file, level: '3e', count: 1, types: ['true_false'] });
    expect(form.get('text')).toBeNull();
    expect((form.get('file') as File).name).toBe('cours.pdf');
  });
});

describe('aiGeneration : normalisation de la réponse', () => {
  it('convertit en brouillons d’éditeur et additionne les questions écartées', () => {
    const result = normalizeGenerationResponse({
      questions: [
        {
          text: 'Capitale ?',
          type: 'single',
          options: [
            { id: 'A', text: 'Lyon' },
            { id: 'B', text: 'Paris' },
          ],
          correct_answers: ['B'],
          explanation: 'Paris est la capitale.',
        },
        { text: 'Sondage', type: 'poll', options: [], correct_answers: [] },
        { type: 'single' },
      ],
      discarded: 2,
      quota: { limit: 3, used: 1, resetAt: '2026-12-01T00:00:00.000Z' },
    });
    expect(result.questions).toHaveLength(1);
    expect(result.questions[0]).toMatchObject({
      text: 'Capitale ?',
      type: 'single',
      correct_answers: ['B'],
      max_points: 100,
      timer_seconds: 30,
      explanation: 'Paris est la capitale.',
    });
    expect(result.discarded).toBe(4);
    expect(result.quota).toEqual({ limit: 3, used: 1, remaining: 2, resetAt: '2026-12-01T00:00:00.000Z' });
  });

  it('forme du backend : rejected, source.truncated, quota.resets_at, points et durée fournis', () => {
    const result = normalizeGenerationResponse({
      questions: [
        { text: 'Vrai ?', type: 'true_false', options: [], correct_answers: ['true'], max_points: 200, timer_seconds: 45 },
      ],
      requested: 3,
      generated: 3,
      rejected: 2,
      source: { type: 'pdf', chars: 70000, used_chars: 60000, truncated: true },
      model: 'claude-sonnet-5-5',
      quota: { limit: 3, used: 2, remaining: 1, resets_at: '2026-12-01T00:00:00.000Z' },
    });
    expect(result.discarded).toBe(2);
    expect(result.truncated).toBe(true);
    expect(result.questions[0]).toMatchObject({ max_points: 200, timer_seconds: 45 });
    expect(result.quota).toEqual({ limit: 3, used: 2, remaining: 1, resetAt: '2026-12-01T00:00:00.000Z' });
  });

  it('tolère les variantes camelCase et un brouillon imbriqué', () => {
    const result = normalizeGenerationResponse({
      draft: { title: 'Les volcans', questions: [{ text: 'Vrai ?', type: 'true_false', correctAnswers: ['false'] }] },
      discardedCount: 1,
    });
    expect(result.title).toBe('Les volcans');
    expect(result.questions[0].correct_answers).toEqual(['false']);
    expect(result.discarded).toBe(1);
    expect(result.quota).toBeNull();
  });
});

describe('aiGeneration : erreurs', () => {
  it('429 : quota avec limite et date de remise à zéro', () => {
    const error = classifyGenerationError(
      axiosError(429, { message: 'Quota atteint', quota: { limit: 3, used: 3, remaining: 0, resets_at: '2026-12-01T12:00:00.000Z' } })
    );
    expect(error.kind).toBe('quota');
    expect(error.message).toContain('vos 3 générations du mois');
    expect(error.message).toContain('1 décembre 2026');
  });

  it('429 sans détail : message générique', () => {
    const error = classifyGenerationError(axiosError(429));
    expect(error.kind).toBe('quota');
    expect(error.message).toMatch(/quota mensuel/);
  });

  it('503, 422, 413, réseau et délai dépassé', () => {
    expect(classifyGenerationError(axiosError(503)).kind).toBe('unavailable');
    expect(classifyGenerationError(axiosError(422, { message: 'PDF sans texte' })).kind).toBe('pdf_no_text');
    expect(classifyGenerationError(axiosError(413)).kind).toBe('too_large');
    expect(classifyGenerationError(axiosError(null)).kind).toBe('network');
    expect(classifyGenerationError(axiosError(null, {}, 'ECONNABORTED')).kind).toBe('timeout');
    expect(classifyGenerationError(new Error('boom')).kind).toBe('unknown');
  });

  it('messages serveur : 415, 422 contenu trop court, 502 sans question valide', () => {
    expect(classifyGenerationError(axiosError(415, { message: 'Le fichier doit être un PDF (application/pdf).' }))).toMatchObject({
      kind: 'unsupported_file',
      message: 'Le fichier doit être un PDF (application/pdf).',
    });
    expect(
      classifyGenerationError(axiosError(422, { message: 'Le contenu fourni est trop court pour générer des questions.' }))
    ).toMatchObject({ kind: 'unprocessable', message: 'Le contenu fourni est trop court pour générer des questions.' });
    expect(
      classifyGenerationError(axiosError(502, { message: "L'IA n'a produit aucune question valide. Réessayez (aucun quota consommé)." })).kind
    ).toBe('no_questions');
    expect(classifyGenerationError(axiosError(502, { message: 'La génération par IA a échoué.' })).kind).toBe('provider_error');
    expect(classifyGenerationError(axiosError(504)).kind).toBe('timeout');
  });
});
