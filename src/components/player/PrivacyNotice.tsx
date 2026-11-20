import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Mention affichée sous le formulaire de join élève (#8).
 * Composant séparé de JoinForm pour ne pas entrer en conflit avec les évolutions du formulaire.
 */
export function PrivacyNotice() {
  const t = useTranslations('join.privacy');
  return (
    <p className="w-full max-w-md flex items-start gap-2 text-small text-ink-secondary">
      <ShieldCheck className="w-4 h-4 mt-0.5 shrink-0 text-success" aria-hidden="true" />
      <span>
        {t('text')}{' '}
        <Link href="/confidentialite" className="font-medium text-primary-700 hover:underline">
          {t('link')}
        </Link>
      </span>
    </p>
  );
}
