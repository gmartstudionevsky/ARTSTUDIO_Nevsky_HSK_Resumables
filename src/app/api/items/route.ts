import { createAccountingPosition, listAccountingPositions } from '@/app/api/accounting-positions/shared';

export async function GET(request: Request) {
  return listAccountingPositions(request, { compatibilityRoute: true });
}

export async function POST(request: Request) {
  return createAccountingPosition(request, { compatibilityRoute: true });
}
