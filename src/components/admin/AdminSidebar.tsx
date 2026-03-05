'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUiText } from '@/components/ui-texts/useUiText';
import { adminNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function AdminSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="rounded-lg border border-border bg-surface p-3">
      <nav className="space-y-1">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm',
                isActive ? 'bg-accent text-accent-contrast' : 'text-muted hover:bg-bg hover:text-text'
              )}
            >
              <Icon className="h-4 w-4" />
              <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function NavItemLabel({ labelKey, fallback }: { labelKey: string; fallback: string }): JSX.Element {
  const label = useUiText(labelKey, fallback);
  return <span>{label}</span>;
}
