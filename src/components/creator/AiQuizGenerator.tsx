'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Sparkles, Upload, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { cn } from '@/lib/utils';
import type { QuestionType } from '@/types';
import {
  AI_DEFAULT_COUNT,
  AI_GENERATABLE_TYPES,
  AI_LEVELS,
  AI_MAX_COUNT,
  AI_MIN_COUNT,
  AI_PDF_MAX_BYTES,
  AI_TEXT_MAX_LENGTH,
  AI_TEXT_MIN_LENGTH,
  classifyGenerationError,
  formatResetDate,
  generateQuizDraft,
  validateCourseFile,
  validateGenerationRequest,
  type GenerationError,
  type GenerationField,
  type GenerationFieldError,
  type GenerationQuota,
  type GenerationRequest,
  type GenerationResult,
} from '@/lib/aiGeneration';

/** Étapes affichées pendant la génération (le serveur ne renvoie pas de progression). */
export const GENERATION_STEPS = [
  { after: 0, key: 'send' },
  { after: 3, key: 'read' },
  { after: 10, key: 'write' },
  { after: 35, key: 'check' },
] as const;

const MAX_MB = AI_PDF_MAX_BYTES / (1024 * 1024);

type Source = 'text' | 'file';
type FieldErrors = Partial<Record<GenerationField, GenerationFieldError>>;

/** Message de quota atteint (limite et date de remise à zéro quand le serveur les donne). */
export function useQuotaReachedMessage() {
  const t = useTranslations('aiGeneration.quota');
  const locale = useLocale();
  return (quota: GenerationQuota | null) =>
    [
      quota?.limit ? t('reachedLimit', { limit: quota.limit }) : t('reachedGeneric'),
      quota?.resetAt ? t('resetOn', { date: formatResetDate(quota.resetAt, locale) }) : t('resetNextMonth'),
      t('alternatives'),
    ].join(' ');
}

interface AiQuizGeneratorProps {
  onGenerated: (result: GenerationResult, request: GenerationRequest) => void;
  /** Dernier état de quota connu (affiché sous le bouton). */
  quota?: GenerationQuota | null;
}

