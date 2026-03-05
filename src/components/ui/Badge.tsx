import type { HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-semibold', {
  variants: {
    variant: {
      ok: 'bg-ok/15 text-ok',
      warn: 'bg-warn/20 text-warn',
      critical: 'bg-critical/20 text-critical',
      neutral: 'bg-surface text-muted border border-border'
    }
  },
  defaultVariants: {
    variant: 'neutral'
  }
});

interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps): JSX.Element {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
