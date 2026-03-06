import type { PropsWithChildren } from 'react';

import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { UiTextProvider } from '@/components/ui-texts/UiTextProvider';

export function AppShell({ children }: PropsWithChildren): JSX.Element {
  return (
    <UiTextProvider>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(227,174,90,0.08),_transparent_40%),_rgb(var(--bg))] md:flex">
        <DesktopSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-7">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </UiTextProvider>
  );
}
