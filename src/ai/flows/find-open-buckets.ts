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
import { S3Client, ListBucketsCommand, GetBucketAclCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3';


const BucketInfoSchema = z.object({
  id: z.string().describe('A unique identifier for the bucket scan result.'),
  name: z.string().describe('The name of the storage resource.'),
  status: z.enum(['Secure', 'Public', 'Vulnerable']).describe('The security status of the bucket.'),
  provider: z.string().describe('The cloud provider where the resource is located.'),
  details: z.string().describe('A description of the bucket configuration and/or vulnerability.'),
  region: z.string().describe('The region where the resource is located.'),
});

const FindOpenBucketsInputSchema = z.object({
  provider: z.string().describe('The cloud provider to scan. e.g., AWS, GCP, DigitalOcean.'),
});
export type FindOpenBucketsInput = z.infer<typeof FindOpenBucketsInputSchema>;

const FindOpenBucketsOutputSchema = z.object({
  buckets: z.array(BucketInfoSchema).describe('A list of storage resources with their configuration details.'),
});
export type FindOpenBucketsOutput = z.infer<typeof FindOpenBucketsOutputSchema>;

// Helper function to check if a bucket is public based on its ACL grants.
const isBucketPublic = (grants: any[]): { public: boolean, details: string[] } => {
    const publicIndicators: string[] = [];
    let isPublic = false;

    grants.forEach(grant => {
        const granteeURI = grant.Grantee?.URI;
        if (granteeURI === 'http://acs.amazonaws.com/groups/global/AllUsers') {
            isPublic = true;
            publicIndicators.push(`Public access granted to 'AllUsers' for ${grant.Permission}.`);
        }
        if (granteeURI === 'http://acs.amazonaws.com/groups/global/AuthenticatedUsers') {
            isPublic = true; // Technically not "public" but often a high-risk configuration.
            publicIndicators.push(`Access granted to 'AuthenticatedUsers' for ${grant.Permission}.`);
        }
    });

    return { public: isPublic, details: publicIndicators };
};


// Main function to discover open buckets in an AWS environment.
const discoverAwsBuckets = async (): Promise<FindOpenBucketsOutput> => {
    const openBuckets: z.infer<typeof BucketInfoSchema>[] = [];
    
    // IMPORTANT: In a real application, configure your AWS credentials securely.
    // This will use credentials from environment variables (AWS_ACCESS_KEY_ID, etc.)
    // or an IAM role if deployed in an AWS environment.
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

    try {
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));

        if (!Buckets) {
            return { buckets: [] };
        }

        for (const bucket of Buckets) {
            if (!bucket.Name) continue;

            try {
                // 1. Check Bucket ACL
                const { Grants } = await s3Client.send(new GetBucketAclCommand({ Bucket: bucket.Name }));
                if (Grants) {
                    const { public: isPublic, details } = isBucketPublic(Grants);
                    if (isPublic) {
                        openBuckets.push({
                            id: `aws-${bucket.Name}`,
                            name: bucket.Name,
                            status: 'Vulnerable',
                            provider: 'AWS',
                            region: 'N/A', // ListBuckets doesn't return region, would need another call
                            details: `Vulnerable due to bucket ACLs. ${details.join(' ')}`
                        });
                        continue; // Found as vulnerable, no need to check further
                    }
                }

                // 2. Check Public Access Block (if not found vulnerable by ACL)
                try {
                     const { PublicAccessBlockConfiguration } = await s3Client.send(new GetPublicAccessBlockCommand({ Bucket: bucket.Name }));
                     if(PublicAccessBlockConfiguration && 
                        (PublicAccessBlockConfiguration.BlockPublicAcls && 
                         PublicAccessBlockConfiguration.BlockPublicPolicy &&
                         PublicAccessBlockConfiguration.IgnorePublicAcls &&
                         PublicAccessBlockConfiguration.RestrictPublicBuckets
                        ))
                     {
                        // This bucket is explicitly configured to be private.
                        // We can classify it as Secure and skip other checks.
                     } else {
                         // Potentially misconfigured PublicAccessBlock
                          openBuckets.push({
                            id: `aws-${bucket.Name}`,
                            name: bucket.Name,
                            status: 'Vulnerable',
                            provider: 'AWS',
                            region: 'N/A', 
                            details: `Public Access Block is not fully enabled, potentially exposing the bucket.`
                        });
                     }
                } catch(e: any) {
                    // Code 404 for GetPublicAccessBlock means it's not set, which is a potential issue.
                     if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
                         openBuckets.push({
                            id: `aws-${bucket.Name}`,
                            name: bucket.Name,
                            status: 'Public', // Could be vulnerable, but 'Public' is safer without policy check
                            provider: 'AWS',
                            region: 'N/A', 
                            details: `No Public Access Block configuration found. Bucket policy should be manually verified.`
                        });
                    }
                }

            } catch (error) {
                // Log errors for individual buckets but continue the scan
                console.error(`Could not check bucket ${bucket.Name}:`, error);
            }
        }
    } catch (error) {
        console.error("Failed to list AWS buckets:", error);
        // Throw an error that can be caught by the UI
        throw new Error("Could not connect to AWS. Please ensure your credentials and permissions are configured correctly.");
    }

    return { buckets: openBuckets };
};


// This function orchestrates which discovery process to run based on the provider.
const performDiscovery = async (provider: string): Promise<FindOpenBucketsOutput> => {
  const providerKey = provider.toLowerCase().replace(/\s/g, '');

  switch(providerKey) {
      case 'aws':
        return await discoverAwsBuckets();
      // NOTE: You would add cases for other providers here.
      // Many providers (DigitalOcean, Linode, Scaleway) have S3-compatible APIs,
      // so you could reuse `discoverAwsBuckets` by passing a custom endpoint to the S3Client.
      case 'gcp':
      case 'digitalocean':
      case 'dreamhost':
      case 'linode':
      case 'scaleway':
      case 'custom':
         // Placeholder for other providers
         console.warn(`Scanning for provider '${provider}' is not yet implemented.`);
         return { buckets: [] };
      default:
        console.error(`Unknown provider: ${provider}`);
        return { buckets: [] };
  }
};


const findOpenBucketsFlow = ai.defineFlow(
  {
    name: 'findOpenBucketsFlow',
    inputSchema: FindOpenBucketsInputSchema,
    outputSchema: FindOpenBucketsOutputSchema,
  },
  async ({ provider }) => {
    // The discovery process now involves real API calls and can take time.
    return performDiscovery(provider);
  }
);

export async function findOpenBuckets(input: FindOpenBucketsInput): Promise<FindOpenBucketsOutput> {
  return findOpenBucketsFlow(input);
}
