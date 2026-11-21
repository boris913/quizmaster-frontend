'use client';

import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Copy, Check, RefreshCw, Link2Off, Link2, X } from 'lucide-react';
import {
  buildShareUrl,
  createShareLink,
  revokeShareLink,
  serverMessage,
} from '@/lib/quizSharing';

interface ShareQuizPanelProps {
  quizId: string;
  /** Jeton déjà actif (renvoyé avec le quiz), s'il y en a un. */
  initialToken?: string | null;
  onClose: () => void;
}

/**
 * Lien de partage d'un quiz entre collègues : génération, copie, régénération et
 * révocation (avec confirmation). Le collègue reçoit une copie, l'original n'est jamais modifié.
 */
export function ShareQuizPanel({ quizId, initialToken = null, onClose }: ShareQuizPanelProps) {
  const titleId = useId();
  const [token, setToken] = useState<string | null>(initialToken);
  const [busy, setBusy] = useState<'create' | 'revoke' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const link = token ? buildShareUrl(token) : null;

  const generate = async (regenerate: boolean) => {
    if (
      regenerate &&
      !window.confirm(
        'Régénérer le lien ? L’ancien lien cessera de fonctionner pour les personnes qui ne l’ont pas encore utilisé.'
      )
    ) {
      return;
    }
    setBusy('create');
    setError(null);
    setStatus(null);
    try {
      const next = await createShareLink(quizId);
      setToken(next);
      setCopied(false);
      setStatus(regenerate ? 'Nouveau lien généré. L’ancien ne fonctionne plus.' : 'Lien de partage créé.');
    } catch (e) {
      setError(serverMessage(e) ?? 'Le lien n’a pas pu être créé. Réessayez.');
    } finally {
      setBusy(null);
    }
  };

  const revoke = async () => {
    if (
      !window.confirm(
        'Révoquer le lien de partage ? Plus personne ne pourra l’utiliser. Les copies déjà faites par vos collègues sont conservées.'
      )
    ) {
      return;
    }
    setBusy('revoke');
    setError(null);
    setStatus(null);
    try {
      await revokeShareLink(quizId);
      setToken(null);
      setCopied(false);
      setStatus('Lien révoqué : il ne fonctionne plus.');
    } catch (e) {
      setError(serverMessage(e) ?? 'Le lien n’a pas pu être révoqué. Réessayez.');
    } finally {
      setBusy(null);
    }
  };

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Copie impossible : sélectionnez le lien et copiez-le manuellement.');
    }
  };

  return (
    <Card className="p-6 mb-6 space-y-4" role="region" aria-labelledby={titleId}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id={titleId} className="text-card-title text-ink">
            Partager avec un collègue
          </h2>
          <p className="text-small text-ink-secondary mt-1" data-testid="share-explanation">
            Le collègue reçoit une copie modifiable, votre quiz n&apos;est jamais modifié.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} aria-label="Fermer le partage">
          <X className="w-4 h-4" aria-hidden="true" />
        </Button>
      </div>

      {link ? (
        <div className="space-y-3">
          <label className="block text-small font-medium text-ink-secondary" htmlFor={`${titleId}-link`}>
            Lien de partage
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              id={`${titleId}-link`}
              readOnly
              value={link}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 rounded-md border border-borderc bg-background px-3 py-2 text-small font-mono"
            />
            <Button variant="secondary" size="sm" onClick={copy}>
              {copied ? (
                <Check className="w-4 h-4 mr-1" aria-hidden="true" />
              ) : (
                <Copy className="w-4 h-4 mr-1" aria-hidden="true" />
              )}
              {copied ? 'Lien copié' : 'Copier le lien'}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => generate(true)} isLoading={busy === 'create'} disabled={busy !== null}>
              <RefreshCw className="w-4 h-4 mr-1" aria-hidden="true" />
              Régénérer le lien
            </Button>
            <Button variant="outline" size="sm" onClick={revoke} isLoading={busy === 'revoke'} disabled={busy !== null}>
              <Link2Off className="w-4 h-4 mr-1" aria-hidden="true" />
              Révoquer le lien
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" onClick={() => generate(false)} isLoading={busy === 'create'} disabled={busy !== null}>
          <Link2 className="w-4 h-4 mr-1" aria-hidden="true" />
          Générer un lien de partage
        </Button>
      )}

      <p aria-live="polite" className="text-small text-success">
        {status}
      </p>
      {error && (
        <p role="alert" className="rounded-md bg-danger-50 p-3 text-small text-danger">
          {error}
        </p>
      )}
    </Card>
  );
}
