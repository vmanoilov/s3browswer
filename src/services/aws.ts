
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import type { ScanUpdate } from '@/ai/flows/schemas';
import type { Stream } from 'genkit/stream';

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


// Main function to discover open buckets in an AWS environment.
export const discoverAwsBuckets = async (keywords: string[] = [], stream: Stream<ScanUpdate>): Promise<void> => {
    const s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1', credentials: { accessKeyId: " ", secretAccessKey: " " } });
    
    stream({type: 'log', message: 'Starting AWS Scan...'});
    
    // Discover public buckets using keyword permutations.
    if (keywords.length > 0) {
        stream({type: 'log', message: `Generating and testing bucket names from ${keywords.length} keywords...`});
        const potentialBuckets = generateBucketPermutations(keywords);
        stream({type: 'log', message: `Generated ${potentialBuckets.length} potential names. Starting discovery...`});
        
        for(const bucketName of potentialBuckets) {
            try {
                // A HEAD request is a cheap way to see if a bucket exists at all.
                await s3Client.send(new HeadBucketCommand({ Bucket: bucketName }));
                // If the command succeeds, the bucket exists and is accessible.
                stream({
                    type: 'result',
                    bucket: {
                        id: `aws-${bucketName}`,
                        name: bucketName,
                        status: 'Public',
                        provider: 'AWS',
                        region: 'N/A', 
                        details: `Bucket is publicly accessible (existence confirmed). Further analysis of ACLs/Policies recommended.`
                    }
                });
            } catch(error: any) {
                // 'NotFound' (404) or 'Forbidden' (403) are the expected errors for
                // bucket names that don't exist or are private. We can safely ignore these.
                if (error.$metadata?.httpStatusCode === 404 || error.$metadata?.httpStatusCode === 403) {
                   continue;
                }
                 // Log other, unexpected errors.
                 stream({type: 'log', message: `Error during discovery for bucket ${bucketName}: ${error.name}`});
            }
        }
    } else {
        stream({type: 'log', message: 'No keywords provided. Skipping public discovery phase.'});
    }

    stream({type: 'log', message: 'AWS Scan finished.'});
};
