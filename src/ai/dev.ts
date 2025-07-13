import { config } from 'dotenv';
config();

import '@/ai/flows/s3-misconfiguration-description.ts';
import '@/ai/flows/anomaly-detection.ts';
import '@/ai/flows/find-open-buckets.ts';
