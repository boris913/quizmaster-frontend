import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  /** Taille du symbole en pixels. */
  size?: number;
  /** Affiche le nom « kwizora » à côté du symbole. */
  withWordmark?: boolean;
}

/**
 * Symbole Kwizora : la grille de réponses d'un quiz (2 × 2), dont une
 * réponse se distingue, la bonne. Trois carrés neutres, un disque accent.
 * Les couleurs suivent le thème (clair / sombre) via les tokens.
 */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={cn('shrink-0', className)}
      aria-hidden="true"
      focusable="false"
    >
      <rect x="2" y="2" width="12.5" height="12.5" rx="3" className="fill-ink" />
      <circle cx="23.75" cy="8.25" r="6.75" className="fill-primary" />
      <rect x="2" y="17.5" width="12.5" height="12.5" rx="3" className="fill-ink" />
      <rect x="17.5" y="17.5" width="12.5" height="12.5" rx="3" className="fill-ink" />
    </svg>
  );
}

export function Logo({ className, size = 28, withWordmark = false }: LogoProps) {
  if (!withWordmark) {
    return (
      <span role="img" aria-label="Kwizora" className={cn('inline-flex', className)}>
        <LogoMark size={size} />
      </span>
    );
  }
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size} />
      <span
        className="font-display font-bold tracking-[-0.03em] text-ink leading-none"
        style={{ fontSize: Math.round(size * 0.78) }}
      >
        kwizora
      </span>
    </span>
  );
}
