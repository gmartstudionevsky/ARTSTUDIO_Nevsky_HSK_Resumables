import type { PropsWithChildren } from 'react';

import { cn } from '@/lib/utils';

type ContainerProps = PropsWithChildren<{
  className?: string;
}>;

export function Container({ children, className }: ContainerProps): JSX.Element {
  return <div className={cn('mx-auto w-full max-w-5xl px-4 md:px-6', className)}>{children}</div>;
}
