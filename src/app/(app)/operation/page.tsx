import { redirect } from 'next/navigation';

export default function OperationLegacyPage(): never {
  redirect('/movements');
}
