import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function EmptyState({ title, description, actions }: EmptyStateProps): JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-border bg-bg/40 p-6 text-center">
      <h3 className="text-base font-semibold text-text">{title}</h3>
      <p className="mt-2 text-sm text-muted">{description}</p>
      {actions ? <div className="mt-4 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
