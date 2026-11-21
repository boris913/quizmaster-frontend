import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual weight of the card, used to establish hierarchy on a screen:
   * primary cards should draw the eye first, tertiary cards recede.
   */
  tier?: 'primary' | 'secondary' | 'tertiary';
  /** Hover state for clickable / navigable cards (border, no lift). */
  interactive?: boolean;
}

const tierStyles: Record<NonNullable<CardProps['tier']>, string> = {
  primary: 'bg-surface border border-borderc shadow-sm',
  secondary: 'bg-surface border border-borderc shadow-xs',
  tertiary: 'bg-subtle border border-transparent shadow-none',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tier = 'secondary', interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg transition-colors duration-150',
          tierStyles[tier],
          interactive &&
            'cursor-pointer hover:border-borderc-strong hover:bg-subtle/60',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
