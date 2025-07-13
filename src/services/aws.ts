import { S3Client, ListBucketsCommand, GetBucketAclCommand, GetPublicAccessBlockCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { ScanUpdate } from '@/ai/flows/schemas';
import type { Stream } from 'genkit/stream';

// Note on Credentials: This service uses the AWS SDK, which will automatically
// use credentials from environment variables (AWS_ACCESS_KEY_ID, etc.),
// an IAM role if running on EC2/ECS, or the ~/.aws/credentials file.
const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

// Helper function to check if a bucket is public based on its ACL grants.
const isBucketPublicByAcl = (grants: any[]): { public: boolean, details: string[] } => {
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

// Generates permutations of keywords to guess bucket names. This is a common
// technique for discovering public buckets that are not part of an authenticated account.
const generateBucketPermutations = (keywords: string[]): string[] => {
    if (keywords.length === 0) return [];
    const permutations = new Set<string>();
    const commonSeparators = ['', '-', '.'];
    const commonAffixes = ['dev', 'prod', 'staging', 'backup', 'data', 'assets', 'files', 'test', 'public'];

    for (const keyword1 of keywords) {
        permutations.add(keyword1);
        for (const keyword2 of keywords) {
            if (keyword1 === keyword2) continue;
            for (const separator of commonSeparators) {
                permutations.add(`${keyword1}${separator}${keyword2}`);
            }
        }
        for (const affix of commonAffixes) {
             for (const separator of commonSeparators) {
                permutations.add(`${keyword1}${separator}${affix}`);
                permutations.add(`${affix}${separator}${keyword1}`);
            }
        }
    }
    return Array.from(permutations);
};


// Scans a specific, named bucket to determine its public status
const scanBucket = async (bucketName: string, source: 'Authenticated' | 'Discovered', stream: Stream<ScanUpdate>): Promise<void> => {
     try {
        // 1. Check Bucket ACL
        const { Grants } = await s3Client.send(new GetBucketAclCommand({ Bucket: bucketName }));
        if (Grants) {
            const { public: isPublic, details } = isBucketPublicByAcl(Grants);
            if (isPublic) {
                stream({
                    type: 'result',
                    bucket: {
                        id: `aws-${bucketName}`, name: bucketName, status: 'Vulnerable', provider: 'AWS',
                        region: 'N/A', // Region requires another call, omitted for performance
                        details: `Vulnerable due to bucket ACLs allowing public access. ${details.join(' ')} (Source: ${source})`
                    }
                });
                return;
            }
        }

        // 2. Check Public Access Block (if not found vulnerable by ACL)
        // This helps identify buckets that might become public if their policies change.
        try {
                const { PublicAccessBlockConfiguration } = await s3Client.send(new GetPublicAccessBlockCommand({ Bucket: bucketName }));
                if(PublicAccessBlockConfiguration && 
                (PublicAccessBlockConfiguration.BlockPublicAcls && 
                    PublicAccessBlockConfiguration.BlockPublicPolicy &&
                    PublicAccessBlockConfiguration.IgnorePublicAcls &&
                    PublicAccessBlockConfiguration.RestrictPublicBuckets
                ))
                {
                // This bucket is explicitly configured to be private and secure. We can skip it.
                return;
                } else {
                     stream({
                        type: 'result',
                        bucket: {
                            id: `aws-${bucketName}`, name: bucketName, status: 'Vulnerable', provider: 'AWS', region: 'N/A', 
                            details: `Public Access Block is not fully enabled, which is a misconfiguration that could expose the bucket. (Source: ${source})`
                        }
                    });
                }
        } catch(e: any) {
            if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
                stream({
                    type: 'result',
                    bucket: {
                        id: `aws-${bucketName}`, name: bucketName, status: 'Public', provider: 'AWS', region: 'N/A', 
                        details: `No Public Access Block configuration found. Bucket is potentially public and should be manually verified. (Source: ${source})`
                    }
                });
                return;
            }
            // Re-throw other errors
            throw e;
        }

    } catch (error: any) {
        if (error.name === 'NoSuchBucket' || error.name === 'AccessDenied') {
            // This is an expected error for discovered buckets we don't own or have access to.
            return;
        }
        stream({type: 'log', message: `Could not fully check bucket ${bucketName}: ${error.message || error.name}`});
        return; 
    }
}

// Main function to discover open buckets in an AWS environment.
export const discoverAwsBuckets = async (keywords: string[] = [], stream: Stream<ScanUpdate>): Promise<void> => {
    const scannedNames = new Set<string>();

    stream({type: 'log', message: 'Starting AWS Scan...'});

    // Step 1: Scan buckets from the authenticated user's account.
    // This finds misconfigurations in buckets you own.
    try {
        stream({type: 'log', message: 'Checking for AWS credentials to scan owned buckets...'});
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        if (Buckets) {
            stream({type: 'log', message: `Found ${Buckets.length} buckets in your account. Analyzing...`});
            for (const bucket of Buckets) {
                if (!bucket.Name || scannedNames.has(bucket.Name)) continue;
                scannedNames.add(bucket.Name);
                await scanBucket(bucket.Name, 'Authenticated', stream);
            }
        }
    } catch (error: any) {
        // Handle cases where credentials might be missing or invalid.
        if (error.name === 'CredentialsProviderError') {
             stream({type: 'log', message: "AWS credentials not found. Skipping authenticated scan. To scan buckets you own, please configure your environment for AWS access."});
        } else {
            stream({type: 'log', message: `Failed to list AWS buckets: ${error.message || error.name}`});
            // Don't re-throw, allow the discovery scan to proceed.
        }
    }
    
    // Step 2: Discover public buckets using keyword permutations.
    // This finds "shadow IT" or unknown public buckets by guessing common names.
    if (keywords.length > 0) {
        stream({type: 'log', message: `Generating and testing bucket names from ${keywords.length} keywords...`});
        const potentialBuckets = generateBucketPermutations(keywords);
        stream({type: 'log', message: `Generated ${potentialBuckets.length} potential names. Starting discovery...`});
        
        for(const bucketName of potentialBuckets) {
            if (scannedNames.has(bucketName)) continue;
            scannedNames.add(bucketName);
            try {
                // A HEAD request is a cheap way to see if a bucket exists at all.
                // It doesn't require list permissions.
                await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
                stream({type: 'log', message: `Potential bucket found: ${bucketName}. Analyzing access...`});

                // If HeadBucket succeeds, the bucket exists. Now we can run our detailed scan
                // to check if it's actually public.
                await scanBucket(bucketName, 'Discovered', stream);
            } catch(error: any) {
                // 'NotFound' (404) or 'Forbidden' (403) are the expected errors for
                // bucket names that don't exist or are private. We can safely ignore these.
                if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404 || error.$metadata?.httpStatusCode === 403) {
                   continue;
                }
                 // Log other, unexpected errors.
                 stream({type: 'log', message: `Error during discovery for bucket ${bucketName}: ${error.message || error.name}`});
            }
        }
    } else {
        stream({type: 'log', message: 'No keywords provided. Skipping public discovery phase.'});
    }

    stream({type: 'log', message: 'AWS Scan finished.'});
};
