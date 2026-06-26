import { forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('rounded-xl bg-white shadow-sm border border-neutral-200', className)}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';