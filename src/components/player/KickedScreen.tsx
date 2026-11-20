'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { UserX } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

/** Écran affiché au joueur exclu par le créateur (`participant:kicked`). */
export function KickedScreen() {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Focus sur le titre pour que le changement d'écran soit annoncé aux lecteurs d'écran.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <Card tier="primary" className="p-10 text-center max-w-md w-full space-y-4">
        <UserX className="w-14 h-14 mx-auto text-danger" strokeWidth={1.5} aria-hidden="true" />
        <h1 ref={headingRef} tabIndex={-1} className="text-h3 focus:outline-none">
          Tu as été retiré de la partie
        </h1>
        <p className="text-small text-ink-secondary">
          L&apos;enseignant t&apos;a exclu de cette session. Tu ne peux pas la rejoindre à nouveau.
        </p>
        <Button variant="outline" asChild>
          <Link href="/">Retour à l&apos;accueil</Link>
        </Button>
      </Card>
    </div>
  );
}
