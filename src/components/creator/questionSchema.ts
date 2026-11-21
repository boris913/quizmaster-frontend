import { z } from 'zod';
import {
  QUESTION_EXPLANATION_MAX_LENGTH,
  QUESTION_MIN_OPTIONS,
  QUESTION_TYPES,
  allowedOptionIds,
  questionTypeHasOptions,
  toQuestionPayload,
  validateQuestionDraft,
  type QuestionPayload,
  type QuestionType,
  type QuizOption,
} from '@/types';

/** Question telle qu'éditée dans le formulaire (avant conversion en payload API). */
export const questionSchema = z
  .object({
    text: z.string().min(1, 'Texte requis'),
    type: z.enum(QUESTION_TYPES),
    options: z.array(z.object({ id: z.string(), text: z.string() })),
    correct_answers: z.array(z.string()),
    max_points: z.number().min(10).max(1000),
    timer_seconds: z.number().min(5).max(300).optional(),
    // Facultative : une chaîne vide n'est pas envoyée au backend.
    explanation: z
      .string()
      .max(QUESTION_EXPLANATION_MAX_LENGTH, `${QUESTION_EXPLANATION_MAX_LENGTH} caractères maximum`)
      .optional()
      .transform((v) => (v && v.trim() ? v.trim() : undefined)),
    image_url: z.string().nullable().optional(),
    /** Image choisie avant la création du quiz : envoyée à l'enregistrement. */
    image_file: z.any().optional(),
  })
  .superRefine((question, ctx) => {
    validateQuestionDraft(question).forEach((issue) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [issue.path], message: issue.message })
    );
  });

export type QuestionFormValues = z.input<typeof questionSchema>;
export type ParsedQuestion = z.output<typeof questionSchema>;

/** Question prête à l'envoi, avec l'éventuelle image encore à téléverser (jamais envoyée telle quelle). */
export type PendingQuestion = QuestionPayload & { image_file?: File };

/** Options vides par défaut : A-D. */
export function defaultOptions(count = 4): QuizOption[] {
  return allowedOptionIds('ordering').slice(0, count).map((id) => ({ id, text: '' }));
}

export function emptyQuestion(): QuestionFormValues {
  return {
    text: '',
    type: 'single',
    options: defaultOptions(),
    correct_answers: [],
    max_points: 100,
    timer_seconds: 30,
    explanation: '',
    image_url: null,
  };
}

/** Prochain identifiant d'option libre pour le type (A-D ou A-F), ou null si le maximum est atteint. */
export function nextOptionId(options: QuizOption[], type: QuestionType = 'single'): string | null {
  return allowedOptionIds(type).find((id) => !options.some((o) => o.id === id)) ?? null;
}

/**
 * Adapte une question à un nouveau type : options complétées si besoin, bonnes réponses
 * réinitialisées quand leur sémantique change (ids, `true`/`false`, variantes texte).
 */
export function changeQuestionType(
  question: Pick<QuestionFormValues, 'type' | 'options' | 'correct_answers'>,
  type: QuestionType
): Pick<QuestionFormValues, 'type' | 'options' | 'correct_answers'> {
  let options = question.options ?? [];
  if (questionTypeHasOptions(type) && type !== 'true_false') {
    const min = Math.max(QUESTION_MIN_OPTIONS[type], 2);
    const allowed = allowedOptionIds(type);
    if (options.length === 0) options = defaultOptions();
    // single/multiple n'acceptent que A-D : les options E et F d'un ordre ou d'un sondage tombent.
    options = options.filter((o) => allowed.includes(o.id));
    while (options.length < min) {
      const id = nextOptionId(options, type);
      if (!id) break;
      options = [...options, { id, text: '' }];
    }
  }

  const previous = question.type;
  const idBased = (t: QuestionType) => t === 'single' || t === 'multiple';
  let correct: string[] = [];
  if (idBased(type) && idBased(previous)) {
    const kept = (question.correct_answers ?? []).filter((id) => options.some((o) => o.id === id));
    correct = type === 'single' ? kept.slice(0, 1) : kept;
  } else if (type === 'short_answer') {
    correct = previous === 'short_answer' ? question.correct_answers : [''];
  } else if (type === 'true_false' && previous === 'true_false') {
    correct = question.correct_answers;
  }
  return { type, options, correct_answers: correct };
}

/** Question existante (API) -> valeurs du formulaire, pour l'édition. */
export function questionToFormValues(question: Partial<QuestionPayload> & { image_url?: string | null }): QuestionFormValues {
  const base = emptyQuestion();
  const type = (QUESTION_TYPES as readonly string[]).includes(String(question.type))
    ? (question.type as QuestionType)
    : 'single';
  const options =
    type === 'short_answer' || type === 'true_false'
      ? base.options
      : (question.options ?? []).map((o) => ({ id: o.id, text: o.text }));
  // Pour `ordering`, l'ordre attendu est celui de `correct_answers`.
  const ordered =
    type === 'ordering' && question.correct_answers?.length
      ? [...options].sort(
          (a, b) => question.correct_answers!.indexOf(a.id) - question.correct_answers!.indexOf(b.id)
        )
      : options;
  return {
    ...base,
    text: question.text ?? '',
    type,
    options: ordered,
    correct_answers:
      type === 'short_answer' && !(question.correct_answers ?? []).length
        ? ['']
        : [...(question.correct_answers ?? [])],
    max_points: question.max_points ?? base.max_points,
    timer_seconds: question.timer_seconds ?? base.timer_seconds,
    explanation: question.explanation ?? '',
    image_url: question.image_url ?? null,
  };
}

/** Valeurs validées -> payload API (sémantique de `correct_answers` par type), image en attente à part. */
export function toPendingQuestion(question: ParsedQuestion): PendingQuestion {
  const payload = toQuestionPayload({
    ...question,
    explanation: question.explanation,
    image_url: question.image_url ?? null,
  });
  const file = question.image_file;
  return typeof File !== 'undefined' && file instanceof File ? { ...payload, image_file: file } : payload;
}