export function AiQuizGenerator({ onGenerated, quota }: AiQuizGeneratorProps) {
  const t = useTranslations('aiGeneration');
  const tq = useTranslations('questionTypes');
  const locale = useLocale();
  const quotaReachedMessage = useQuotaReachedMessage();
  const [source, setSource] = useState<Source>('text');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [level, setLevel] = useState('');
  const [count, setCount] = useState<number>(AI_DEFAULT_COUNT);
  const [types, setTypes] = useState<QuestionType[]>(['single', 'true_false']);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<GenerationError | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [upload, setUpload] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const inFlight = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const started = Date.now();
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [loading]);

  const step = [...GENERATION_STEPS].reverse().find((s) => elapsed >= s.after) ?? GENERATION_STEPS[0];
  const stepIndex = GENERATION_STEPS.indexOf(step);
  const quotaExhausted = quota?.remaining === 0;
  const number = (n: number) => n.toLocaleString(locale === 'en' ? 'en-GB' : 'fr-FR');

  const fieldError = (key: GenerationFieldError | undefined) =>
    key
      ? t(`validation.${key}`, {
          maxMb: MAX_MB,
          min: number(key === 'countRange' ? AI_MIN_COUNT : AI_TEXT_MIN_LENGTH),
          max: number(key === 'countRange' ? AI_MAX_COUNT : AI_TEXT_MAX_LENGTH),
        })
      : undefined;

  const failureMessage = (f: GenerationError) => {
    if (f.kind === 'quota') return quotaReachedMessage(f.quota);
    const message = t(`errors.${f.kind}`, { maxMb: MAX_MB });
    // Les messages du serveur sont en français : on les ajoute en complément dans cette langue.
    return locale === 'fr' && f.detail && f.detail !== message ? `${message} (${f.detail})` : message;
  };

  const pickFile = (picked: File | null | undefined) => {
    if (!picked) return;
    const error = validateCourseFile(picked);
    if (error) {
      setFile(null);
      setErrors((e) => ({ ...e, source: error }));
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setFile(picked);
    setErrors((e) => ({ ...e, source: undefined }));
  };

  const toggleType = (type: QuestionType) =>
    setTypes((current) => (current.includes(type) ? current.filter((t) => t !== type) : [...current, type]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;
    const request: GenerationRequest = {
      text: source === 'text' ? text : undefined,
      file: source === 'file' ? file : null,
      level,
      count,
      types: AI_GENERATABLE_TYPES.filter((t) => types.includes(t)),
    };
    const fieldErrors: FieldErrors = validateGenerationRequest(request);
    if (source === 'file' && !file) fieldErrors.source = 'fileRequired';
    setErrors(fieldErrors);
    setFailure(null);
    if (Object.values(fieldErrors).some(Boolean)) return;

    inFlight.current = true;
    setLoading(true);
    setUpload(request.file ? 0 : null);
    try {
      const result = await generateQuizDraft(request, {
        onUploadProgress: request.file ? setUpload : undefined,
      });
      if (result.questions.length === 0) {
        setFailure({ kind: 'no_questions', detail: null, quota: result.quota });
        return;
      }
      onGenerated(result, request);
    } catch (error) {
      setFailure(classifyGenerationError(error));
    } finally {
      inFlight.current = false;
      setLoading(false);
      setUpload(null);
    }
  };

  const inputClass =
    'w-full min-h-[44px] rounded-md border border-borderc-strong bg-surface px-3 py-2 text-body text-ink focus:outline-none focus:border-primary focus:shadow-glow';

  return (
    <Card className="p-6 space-y-6">
      <form onSubmit={submit} className="space-y-6" noValidate aria-busy={loading}>
        <fieldset className="space-y-3" disabled={loading}>
          <legend className="text-card-title text-ink mb-2">{t('form.sourceLegend')}</legend>
          <div className="inline-flex rounded-md border border-borderc p-1" role="radiogroup" aria-label={t('form.sourceGroup')}>
            {(['text', 'file'] as const).map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={source === value}
                onClick={() => {
                  setSource(value);
                  setErrors((e) => ({ ...e, source: undefined }));
                }}
                className={cn(
                  'rounded-sm px-3 py-1.5 text-small font-medium min-h-[36px]',
                  source === value ? 'bg-primary-50 text-primary-700' : 'text-ink-secondary hover:text-ink'
                )}
              >
                {value === 'text' ? t('form.sourceText') : t('form.sourceFile')}
              </button>
            ))}
          </div>

          {source === 'text' ? (
            <div className="space-y-1.5">
              <label htmlFor="ai-course-text" className="text-small font-medium text-ink">
                {t('form.textLabel')}
              </label>
              <textarea
                id="ai-course-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                placeholder={t('form.textPlaceholder')}
                className={cn(inputClass, 'placeholder:text-ink-tertiary')}
                aria-invalid={!!errors.source}
                aria-describedby={errors.source ? 'ai-source-error' : undefined}
              />
              <p className="text-caption text-ink-tertiary">{t('form.charCount', { count: text.trim().length })}</p>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files?.[0]);
              }}
              className={cn(
                'rounded-md border-2 border-dashed p-6 text-center space-y-2',
                dragging ? 'border-primary bg-primary-50' : 'border-borderc-strong'
              )}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2 text-body text-ink">
                  <FileText className="w-5 h-5 text-primary" aria-hidden />
                  <span>{t('form.fileSize', { name: file.name, size: (file.size / (1024 * 1024)).toFixed(1) })}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileInput.current) fileInput.current.value = '';
                    }}
                    aria-label={t('form.removeFile')}
                    className="text-ink-secondary hover:text-danger"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 mx-auto text-ink-tertiary" aria-hidden />
                  <p className="text-small text-ink-secondary">{t('form.dropHint', { maxMb: MAX_MB })}</p>
                </>
              )}
              <label className="inline-block cursor-pointer text-small font-medium text-primary-700 hover:underline">
                {file ? t('form.chooseOther') : t('form.browse')}
                <input
                  ref={fileInput}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  aria-label={t('form.fileLabel')}
                  onChange={(e) => pickFile(e.target.files?.[0])}
                />
              </label>
            </div>
          )}
          {errors.source && (
            <p id="ai-source-error" role="alert" className="text-small text-danger">
              {fieldError(errors.source)}
            </p>
          )}
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-2" disabled={loading}>
          <legend className="sr-only">{t('form.settings')}</legend>
          <div className="space-y-1.5">
            <label htmlFor="ai-level" className="text-small font-medium text-ink">
              {t('form.level')}
            </label>
            <select
              id="ai-level"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className={inputClass}
              aria-invalid={!!errors.level}
            >
              <option value="">{t('form.levelPlaceholder')}</option>
              {AI_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {t(`levels.${l.key}`)}
                </option>
              ))}
            </select>
            {errors.level && <p className="text-small text-danger">{fieldError(errors.level)}</p>}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="ai-count" className="text-small font-medium text-ink">
              {t('form.count', { min: AI_MIN_COUNT, max: AI_MAX_COUNT })}
            </label>
            <input
              id="ai-count"
              type="number"
              min={AI_MIN_COUNT}
              max={AI_MAX_COUNT}
              value={Number.isNaN(count) ? '' : count}
              onChange={(e) => setCount(e.target.valueAsNumber)}
              className={inputClass}
              aria-invalid={!!errors.count}
            />
            {errors.count && <p className="text-small text-danger">{fieldError(errors.count)}</p>}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={loading}>
          <legend className="text-small font-medium text-ink mb-1">{t('form.types')}</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {AI_GENERATABLE_TYPES.map((type) => (
              <label key={type} className="flex items-center gap-2 text-small text-ink">
                <input
                  type="checkbox"
                  checked={types.includes(type)}
                  onChange={() => toggleType(type)}
                  className="rounded border-borderc-strong accent-primary"
                />
                {tq(type)}
              </label>
            ))}
          </div>
          {errors.types && <p className="text-small text-danger">{fieldError(errors.types)}</p>}
        </fieldset>

        {failure && (
          <div
            role="alert"
            data-testid={`ai-error-${failure.kind}`}
            className={cn(
              'rounded-md border p-4 text-small',
              failure.kind === 'quota' || failure.kind === 'unavailable'
                ? 'border-warning-100 bg-warning-50 text-ink'
                : 'border-danger-100 bg-danger-50 text-danger'
            )}
          >
            <p className="font-medium">
              {failure.kind === 'quota'
                ? t('errorTitles.quota')
                : failure.kind === 'unavailable'
                  ? t('errorTitles.unavailable')
                  : t('errorTitles.generic')}
            </p>
            <p className="mt-1">{failureMessage(failure)}</p>
          </div>
        )}

        {loading && (
          <div role="status" aria-live="polite" className="rounded-md bg-primary-50 p-4 space-y-2">
            <p className="text-small font-medium text-primary-700">{t(`steps.${step.key}`)}</p>
            <ol className="flex gap-1.5" aria-hidden>
              {GENERATION_STEPS.map((s, i) => (
                <li
                  key={s.key}
                  className={cn('h-1.5 flex-1 rounded-full', i <= stepIndex ? 'bg-primary' : 'bg-primary-100')}
                />
              ))}
            </ol>
            <p className="text-caption text-ink-secondary">
              {upload !== null && upload < 1 ? `${t('steps.upload', { percent: Math.round(upload * 100) })} ` : ''}
              {t('steps.patience')}
            </p>
          </div>
        )}

        <div className="space-y-2">
          {quotaExhausted && !failure && (
            <p
              role="alert"
              data-testid="ai-quota-exhausted"
              className="rounded-md border border-warning-100 bg-warning-50 p-3 text-small text-ink"
            >
              {quotaReachedMessage(quota ?? null)}
            </p>
          )}
          <Button type="submit" className="w-full" isLoading={loading} disabled={loading || quotaExhausted}>
            <Sparkles className="w-4 h-4 mr-2" aria-hidden />
            {loading ? t('form.submitting') : t('form.submit')}
          </Button>
          {quota && quota.remaining !== null && (
            <p className="text-caption text-ink-tertiary text-center">
              {quota.limit !== null
                ? t('form.remaining', { remaining: quota.remaining, limit: quota.limit })
                : t('form.remainingNoLimit', { remaining: quota.remaining })}
              {quota.resetAt ? ` ${t('form.resetOn', { date: formatResetDate(quota.resetAt, locale) })}` : ''}
            </p>
          )}
        </div>

        <p className="text-caption text-ink-tertiary" data-testid="ai-privacy-notice">
          {t('form.privacyNotice')}{' '}
          <Link href="/confidentialite#generation-ia" className="underline hover:text-ink">
            {t('form.privacyLink')}
          </Link>
        </p>
      </form>
    </Card>
  );
}
