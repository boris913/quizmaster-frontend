import { forwardRef, InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="text-small font-medium text-ink">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full min-h-[44px] rounded-md border border-borderc-strong bg-surface px-3 py-2 text-body text-ink placeholder:text-ink-tertiary',
            'transition-shadow duration-200',
            'focus:outline-none focus:border-primary focus:shadow-glow',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error && 'border-danger focus:border-danger focus:shadow-none',
            className
          )}
          aria-invalid={!!error}
          aria-describedby={error && inputId ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p id={inputId ? `${inputId}-error` : undefined} className="text-small text-danger">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
