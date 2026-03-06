'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useUiText } from '@/components/ui-texts/useUiText';
import { getMobileNavItems, mobileMoreItem } from '@/lib/navigation';
import type { NavItem, UserRole } from '@/lib/navigation';
import { cn } from '@/lib/utils';

type MeResponse = {
  user: {
    role: UserRole;
  };
};

const PRIMARY_NAV_COUNT = 4;

export function MobileBottomNav(): JSX.Element {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | undefined>(undefined);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    async function fetchRole(): Promise<void> {
      const response = await fetch('/api/auth/me', { cache: 'no-store' });
      if (!response.ok) return;
      const data = (await response.json()) as MeResponse;
      setRole(data.user.role);
    }

    void fetchRole();
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  const mobileNavItems = useMemo(() => getMobileNavItems(role), [role]);
  const primaryItems = mobileNavItems.slice(0, PRIMARY_NAV_COUNT);
  const secondaryItems = mobileNavItems.slice(PRIMARY_NAV_COUNT);

  return (
    <>
      {isMoreOpen ? (
        <button
          type="button"
          aria-label="Закрыть меню"
          onClick={() => setIsMoreOpen(false)}
          className="fixed inset-0 z-20 bg-black/25"
        />
      ) : null}

      <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-border/80 bg-surface/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur supports-[backdrop-filter]:bg-surface/85 md:hidden">
      {isMoreOpen && secondaryItems.length > 0 ? (
        <div
          id="mobile-more-menu"
          className="absolute bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-2 z-30 w-60 rounded-xl border border-border/80 bg-bg p-2 shadow-xl"
        >
          <ul className="space-y-1">
            {secondaryItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    pathname === item.href ? 'bg-accent/10 text-accent' : 'text-text hover:bg-surface'
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ul className="grid grid-cols-5 gap-1">
        {primaryItems.map((item) => (
          <li key={item.href}>
            <NavItemButton item={item} isActive={pathname === item.href} />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setIsMoreOpen((value) => !value)}
            className={cn(
              'flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
              isMoreOpen ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface'
            )}
            aria-expanded={isMoreOpen}
            aria-controls="mobile-more-menu"
          >
            <mobileMoreItem.icon className="h-4 w-4" />
            <NavItemLabel labelKey={mobileMoreItem.label.key} fallback={mobileMoreItem.label.fallback} />
          </button>
        </li>
      </ul>
      </nav>
    </>
  );
}

function NavItemButton({ item, isActive }: { item: NavItem; isActive: boolean }): JSX.Element {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        'flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[11px] font-medium leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        isActive ? 'bg-accent/10 text-accent' : 'text-muted hover:bg-surface'
      )}
    >
      <Icon className="h-4 w-4" />
      <NavItemLabel labelKey={item.label.key} fallback={item.label.fallback} />
    </Link>
  );
}

function NavItemLabel({ labelKey, fallback }: { labelKey: string; fallback: string }): JSX.Element {
  const label = useUiText(labelKey, fallback);
  return <span>{label}</span>;
}
