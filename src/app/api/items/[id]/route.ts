import { getAccountingPosition, updateAccountingPosition } from '@/app/api/accounting-positions/shared';

export async function GET(request: Request, context: { params: { id: string } }) {
  return getAccountingPosition(request, context, { compatibilityRoute: true });
}

export async function PATCH(request: Request, context: { params: { id: string } }) {
  return updateAccountingPosition(request, context, { compatibilityRoute: true });
}
