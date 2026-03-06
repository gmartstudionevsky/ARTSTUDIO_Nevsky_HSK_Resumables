import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-transparent px-4 text-sm font-semibold tracking-[0.01em] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-contrast shadow-[0_10px_24px_rgba(227,174,90,0.22)] hover:-translate-y-[1px] hover:bg-accent/90',
        secondary: 'border-border bg-surface text-text hover:border-accent/35 hover:bg-surface/85',
        ghost: 'bg-transparent text-text hover:bg-surface/70',
        danger: 'bg-critical text-white shadow-[0_8px_18px_rgba(180,68,88,0.26)] hover:bg-critical/90'
      },
      size: {
        sm: 'h-10 px-3',
        md: 'h-11 px-4',
        lg: 'h-12 px-6 text-base'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading = false, children, disabled, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        ref={ref}
        {...props}
      >
        {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
