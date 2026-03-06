'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUiText } from '@/components/ui-texts/useUiText';
import { desktopNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function DesktopSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-border/70 bg-gradient-to-b from-surface to-bg/90 p-4 md:block">
      <div className="mb-4 rounded-xl border border-border/70 bg-bg/40 px-3 py-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">Навигация</p>
      </div>
      <nav className="space-y-1.5">
        {desktopNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex min-h-11 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                isActive
                  ? 'border border-accent/20 bg-accent/15 text-accent shadow-[0_8px_20px_rgba(227,174,90,0.18)]'
                  : 'text-muted hover:border hover:border-border/60 hover:bg-bg/60 hover:text-text'
              )}
            >
              <Icon className={cn('h-4 w-4 transition-transform duration-200', isActive ? '' : 'group-hover:scale-110')} />
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
