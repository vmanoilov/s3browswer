import { S3Client, ListBucketsCommand, GetBucketAclCommand, GetPublicAccessBlockCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { FindOpenBucketsOutput, BucketInfo } from '@/ai/flows/find-open-buckets';

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

// Generates permutations of keywords to guess bucket names.
const generateBucketPermutations = (keywords: string[]): string[] => {
    if (keywords.length === 0) return [];
    const permutations = new Set<string>();
    const commonSeparators = ['', '-', '.'];
    const commonAffixes = ['dev', 'prod', 'staging', 'backup', 'data', 'assets', 'files'];

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
const scanBucket = async (bucketName: string, source: 'Authenticated' | 'Discovered'): Promise<BucketInfo | null> => {
     try {
        // 1. Check Bucket ACL
        const { Grants } = await s3Client.send(new GetBucketAclCommand({ Bucket: bucketName }));
        if (Grants) {
            const { public: isPublic, details } = isBucketPublicByAcl(Grants);
            if (isPublic) {
                return {
                    id: `aws-${bucketName}`, name: bucketName, status: 'Vulnerable', provider: 'AWS',
                    region: 'N/A', // Region requires another call, omitted for performance
                    details: `Vulnerable due to bucket ACLs. ${details.join(' ')} (Source: ${source})`
                };
            }
        }

        // 2. Check Public Access Block (if not found vulnerable by ACL)
        try {
                const { PublicAccessBlockConfiguration } = await s3Client.send(new GetPublicAccessBlockCommand({ Bucket: bucketName }));
                if(PublicAccessBlockConfiguration && 
                (PublicAccessBlockConfiguration.BlockPublicAcls && 
                    PublicAccessBlockConfiguration.BlockPublicPolicy &&
                    PublicAccessBlockConfiguration.IgnorePublicAcls &&
                    PublicAccessBlockConfiguration.RestrictPublicBuckets
                ))
                {
                // This bucket is explicitly configured to be private. We can skip it.
                return null;
                } else {
                    return {
                        id: `aws-${bucketName}`, name: bucketName, status: 'Vulnerable', provider: 'AWS', region: 'N/A', 
                        details: `Public Access Block is not fully enabled, potentially exposing the bucket. (Source: ${source})`
                    };
                }
        } catch(e: any) {
            if (e.name === 'NoSuchPublicAccessBlockConfiguration') {
                return {
                    id: `aws-${bucketName}`, name: bucketName, status: 'Public', provider: 'AWS', region: 'N/A', 
                    details: `No Public Access Block configuration found. Bucket policy should be manually verified. (Source: ${source})`
                };
            }
            // Re-throw other errors
            throw e;
        }

    } catch (error: any) {
        if (error.name === 'NoSuchBucket' || error.name === 'AccessDenied') {
            // This is expected for discovered buckets we don't have access to check.
            return null;
        }
        console.error(`Could not check bucket ${bucketName}:`, error);
        return null; // Return null to indicate we couldn't determine status
    }
}

// Main function to discover open buckets in an AWS environment.
export const discoverAwsBuckets = async (keywords: string[] = []): Promise<FindOpenBucketsOutput> => {
    const results: BucketInfo[] = [];
    const scannedNames = new Set<string>();

    // 1. Scan buckets from authenticated user's account
    try {
        const { Buckets } = await s3Client.send(new ListBucketsCommand({}));
        if (Buckets) {
            for (const bucket of Buckets) {
                if (!bucket.Name || scannedNames.has(bucket.Name)) continue;
                scannedNames.add(bucket.Name);
                const result = await scanBucket(bucket.Name, 'Authenticated');
                if (result) results.push(result);
            }
        }
    } catch (error) {
        console.error("Failed to list AWS buckets:", error);
        throw new Error("Could not connect to AWS to list buckets. Please ensure your credentials and permissions are configured correctly.");
    }
    
    // 2. Discover buckets using keyword permutations
    if (keywords.length > 0) {
        const potentialBuckets = generateBucketPermutations(keywords);
        for(const bucketName of potentialBuckets) {
            if (scannedNames.has(bucketName)) continue;
            scannedNames.add(bucketName);
            try {
                // A HEAD request is a cheap way to see if a bucket exists at all.
                await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));

                // If HeadBucket succeeds, the bucket exists. Now we can run our detailed scan.
                const result = await scanBucket(bucketName, 'Discovered');
                if (result) results.push(result);
            } catch(error: any) {
                // 'NotFound' (404) or 'Forbidden' (403) are expected for non-existent/private buckets.
                if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404 || error.$metadata?.httpStatusCode === 403) {
                   continue;
                }
                 console.error(`Error during discovery for bucket ${bucketName}:`, error);
            }
        }
    }

    return { buckets: results };
};
