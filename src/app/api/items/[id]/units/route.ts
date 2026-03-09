import { GET as canonicalGET, PUT as canonicalPUT } from '@/app/api/accounting-positions/[id]/units/route';

import { withCompatHeaders } from '../../compat';

export async function GET(request: Request, context: { params: { id: string } }) {
  return withCompatHeaders(await canonicalGET(request, context));
}

export async function PUT(request: Request, context: { params: { id: string } }) {
  return withCompatHeaders(await canonicalPUT(request, context));
}
