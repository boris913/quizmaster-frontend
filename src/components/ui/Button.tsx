'use client';

import { forwardRef, ButtonHTMLAttributes, cloneElement, isValidElement } from 'react';
import { motion, useReducedMotion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ConflictingMotionProps =
  | 'onAnimationStart'
  | 'onAnimationEnd'
  | 'onAnimationIteration'
  | 'onDrag'
  | 'onDragStart'
  | 'onDragEnd';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, ConflictingMotionProps> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  /** Render the single child element instead of a <button>, merging classes/behavior onto it. */
  asChild?: boolean;
}

const baseStyles =
  'inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 min-h-[44px]';

const variants: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-primary text-on-primary shadow-xs hover:bg-primary-hover',
  secondary: 'bg-primary-50 text-primary-700 hover:bg-primary-100',
  outline: 'border border-borderc-strong bg-surface text-ink hover:bg-subtle',
  ghost: 'text-ink-secondary hover:bg-ink/[0.05] hover:text-ink',
  success: 'bg-success-solid text-white shadow-xs hover:brightness-95',
  danger: 'bg-danger-solid text-white shadow-xs hover:brightness-95',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-3 text-small',
  md: 'h-11 px-4 text-body',
  lg: 'h-12 px-6 text-body',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading,
      children,
      disabled,
      asChild,
      ...props
    },
    ref
  ) => {
    const classes = cn(baseStyles, variants[variant], sizes[size], className);

    if (asChild && isValidElement(children)) {
      // Merge our interactive styles directly onto the child (e.g. a Next.js <Link>)
      // so the DOM stays semantically correct (no <a> nested in <button>).
      const child = children as React.ReactElement<{ className?: string }>;
      return cloneElement(child, {
        className: cn(classes, 'active:scale-[0.98]', child.props.className),
      });
    }

    return (
      <MotionButton
        ref={ref}
        className={classes}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </MotionButton>
    );
  }
);
Button.displayName = 'Button';

/**
 * A plain <button> with a short press feedback (no hover lift: motion answers
 * the user's action, it does not decorate). Disabled under reduced motion.
 */
const MotionButton = forwardRef<HTMLButtonElement, HTMLMotionProps<'button'>>(
  ({ children, ...props }, ref) => {
    const shouldReduceMotion = useReducedMotion();
    return (
      <motion.button
        ref={ref}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);
MotionButton.displayName = 'MotionButton';
