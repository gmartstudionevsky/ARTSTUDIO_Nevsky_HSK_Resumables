'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useUiText } from '@/components/ui-texts/useUiText';
import { mainNavItems } from '@/lib/navigation';
import { cn } from '@/lib/utils';

export function MobileBottomNav(): JSX.Element {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-surface px-2 py-2 md:hidden">
      <ul className="grid grid-cols-5 gap-1">
        {mainNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex min-h-10 flex-col items-center justify-center gap-1 rounded-md px-2 py-1 text-[11px] leading-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                  isActive ? 'bg-bg text-text' : 'text-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function NavItemLabel({ labelKey, fallback }: { labelKey: string; fallback: string }): JSX.Element {
  const label = useUiText(labelKey, fallback);
  return <span>{label}</span>;
}
