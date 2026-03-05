'use client';

import { useState, type ReactNode } from 'react';

import { cn } from '@/lib/utils';

interface HelpTipProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function HelpTip({ label, children, className }: HelpTipProps): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <span className={cn('relative inline-flex items-center', className)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className="peer inline-flex h-6 w-6 items-center justify-center rounded-full border border-border bg-surface text-xs font-semibold text-muted transition hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        onClick={() => setOpen((prev) => !prev)}
      >
        ?
      </button>
      <span className="pointer-events-none absolute left-1/2 top-full z-20 mt-2 hidden w-60 -translate-x-1/2 rounded-md border border-border bg-bg p-2 text-xs text-text shadow-md peer-hover:block peer-focus-visible:block md:block md:opacity-0 md:transition md:peer-hover:opacity-100 md:peer-focus-visible:opacity-100">
        {children}
      </span>
      {open ? (
        <span className="absolute left-1/2 top-full z-20 mt-2 w-60 -translate-x-1/2 rounded-md border border-border bg-bg p-2 text-xs text-text shadow-md md:hidden">
          {children}
        </span>
      ) : null}
    </span>
  );
}

export const Tooltip = HelpTip;
