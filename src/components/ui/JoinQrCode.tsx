'use client';

import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { buildJoinUrl, normalizeSessionCode } from '@/lib/sessionCode';

interface JoinQrCodeProps {
  /** Code de la session (champ `password`). */
  code: string;
  /** Côté du QR en pixels. */
  size?: number;
  /** Affiche le lien direct sous le QR. */
  showUrl?: boolean;
  className?: string;
  urlClassName?: string;
}

/**
 * QR code menant à `/player/join?code=...` (lien direct qui pré-remplit le code).
 * Réutilisable : tableau de bord de session, écran de projection, et plus tard le mode devoir.
 */
export function JoinQrCode({ code, size = 160, showUrl = false, className, urlClassName }: JoinQrCodeProps) {
  // L'URL dépend de window.location quand NEXT_PUBLIC_APP_URL n'est pas défini :
  // on la calcule après le montage pour éviter un écart d'hydratation SSR / client.
  const [url, setUrl] = useState<string | null>(null);
  const normalized = normalizeSessionCode(code);

  useEffect(() => {
    setUrl(normalized ? buildJoinUrl(normalized) : null);
  }, [normalized]);

  return (
    <figure className={cn('inline-flex flex-col items-center gap-2', className)}>
      <div
        className="rounded-md bg-white p-2"
        style={{ width: size + 16, height: size + 16 }}
        data-testid="join-qr"
        data-url={url ?? undefined}
      >
        {url && (
          <QRCodeSVG
            value={url}
            size={size}
            level="M"
            role="img"
            aria-label={`QR code pour rejoindre la session ${normalized}`}
          />
        )}
      </div>
      {showUrl && url && (
        <figcaption className={cn('text-caption text-ink-secondary break-all text-center', urlClassName)}>
          {url}
        </figcaption>
      )}
    </figure>
  );
}
