import type { PropsWithChildren } from 'react';

import { DesktopSidebar } from '@/components/layout/DesktopSidebar';
import { MobileBottomNav } from '@/components/layout/MobileBottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { UiTextProvider } from '@/components/ui-texts/UiTextProvider';

export function AppShell({ children }: PropsWithChildren): JSX.Element {
  return (
    <UiTextProvider>
      <div className="min-h-screen bg-bg md:flex">
        <DesktopSidebar />
        <div className="flex min-h-screen flex-1 flex-col">
          <TopBar />
          <main className="flex-1 px-4 py-6 pb-20 md:p-6">{children}</main>
        </div>
        <MobileBottomNav />
      </div>
    </UiTextProvider>
  );
}
