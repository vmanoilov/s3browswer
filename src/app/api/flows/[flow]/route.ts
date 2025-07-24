'use server';

import { createFlowsHandler } from '@genkit-ai/next';

// Import all flows that should be exposed via the API.
import '@/ai/flows/s3-misconfiguration-description';
import '@/ai/flows/anomaly-detection';
import '@/ai/flows/find-open-buckets';

export const POST = createFlowsHandler();
