'use client';

import { useState } from 'react';
import Link from 'next/link';
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

function actionErrorMessage(err: unknown): string {
  const response = (err as { response?: { status?: number; data?: { message?: unknown } } })?.response;
  if (!response) return 'Impossible de joindre le serveur. Réessayez.';
  if (response.status === 404) return "Devoir introuvable, ou vous n'en êtes pas le créateur.";
  const message = response.data?.message;
  if (typeof message === 'string' && message.trim()) return message;
  return 'L’action a échoué. Réessayez dans un instant.';
}

/** Remplace la session dans le store (fusion avec la réponse du serveur). */
function patchStoredSession(id: string, patch: Partial<Session>) {
  useSessionStore.setState((state) => ({
    sessions: state.sessions.map((s) => (s.id === id ? { ...s, ...patch } : s)),
  }));
}

function AssignmentRow({ session }: { session: Session }) {
  const title = session.quiz_title || session.quizzes?.title || 'Quiz sans titre';
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
      setError(invalid);
      return;
    }
    const date = parseDateTimeLocalValue(newDue) as Date;
    const current = session.due_at ? new Date(session.due_at).getTime() : NaN;
    if (!Number.isNaN(current) && date.getTime() <= current) {
      setError('La nouvelle échéance doit être postérieure à l’échéance actuelle.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await extendAssignment(session.id, date.toISOString());
      patchStoredSession(session.id, { due_at: date.toISOString(), ...(updated ?? {}) });
      setIsExtending(false);
    } catch (err) {
      setError(actionErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    if (!window.confirm(`Clore le devoir « ${title} » ? Les élèves ne pourront plus répondre.`)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await closeAssignment(session.id);
      patchStoredSession(session.id, { ...(updated ?? {}), status: 'finished' });
    } catch (err) {
      setError(actionErrorMessage(err));
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
              ? 'Sans échéance'
              : isOpenAssignment(session)
                ? `Échéance : ${formatDueDate(session.due_at)}`
                : `Échéance passée (${formatDueDate(session.due_at)})`}
          </p>
          <p className="text-small text-ink-secondary">
            {completion
              ? `${completion.completed} / ${completion.started} élève${completion.started > 1 ? 's' : ''} ${
                  completion.completed > 1 ? 'ont' : 'a'
                } terminé`
              : // Contrat backend #10 : GET /sessions ne fournit pas la complétion (voir le rapport).
                'Complétion détaillée dans le rapport'}
            <span className="text-ink-tertiary"> • </span>
            <span className="font-display tabular-nums text-caption">{session.password}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={openExtend} disabled={busy}>
            <TimerReset className="w-4 h-4 mr-1" aria-hidden="true" />
            Prolonger
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={busy}>
            <Lock className="w-4 h-4 mr-1" aria-hidden="true" />
            Clore
          </Button>
          <Button variant="ghost" size="sm" asChild className="text-primary-700 hover:bg-primary-50">
            <Link href={`/creator/session/${session.id}/results`} aria-label={`Voir le rapport : ${title}`}>
              <BarChart3 className="w-4 h-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      </div>

      {isExtending && (
        <form onSubmit={submitExtend} noValidate className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <label htmlFor={fieldId} className="text-small font-medium text-ink">
              Nouvelle échéance
            </label>
            <input
              id={fieldId}
              type="datetime-local"
              value={newDue}
              onChange={(e) => {
                setNewDue(e.target.value);
                setError(null);
              }}
              className="min-h-[40px] rounded-md border border-borderc bg-surface px-3 py-1.5 text-body"
            />
          </div>
          <Button type="submit" size="sm" isLoading={busy}>
            Valider
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setIsExtending(false)} disabled={busy}>
            Annuler
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
  const open = sessions.filter((s) => isAssignment(s) && s.status !== 'finished');
  if (open.length === 0) return null;
  return (
    <section aria-labelledby="active-assignments-title" className="mb-12">
      <h2 id="active-assignments-title" className="text-h3 mb-4 flex items-center gap-2">
        <CalendarClock className="w-5 h-5 text-ink-secondary" aria-hidden="true" />
        Devoirs en cours
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {open.map((s) => (
          <AssignmentRow key={s.id} session={s} />
        ))}
      </div>
    </section>
  );
}
