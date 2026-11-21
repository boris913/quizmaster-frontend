'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useLocalizedMessage } from '@/i18n/localizeMessage';
import { BarChart3, CalendarClock, Lock, TimerReset } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSessionStore } from '@/store/sessionStore';
import {
  closeAssignment,
  extendAssignment,
  formatDueDate,
  getAssignmentCompletion,
  isAssignment,
  isOpenAssignment,
  parseDateTimeLocalValue,
  toDateTimeLocalValue,
  validateDueDate,
} from '@/lib/assignments';
import type { Session } from '@/types';

type ErrorKey = 'errors.network' | 'errors.notFound' | 'errors.generic';

/** Message du serveur (en français) seulement en français ; sinon un message traduit. */
function actionErrorMessage(err: unknown, t: (key: ErrorKey) => string, locale: string): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!response) return t('errors.network');
  if (response.status === 404) return t('errors.notFound');
  const message = response.data?.message;
  if (locale === 'fr' && typeof message === 'string' && message.trim()) return message;
  return t('errors.generic');
}

/** Remplace la session dans le store (fusion avec la réponse du serveur). */
function patchStoredSession(id: string, patch: Partial<Session>) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }));
}

function AssignmentRow({ session }: { session: Session }) {
  const t = useTranslations('activeAssignments');
  const tc = useTranslations('common');
  const locale = useLocale();
  const localize = useLocalizedMessage();
  const title = session.quiz_title || session.quizzes?.title || t('untitled');
  const completion = getAssignmentCompletion(session);
  const [isExtending, setIsExtending] = useState(false);
  const [newDue, setNewDue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fieldId = `extend-${session.id}`;

  const openExtend = () => {
    const current = session.due_at ? new Date(session.due_at).getTime() : Date.now();
    const base = Math.max(Number.isNaN(current) ? Date.now() : current, Date.now());
    setNewDue(toDateTimeLocalValue(new Date(base + 24 * 60 * 60 * 1000)));
    setError(null);
    setIsExtending(true);
  };

  const submitExtend = async (e: React.FormEvent) => {
    e.preventDefault();
    const invalid = validateDueDate(newDue);
    if (invalid) {
      setError(localize(invalid) ?? invalid);
      return;
    }
    const date = parseDateTimeLocalValue(newDue) as Date;
    const current = session.due_at ? new Date(session.due_at).getTime() : NaN;
    if (!Number.isNaN(current) && date.getTime() <= current) {
      setError(t('errors.notLater'));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await extendAssignment(session.id, date.toISOString());
      patchStoredSession(session.id, { due_at: date.toISOString(), ...(updated ?? {}) });
      setIsExtending(false);
    } catch (err) {
      setError(actionErrorMessage(err, t, locale));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm(t('confirmClose', { title }))) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await closeAssignment(session.id);
      patchStoredSession(session.id, { ...(updated ?? {}), status: 'finished' });
    } catch (err) {
      setError(actionErrorMessage(err, t, locale));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 space-y-3" data-testid="assignment-row">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-card-title text-ink">{title}</h3>
          <p className="text-small text-ink-secondary flex items-center gap-1.5">
            <CalendarClock className="w-4 h-4" aria-hidden="true" />
            {!session.due_at
              ? t('noDue')
              : isOpenAssignment(session)
                ? t('due', { date: formatDueDate(session.due_at, locale) })
                : t('duePassed', { date: formatDueDate(session.due_at, locale) })}
          </p>
          <p className="text-small text-ink-secondary">
            {completion
              ? t('completion', { completed: completion.completed, started: completion.started })
              : // Contrat backend #10 : GET /sessions ne fournit pas la complétion (voir le rapport).
                t('completionInReport')}
            <span className="text-ink-tertiary"> • </span>
            <span className="font-display tabular-nums text-caption">{session.password}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openExtend} disabled={busy}>
            <TimerReset className="w-4 h-4" aria-hidden="true" />
            {t('extend')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={busy}>
            <Lock className="w-4 h-4" aria-hidden="true" />
            {t('close')}
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-primary-700 hover:bg-primary-50">
            <Link href={`/creator/session/${session.id}/results`} aria-label={t('reportAria', { title })}>
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {isExtending && (
        <form onSubmit={submitExtend} noValidate className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={fieldId} className="text-small font-medium text-ink">
              {t('newDue')}
            </label>
            <input
              id={fieldId}
              type="datetime-local"
              value={newDue}
              onChange={(e) => {
                setNewDue(e.target.value);
                setError(null);
              }}
              className="min-h-[40px] rounded-md border border-borderc-strong bg-surface px-3 py-1.5 text-body text-ink"
            />
          </div>
          <Button type="submit" size="sm" isLoading={busy}>
            {t('confirm')}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsExtending(false)} disabled={busy}>
            {tc('cancel')}
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-small text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}

/**
 * Section « Devoirs en cours » du tableau de bord : devoirs non clos. Un devoir échu reste
 * listé (signalé comme tel) pour pouvoir être prolongé ou clos.
 */
export function ActiveAssignments({ sessions }: { sessions: Session[] }) {
  const t = useTranslations('activeAssignments');
  const open = sessions.filter((s) => isAssignment(s) && s.status !== 'finished');
  if (open.length === 0) return null;
  return (
    <section aria-labelledby="active-assignments-title" className="mb-12">
      <h2 id="active-assignments-title" className="text-h3 mb-4 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-ink-secondary" aria-hidden="true" />
        {t('title')}
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {open.map((s) => (
          <AssignmentRow key={s.id} session={s} />
        ))}
      </div>
    </section>
  );
}
