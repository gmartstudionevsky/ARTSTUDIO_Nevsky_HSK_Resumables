import { NextResponse } from 'next/server';

import { APP_SLUG, APP_VERSION } from '@/lib/constants';

export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: 'ok',
    app: APP_SLUG,
    version: APP_VERSION
  });
}
