import { Container } from '@/components/layout/container';
import { APP_VERSION } from '@/lib/constants';
import { getEnv } from '@/lib/env';

export default function HealthPage(): JSX.Element {
  const envResult = getEnv();
  const nodeEnv = envResult.ok ? envResult.data.NODE_ENV : process.env.NODE_ENV ?? 'unknown';

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
            <span className="font-medium">Environment:</span> {nodeEnv}
          </li>
        </ul>
      </Container>
    </main>
  );
}
