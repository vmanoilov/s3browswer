'use server';

/**
 * @fileOverview A Genkit flow to find publicly accessible cloud storage resources.
 *
 * - findOpenBuckets - A function that returns a list of open storage buckets for a given provider.
 * - FindOpenBucketsInput - The input type for the findOpenBuckets function.
 * - FindOpenBucketsOutput - The return type for the findOpenBuckets function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import { discoverAwsBuckets } from '@/services/aws';


const BucketInfoSchema = z.object({
  id: z.string().describe('A unique identifier for the bucket scan result.'),
  name: z.string().describe('The name of the storage resource.'),
  status: z.enum(['Secure', 'Public', 'Vulnerable']).describe('The security status of the bucket.'),
  provider: z.string().describe('The cloud provider where the resource is located.'),
  details: z.string().describe('A description of the bucket configuration and/or vulnerability.'),
  region: z.string().describe('The region where the resource is located.'),
});
export type BucketInfo = z.infer<typeof BucketInfoSchema>;

const FindOpenBucketsInputSchema = z.object({
  providers: z.array(z.string()).describe('The cloud providers to scan. e.g., AWS, GCP, DigitalOcean.'),
  keywords: z.array(z.string()).optional().describe('Optional list of keywords to generate and test potential bucket names.'),
});
export type FindOpenBucketsInput = z.infer<typeof FindOpenBucketsInputSchema>;

const FindOpenBucketsOutputSchema = z.object({
  buckets: z.array(BucketInfoSchema).describe('A list of storage resources with their configuration details.'),
});
export type FindOpenBucketsOutput = z.infer<typeof FindOpenBucketsOutputSchema>;


// This function orchestrates which discovery process to run based on the provider.
const performDiscovery = async (provider: string, keywords?: string[]): Promise<BucketInfo[]> => {
  const providerKey = provider.toLowerCase().replace(/\s/g, '');

  switch(providerKey) {
      case 'aws':
        const awsResult = await discoverAwsBuckets(keywords);
        return awsResult.buckets;
      // NOTE: You would add cases for other providers here by creating new service files.
      // e.g., import { discoverGcpBuckets } from '@/services/gcp';
      case 'gcp':
      case 'digitalocean':
      case 'dreamhost':
      case 'linode':
      case 'scaleway':
      case 'custom':
         // Placeholder for other providers
         console.warn(`Scanning for provider '${provider}' is not yet implemented.`);
         return [];
      default:
        console.error(`Unknown provider: ${provider}`);
        return [];
  }
};


const findOpenBucketsFlow = ai.defineFlow(
  {
    name: 'findOpenBucketsFlow',
    inputSchema: FindOpenBucketsInputSchema,
    outputSchema: FindOpenBucketsOutputSchema,
  },
  async ({ providers, keywords }) => {
    const allBuckets: BucketInfo[] = [];

    const discoveryPromises = providers.map(provider => performDiscovery(provider, keywords));
    const results = await Promise.all(discoveryPromises);
    
    results.forEach(buckets => {
      allBuckets.push(...buckets);
    });

    return { buckets: allBuckets };
  }
);

export async function findOpenBuckets(input: FindOpenBucketsInput): Promise<FindOpenBucketsOutput> {
  return findOpenBucketsFlow(input);
}
