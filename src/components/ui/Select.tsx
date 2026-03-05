import * as React from 'react';

import { cn } from '@/lib/utils';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helperText?: string;
  errorText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ id, label, helperText, errorText, className, children, ...props }, ref) => {
    const generatedId = React.useId();
    const selectId = id ?? generatedId;
    const describedById = `${selectId}-hint`;

    return (
      <div className="space-y-1.5">
        {label ? <label htmlFor={selectId} className="text-sm font-medium text-text">{label}</label> : null}
        <select
          id={selectId}
          ref={ref}
          className={cn(
            'h-11 w-full rounded-md border bg-bg px-3 text-sm text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
            errorText ? 'border-critical' : 'border-border',
            className
          )}
          aria-describedby={helperText || errorText ? describedById : undefined}
          aria-invalid={Boolean(errorText)}
          {...props}
        >
          {children}
        </select>
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

Select.displayName = 'Select';
