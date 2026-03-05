'use client';

import { cn } from '@/lib/utils';

interface TabItem<T extends string> {
  value: T;
  label: string;
}

interface TabsProps<T extends string> {
  value: T;
  items: TabItem<T>[];
  onChange: (value: T) => void;
}

export function Tabs<T extends string>({ value, items, onChange }: TabsProps<T>): JSX.Element {
  return (
    <div className="flex w-full flex-wrap gap-2 rounded-lg border border-border bg-surface p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            item.value === value ? 'bg-accent text-accent-contrast' : 'text-muted hover:bg-bg hover:text-text'
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
