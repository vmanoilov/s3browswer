
'use server';

import {ai} from '@/ai/genkit';
import { discoverAwsBuckets } from '@/services/aws';
import { z } from 'genkit';
import {
  FindOpenBucketsInputSchema as BaseInputSchema,
  FindOpenBucketsOutputSchema,
  ScanUpdateSchema,
} from './schemas';
import { scanStore } from '@/lib/scan-store';

const findOpenBucketsInputSchema = BaseInputSchema.extend({
  scanId: z.string(),
});

type FindOpenBucketsInput = z.infer<typeof findOpenBucketsInputSchema>;

// Helper to add updates to the shared store
const updateScanStore = (scanId: string, update: z.infer<typeof ScanUpdateSchema>) => {
  const current = scanStore.get(scanId);
  if (current) {
    if (update.type === 'log') {
      current.log.push(`${update.message}`);
    } else if (update.type === 'result') {
      current.log.push(`[FOUND] ${update.bucket.provider}: ${update.bucket.name} - Status: ${update.bucket.status}`);
      current.results.push(update.bucket);
    }
    scanStore.set(scanId, { ...current });
  }
};


// This function orchestrates which discovery process to run based on the provider.
const performDiscovery = async (
    provider: string,
    keywords: string[] | undefined,
    scanId: string
  ) => {
  const providerKey = provider.toLowerCase().replace(/\s/g, '');

  const streamUpdate = (update: z.infer<typeof ScanUpdateSchema>) => {
    updateScanStore(scanId, update);
  };
  
  switch(providerKey) {
      case 'aws':
        await discoverAwsBuckets(keywords, streamUpdate);
        break;
      // NOTE: You would add cases for other providers here by creating new service files.
      // e.g., import { discoverGcpBuckets } from '@/services/gcp';
      case 'gcp':
      case 'digitalocean':
      case 'dreamhost':
      case 'linode':
      case 'scaleway':
      case 'custom':
         // Placeholder for other providers
         streamUpdate({type: 'log', message: `Scanning for provider '${provider}' is not yet implemented.`});
         break;
      default:
        streamUpdate({type: 'log', message: `Unknown provider: ${provider}`});
        break;
  }
};


export const findOpenBucketsFlow = ai.defineFlow(
  {
    name: 'findOpenBucketsFlow',
    inputSchema: findOpenBucketsInputSchema,
    outputSchema: FindOpenBucketsOutputSchema,
  },
  async ({ providers, keywords, scanId }) => {
    
    updateScanStore(scanId, {type: 'log', message: `Starting scan for ${providers.join(', ')}...`});

    const discoveryPromises = providers.map(provider => performDiscovery(provider, keywords, scanId));
    await Promise.all(discoveryPromises);

    updateScanStore(scanId, {type: 'log', message: 'Scan completed.'});
    
    // Mark the scan as done in the store.
    const finalState = scanStore.get(scanId);
    if (finalState) {
        scanStore.set(scanId, { ...finalState, isDone: true });
    }

    return finalState?.results || [];
  }
);
