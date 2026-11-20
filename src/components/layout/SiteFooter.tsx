import Link from 'next/link';

/** Pied de page commun : lien vers la page de confidentialité (exigence #8). */
export function SiteFooter() {
  return (
    <footer className="border-t border-borderc">
      <div className="max-w-content mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-small text-ink-tertiary">
        <span>© Kwizora</span>
        <nav aria-label="Liens légaux">
          <Link href="/confidentialite" className="text-ink-secondary hover:text-ink hover:underline">
            Confidentialité
          </Link>
        </nav>
      </div>
    </footer>
  );
}
