'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { useSessionStore } from '@/store/sessionStore';

interface DeleteSessionButtonProps {
  sessionId: string;
  /** Libellé lisible de la session (titre du quiz), repris dans la confirmation. */
  sessionLabel?: string;
  onDeleted?: () => void;
}

function getErrorKey(err: unknown) {
  const status = (err as { response?: { status?: number } })?.response?.status;
  // Le backend répond 404 si la session n'existe pas ou si le demandeur n'en est pas le créateur.
  return status === 404 ? ('errors.notFound' as const) : ('errors.generic' as const);
}

/**
 * Action « Supprimer la session et ses données » avec confirmation explicite.
 * Appelle DELETE /api/sessions/:id (suppression en cascade des participants et réponses côté backend).
 */
export function DeleteSessionButton({ sessionId, sessionLabel, onDeleted }: DeleteSessionButtonProps) {
  const t = useTranslations('deleteSession');
  const tc = useTranslations('common');
  const deleteSession = useSessionStore((state) => state.deleteSession);
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;
    cancelRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) setIsOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, isDeleting]);

  const open = () => {
    setError('');
    setIsOpen(true);
  };

  const confirm = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await deleteSession(sessionId);
      setIsOpen(false);
      onDeleted?.();
    } catch (err) {
      setError(t(getErrorKey(err)));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={open}
        aria-label={sessionLabel ? t('actionAria', { label: sessionLabel }) : t('action')}
        title={t('action')}
        className="text-danger hover:bg-danger-50"
      >
        <Trash2 className="w-4 h-4" aria-hidden="true" />
      </Button>

      {/* Portail vers <body> : la carte parente a un transform (hover), qui casserait `position: fixed`. */}
      {isOpen &&
        createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="w-full max-w-md rounded-lg border border-borderc bg-surface p-6 shadow-md space-y-4"
          >
            <h2 id={titleId} className="text-card-title text-ink">
              {t('title')}
            </h2>
            <div id={descId} className="space-y-2 text-small text-ink-secondary">
              {sessionLabel && (
                <p>
                  {t('sessionLabel')} <strong className="text-ink">{sessionLabel}</strong>
                </p>
              )}
              <p>
                {t('warning')}
              </p>
            </div>
            {error && (
              <p role="alert" className="text-small text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-3">
              <Button
                ref={cancelRef}
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isDeleting}
              >
                {tc('cancel')}
              </Button>
              <Button type="button" variant="danger" onClick={confirm} isLoading={isDeleting}>
                {t('confirm')}
              </Button>
            </div>
          </div>
        </div>,
          document.body
        )}
    </>
  );
}
