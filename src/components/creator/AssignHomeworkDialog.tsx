'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { JoinQrCode } from '@/components/ui/JoinQrCode';
import { cn } from '@/lib/utils';
import {
  buildAssignmentUrl,
  createAssignment,
  defaultDueDate,
  formatDueDate,
  MIN_DUE_DELAY_MS,
  parseDateTimeLocalValue,
  toDateTimeLocalValue,
  validateDueDate,
} from '@/lib/assignments';
import type { ExplanationTiming, ScoringMode, Session } from '@/types';

interface AssignHomeworkDialogProps {
  quizId: string;
  quizTitle?: string;
  onClose: () => void;
  /** Appelé avec la session créée (pour rafraîchir une liste, par exemple). */
  onCreated?: (session: Session) => void;
}

const SCORING_OPTIONS: { value: ScoringMode; label: string; description: string }[] = [
  {
    value: 'accuracy',
    label: 'Précision',
    description: 'Toute bonne réponse donnée dans le temps rapporte le maximum.',
  },
  {
    value: 'speed',
    label: 'Vitesse',
    description: 'Plus l’élève répond vite et juste, plus il marque de points.',
  },
];

const EXPLANATION_OPTIONS: { value: ExplanationTiming; label: string; description: string }[] = [
  {
    value: 'each',
    label: 'Après chaque question',
    description: 'L’élève voit la correction et l’explication dès qu’il a répondu.',
  },
  {
    value: 'end',
    label: 'À la fin du devoir',
    description: 'La correction complète n’apparaît qu’une fois toutes les questions faites.',
  },
];

function getCreateErrorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!response) return 'Impossible de joindre le serveur. Réessayez.';
  const message = response.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && message.length > 0) return message.join(' ');
  return 'La création du devoir a échoué. Réessayez dans un instant.';
}

/** Modale « Assigner en devoir » : échéance, mode de score, explications, puis lien et QR. */
export function AssignHomeworkDialog({ quizId, quizTitle, onClose, onCreated }: AssignHomeworkDialogProps) {
  const titleId = useId();
  const [due, setDue] = useState(() => toDateTimeLocalValue(defaultDueDate()));
  const [minDue] = useState(() => toDateTimeLocalValue(new Date(Date.now() + MIN_DUE_DELAY_MS)));
  const [scoringMode, setScoringMode] = useState<ScoringMode>('accuracy');
  const [showExplanations, setShowExplanations] = useState<ExplanationTiming>('each');
  const [dueError, setDueError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState<Session | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const submittingRef = useRef(false);
  submittingRef.current = isSubmitting;

  useEffect(() => {
    firstFieldRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submittingRef.current) onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    if (created?.password) setLink(buildAssignmentUrl(created.password));
  }, [created]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validateDueDate(due);
    setDueError(error);
    if (error) return;
    const dueDate = parseDateTimeLocalValue(due) as Date;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const session = await createAssignment(quizId, {
        dueAt: dueDate.toISOString(),
        scoringMode,
        showExplanations,
      });
      setCreated(session);
      onCreated?.(session);
    } catch (err) {
      setSubmitError(getCreateErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-lg bg-surface p-6 shadow-lg space-y-5"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-card-title text-ink">
              {created ? 'Devoir créé' : 'Assigner en devoir'}
            </h2>
            {quizTitle && <p className="text-small text-ink-secondary">{quizTitle}</p>}
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={onClose} aria-label="Fermer">
            <X className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>

        {created ? (
          <div className="space-y-4 text-center" data-testid="assignment-created">
            <p className="text-small text-ink-secondary">
              À rendre avant le <strong className="text-ink">{formatDueDate(created.due_at ?? null) || formatDueDate(parseDateTimeLocalValue(due)?.toISOString())}</strong>.
              Partagez ce lien ou ce QR code avec vos élèves :
            </p>
            <JoinQrCode
              code={created.password}
              href={link || undefined}
              label={`QR code du devoir ${created.password}`}
              size={180}
            />
            <div className="flex items-center gap-2 rounded-md bg-ink/[0.04] p-2">
              <code className="flex-1 break-all text-left text-small" data-testid="assignment-link">
                {link}
              </code>
              <Button type="button" variant="outline" size="sm" onClick={handleCopy} aria-label="Copier le lien">
                {copied ? <Check className="w-4 h-4 text-success" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
                <span className="ml-1">{copied ? 'Copié' : 'Copier'}</span>
              </Button>
            </div>
            <p className="text-caption text-ink-secondary">
              Code : <span className="font-display tabular-nums font-semibold">{created.password}</span>
            </p>
            <Button type="button" className="w-full" onClick={onClose}>
              Terminé
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="assignment-due" className="text-small font-medium text-ink">
                Échéance
              </label>
              <input
                ref={firstFieldRef}
                id="assignment-due"
                type="datetime-local"
                value={due}
                min={minDue}
                onChange={(e) => {
                  setDue(e.target.value);
                  setDueError(null);
                }}
                aria-invalid={!!dueError}
                aria-describedby={dueError ? 'assignment-due-error' : 'assignment-due-hint'}
                className={cn(
                  'w-full min-h-[44px] rounded-md border border-borderc bg-surface px-3 py-2 text-body',
                  'focus:outline-none focus:border-primary focus:shadow-glow',
                  dueError && 'border-danger'
                )}
              />
              {dueError ? (
                <p id="assignment-due-error" role="alert" className="text-small text-danger">
                  {dueError}
                </p>
              ) : (
                <p id="assignment-due-hint" className="text-caption text-ink-secondary">
                  Au moins 15 minutes après maintenant.
                </p>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-small font-medium text-ink mb-2">Mode de score</legend>
              {SCORING_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary',
                    scoringMode === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
                  )}
                >
                  <input
                    type="radio"
                    name="assignmentScoringMode"
                    value={option.value}
                    checked={scoringMode === option.value}
                    onChange={() => setScoringMode(option.value)}
                    aria-labelledby={`assign-scoring-${option.value}-label`}
                    aria-describedby={`assign-scoring-${option.value}-desc`}
                    className="mt-1 accent-primary"
                  />
                  <span className="space-y-0.5">
                    <span id={`assign-scoring-${option.value}-label`} className="block font-medium">
                      {option.label}
                    </span>
                    <span id={`assign-scoring-${option.value}-desc`} className="block text-small text-ink-secondary">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset className="space-y-2">
              <legend className="text-small font-medium text-ink mb-2">Correction et explications</legend>
              {EXPLANATION_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-md border p-3 transition-colors focus-within:ring-2 focus-within:ring-primary',
                    showExplanations === option.value ? 'border-primary bg-primary-50' : 'border-borderc'
                  )}
                >
                  <input
                    type="radio"
                    name="assignmentExplanations"
                    value={option.value}
                    checked={showExplanations === option.value}
                    onChange={() => setShowExplanations(option.value)}
                    aria-labelledby={`assign-expl-${option.value}-label`}
                    aria-describedby={`assign-expl-${option.value}-desc`}
                    className="mt-1 accent-primary"
                  />
                  <span className="space-y-0.5">
                    <span id={`assign-expl-${option.value}-label`} className="block font-medium">
                      {option.label}
                    </span>
                    <span id={`assign-expl-${option.value}-desc`} className="block text-small text-ink-secondary">
                      {option.description}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>

            {submitError && (
              <p role="alert" className="text-small text-danger">
                {submitError}
              </p>
            )}

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Créer le devoir
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
