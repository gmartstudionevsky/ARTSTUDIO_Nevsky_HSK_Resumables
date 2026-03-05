import { OperationForm } from '@/components/operation/OperationForm';
import { requireSupervisorOrAbove } from '@/lib/auth/guards';

export default async function OperationPage(): Promise<JSX.Element> {
  await requireSupervisorOrAbove();
  return <OperationForm />;
}
