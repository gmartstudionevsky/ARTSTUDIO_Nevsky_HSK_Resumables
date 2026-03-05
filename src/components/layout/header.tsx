import { APP_NAME } from '@/lib/constants';

import { Container } from './container';

export function Header(): JSX.Element {
  return (
    <header className="border-b border-slate-200 bg-white">
      <Container className="py-4">
        <p className="text-sm font-semibold tracking-wide text-slate-700">{APP_NAME}</p>
      </Container>
    </header>
  );
}
