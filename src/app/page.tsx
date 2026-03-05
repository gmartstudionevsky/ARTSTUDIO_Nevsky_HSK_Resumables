import { Container } from '@/components/layout/container';
import { APP_NAME } from '@/lib/constants';

export default function HomePage(): JSX.Element {
  return (
    <main className="py-16">
      <Container>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{APP_NAME} — Skeleton</h1>
        <p className="mt-4 text-slate-600">Baseline Next.js + TypeScript project scaffold is ready.</p>
      </Container>
    </main>
  );
}
