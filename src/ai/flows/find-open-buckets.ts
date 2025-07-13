'use server';

/**
 * @fileOverview A Genkit flow to find publicly accessible cloud storage resources.
 *
 * - findOpenBuckets - A function that returns a list of open storage buckets for a given provider.
 * - FindOpenBucketsInput - The input type for the findOpenBuckets function.
 * - FindOpenBucketsOutput - The return type for the findOpenBuckets function.
 */

import {ai} from '@/ai/genkit';
import { discoverAwsBuckets } from '@/services/aws';
import { Stream } from 'genkit/stream';
import {
  FindOpenBucketsInputSchema,
  FindOpenBucketsOutputSchema,
  ScanUpdateSchema,
  type FindOpenBucketsInput,
  type ScanUpdate
} from './schemas';


// This function orchestrates which discovery process to run based on the provider.
const performDiscovery = async (
    provider: string,
    keywords: string[] | undefined,
    stream: Stream<ScanUpdate>
  ) => {
  const providerKey = provider.toLowerCase().replace(/\s/g, '');

  switch(providerKey) {
      case 'aws':
        await discoverAwsBuckets(keywords, stream);
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
         stream({type: 'log', message: `Scanning for provider '${provider}' is not yet implemented.`});
         break;
      default:
        stream({type: 'log', message: `Unknown provider: ${provider}`});
        break;
  }
};


const findOpenBucketsFlow = ai.defineFlow(
  {
    name: 'findOpenBucketsFlow',
    inputSchema: FindOpenBucketsInputSchema,
    outputSchema: FindOpenBucketsOutputSchema,
    streamSchema: ScanUpdateSchema,
  },
  async ({ providers, keywords }, stream) => {
    
    stream({type: 'log', message: `Starting scan for ${providers.join(', ')}...`});

    const discoveryPromises = providers.map(provider => performDiscovery(provider, keywords, stream));
    await Promise.all(discoveryPromises);

    stream({type: 'log', message: 'Scan completed.'});
    return [];
  }
);

export async function findOpenBuckets(input: FindOpenBucketsInput): Promise<Stream<ScanUpdate>> {
  const {stream} = await findOpenBucketsFlow(input);
  return stream;
}
