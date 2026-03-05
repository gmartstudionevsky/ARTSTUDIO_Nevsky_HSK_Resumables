import type { Metadata } from 'next';
import type { PropsWithChildren } from 'react';

import { Header } from '@/components/layout/header';
import { APP_NAME } from '@/lib/constants';

import '@/styles/globals.css';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Project skeleton for ARTSTUDIO Consumables'
};

export default function RootLayout({ children }: PropsWithChildren): JSX.Element {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
