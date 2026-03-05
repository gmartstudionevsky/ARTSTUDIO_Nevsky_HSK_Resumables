'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { desktopNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function DesktopSidebar(): JSX.Element {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 border-r border-border bg-surface p-4 md:block">
      <nav className="space-y-1">
        {desktopNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-10 items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                isActive ? 'bg-accent text-accent-contrast' : 'text-muted hover:bg-bg hover:text-text'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
