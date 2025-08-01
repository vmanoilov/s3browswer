import { config } from 'dotenv';
config();

import '@/ai/flows/s3-misconfiguration-description.ts';
import '@/ai/flows/anomaly-detection.ts';
import '@/ai/flows/browse-s3-proxy.ts';
import '@/ai/flows/search-s3-bucket.ts';
