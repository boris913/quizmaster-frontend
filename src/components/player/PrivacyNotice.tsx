import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * Mention affichée sous le formulaire de join élève (#8).
 * Composant séparé de JoinForm pour ne pas entrer en conflit avec les évolutions du formulaire.
 */
export function PrivacyNotice() {
  return (
    <p className="w-full max-w-md flex items-start gap-2 text-small text-ink-secondary">
      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>
        Aucun compte, aucune donnée personnelle demandée. N&apos;utilise pas ton nom complet.{' '}
        <Link href="/confidentialite" className="font-medium text-primary-700 hover:underline">
          En savoir plus sur la confidentialité
        </Link>
      </span>
    </p>
  );
}
