'use server';

import { NextResponse } from 'next/server';
import { findOpenBucketsFlow } from '@/ai/flows/find-open-buckets';
import { scanStore } from '@/lib/scan-store';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { providers, keywords } = body;
    
    if (!providers || !Array.isArray(providers) || providers.length === 0) {
      return NextResponse.json({ error: 'Providers are required.' }, { status: 400 });
    }

    const scanId = `scan_${Date.now()}`;
    
    // Initialize the store for this scan
    scanStore.set(scanId, { log: [], results: [], isDone: false });

    // Start the flow but don't wait for it to complete
    findOpenBucketsFlow({ providers, keywords, scanId });

    return NextResponse.json({ scanId });
  } catch (error) {
    console.error('Error starting scan:', error);
    return NextResponse.json({ error: 'Failed to start scan' }, { status: 500 });
  }
}
