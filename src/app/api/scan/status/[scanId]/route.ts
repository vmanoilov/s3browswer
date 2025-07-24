'use server';

import { NextResponse } from 'next/server';
import { scanStore } from '@/lib/scan-store';

export async function GET(req: Request, { params }: { params: { scanId: string } }) {
  const { scanId } = params;
  
  if (!scanId) {
    return NextResponse.json({ error: 'Scan ID is required.' }, { status: 400 });
  }

  const data = scanStore.get(scanId);

  if (!data) {
    return NextResponse.json({ error: 'Scan not found.' }, { status: 404 });
  }

  return NextResponse.json(data);
}
