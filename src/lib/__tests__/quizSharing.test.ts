import { describe, expect, it } from 'vitest';
import {
  IMPORT_MAX_BYTES,
  buildShareUrl,
  copiedQuizPath,
  copyWarningLabel,
  importSummary,
  rememberCopyWarnings,
  takeCopyWarnings,
  countQuestionTypes,
  normalizeImportReport,
  normalizeQuizCopy,
  normalizeSharedPreview,
  readShareToken,
  redirectAfterLogin,
  resolveImportFile,
  safeRedirectPath,
} from '@/lib/quizSharing';

function fileOf(name: string, size: number): File {
  const file = new File(['x'], name);
  Object.defineProperty(file, 'size', { value: size });
  return file;
}

describe('quizSharing : duplication et copie', () => {
  it('lit le contrat du backend #12 : quiz enveloppé et tous les avertissements', () => {
    expect(
      normalizeQuizCopy({
        quiz: { id: 'q6' },
        warnings: [
          { question_number: 2, message: 'image non copiée (erreur du stockage) : question copiée sans image' },
          { question_number: 3, message: 'question non copiée : texte requis' },
        ],
      })
    ).toEqual({
      quizId: 'q6',
      warnings: [
        { questionNumber: 2, message: 'image non copiée (erreur du stockage) : question copiée sans image' },
        { questionNumber: 3, message: 'question non copiée : texte requis' },
      ],
    });
    expect(normalizeQuizCopy({ id: 'q2' })).toEqual({ quizId: 'q2', warnings: [] });
    expect(normalizeQuizCopy({ id: 'q3', warnings: ['à vérifier'] }).warnings).toEqual([
      { questionNumber: null, message: 'à vérifier' },
    ]);
    expect(() => normalizeQuizCopy({})).toThrow();
  });

  it('libellé d’un avertissement', () => {
    expect(copyWarningLabel({ questionNumber: 3, message: 'question non copiée : texte requis' })).toBe(
      'Question 3 : question non copiée : texte requis'
    );
    expect(copyWarningLabel({ questionNumber: null, message: 'x' })).toBe('x');
  });

  it('transmet les avertissements à la page de la copie, une seule fois', () => {
    const warnings = [{ questionNumber: 1, message: 'image non copiée' }];
    rememberCopyWarnings({ quizId: 'q9', warnings });
    expect(takeCopyWarnings('q9')).toEqual(warnings);
    expect(takeCopyWarnings('q9')).toEqual([]);
  });

  it('construit le chemin de la copie', () => {
    expect(copiedQuizPath({ quizId: 'q2' })).toBe('/creator/quiz/q2');
  });
});

describe('quizSharing : partage', () => {
  it('lit le jeton et construit le lien public', () => {
    expect(readShareToken({ share_token: 'abc' })).toBe('abc');
    expect(readShareToken({ shareToken: 'def' })).toBe('def');
    expect(readShareToken({ share_token: null })).toBeNull();
    expect(buildShareUrl('abc', 'https://kwizora.fr')).toBe('https://kwizora.fr/creator/quiz/shared/abc');
  });

  it('l’aperçu ne conserve jamais les bonnes réponses et masque l’ordre attendu', () => {
    const preview = normalizeSharedPreview({
      title: 'Volcans',
      questions: [
        { text: 'Q1', type: 'single', options: [{ id: 'A', text: 'x', is_correct: true }], correct_answers: ['A'] },
        {
          text: 'Q2',
          type: 'ordering',
          options: [
            { id: 'A', text: 'Moyen Âge' },
            { id: 'B', text: 'Antiquité' },
          ],
        },
        { text: 'Q3', type: 'single', options: [] },
      ],
    });
    expect(JSON.stringify(preview)).not.toMatch(/correct/);
    expect(preview.questionCount).toBe(3);
    expect(preview.questions[1].options.map((o) => o.text)).toEqual(['Antiquité', 'Moyen Âge']);
    expect(countQuestionTypes(preview.questions)).toEqual([
      ['single', 2],
      ['ordering', 1],
    ]);
  });
});

describe('quizSharing : retour après connexion', () => {
  it('n’accepte que des chemins internes', () => {
    expect(safeRedirectPath('/creator/quiz/shared/abc')).toBe('/creator/quiz/shared/abc');
    expect(safeRedirectPath('//evil.com')).toBeNull();
    expect(safeRedirectPath('https://evil.com')).toBeNull();
    expect(safeRedirectPath('/\\evil.com')).toBeNull();
    expect(redirectAfterLogin('?next=%2Fcreator%2Fquiz%2Fshared%2Fabc')).toBe('/creator/quiz/shared/abc');
    expect(redirectAfterLogin('?next=https%3A%2F%2Fevil.com')).toBe('/creator/dashboard');
    expect(redirectAfterLogin('')).toBe('/creator/dashboard');
  });
});

describe('quizSharing : import de fichier', () => {
  it('contrôle le type selon l’onglet', () => {
    expect(resolveImportFile(fileOf('q.csv', 10), 'spreadsheet')).toEqual({ format: 'csv' });
    expect(resolveImportFile(fileOf('q.XLSX', 10), 'spreadsheet')).toEqual({ format: 'xlsx' });
    expect(resolveImportFile(fileOf('k.xlsx', 10), 'kahoot')).toEqual({ format: 'kahoot' });
    expect(resolveImportFile(fileOf('k.csv', 10), 'kahoot')).toHaveProperty('error');
    expect(resolveImportFile(fileOf('q.pdf', 10), 'spreadsheet')).toHaveProperty('error');
  });

  it('contrôle la taille', () => {
    expect(resolveImportFile(fileOf('q.csv', IMPORT_MAX_BYTES + 1), 'spreadsheet')).toHaveProperty('error');
    expect(resolveImportFile(fileOf('q.csv', 0), 'spreadsheet')).toHaveProperty('error');
  });

  it('en dryRun, lit les questions valides dans `valid` (imported vaut 0)', () => {
    expect(normalizeImportReport({ dry_run: true, valid: 5, imported: 0, errors: [] })).toEqual({
      valid: 5,
      imported: 0,
      errors: [],
    });
  });

  it('résume la confirmation : questions importées et lignes ignorées', () => {
    const err = { row: 2, message: 'x' };
    expect(importSummary({ valid: 3, errors: [err, err] })).toBe('3 questions seront importées, 2 lignes ignorées.');
    expect(importSummary({ valid: 1, errors: [err] })).toBe('1 question sera importée, 1 ligne ignorée.');
    expect(importSummary({ valid: 4, errors: [] })).toBe('4 questions seront importées, 0 lignes ignorées.');
  });

  it('normalise le rapport', () => {
    expect(
      normalizeImportReport({ imported: 3, errors: [{ row: 4, message: 'Type inconnu' }, 'Fichier tronqué'] })
    ).toEqual({
      valid: 3,
      imported: 3,
      errors: [
        { row: 4, message: 'Type inconnu' },
        { row: null, message: 'Fichier tronqué' },
      ],
    });
  });
});
