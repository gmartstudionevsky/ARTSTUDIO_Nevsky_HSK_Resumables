import { Container } from '@/components/layout/container';
import { APP_VERSION } from '@/lib/constants';
import { env } from '@/lib/env';

export default function HealthPage(): JSX.Element {
  return (
    <main className="py-16">
      <Container>
        <h1 className="text-2xl font-semibold">Health Status</h1>
        <ul className="mt-4 space-y-2 text-slate-700">
          <li>
            <span className="font-medium">Status:</span> OK
          </li>
          <li>
            <span className="font-medium">Version:</span> {APP_VERSION}
          </li>
          <li>
            <span className="font-medium">Environment:</span> {env.NODE_ENV}
          </li>
        </ul>
      </Container>
    </main>
  );
}
