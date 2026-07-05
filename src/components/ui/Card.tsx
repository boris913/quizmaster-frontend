import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * Visual weight of the card, used to establish hierarchy on a screen:
   * primary cards should draw the eye first, tertiary cards recede.
   */
  tier?: 'primary' | 'secondary' | 'tertiary';
  /** Adds hover lift + shadow, for clickable / navigable cards. */
  interactive?: boolean;
}

const tierStyles: Record<NonNullable<CardProps['tier']>, string> = {
  primary: 'bg-surface border border-borderc shadow-md',
  secondary: 'bg-surface border border-borderc shadow-sm',
  tertiary: 'bg-background border border-borderc/70 shadow-none',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, tier = 'secondary', interactive = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-lg transition-all duration-200',
          tierStyles[tier],
          interactive &&
            'hover:-translate-y-0.5 hover:shadow-md cursor-pointer will-change-transform',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
