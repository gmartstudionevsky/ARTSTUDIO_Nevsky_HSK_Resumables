import * as React from 'react';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, helperText, errorText, className, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id ?? generatedId;
    const describedById = `${inputId}-hint`;

    return (
      <div className="space-y-1.5">
        {label ? <label htmlFor={inputId} className="text-sm font-medium text-text">{label}</label> : null}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            'h-11 w-full rounded-md border bg-bg px-3 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            errorText ? 'border-critical' : 'border-border',
            className
          )}
          aria-describedby={helperText || errorText ? describedById : undefined}
          aria-invalid={Boolean(errorText)}
          {...props}
        />
        {errorText ? (
          <p id={describedById} className="text-xs text-critical">
            {errorText}
          </p>
        ) : helperText ? (
          <p id={describedById} className="text-xs text-muted">
            {helperText}
          </p>
        ) : null}
      </div>
    );
  }
);

Input.displayName = 'Input';
