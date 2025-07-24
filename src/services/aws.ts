import type { ScanUpdate } from '@/ai/flows/schemas';

// This function now fetches and parses the XML from a public S3 bucket URL
export const browseS3Bucket = async (bucketUrl: string): Promise<any> => {
  try {
    const response = await fetch(bucketUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch bucket content: ${response.statusText}`);
    }
    const xmlText = await response.text();
    
    // In a real browser environment, you'd use DOMParser
    // Since this is a server environment, we'll do some basic parsing.
    // A robust solution would use an XML parsing library.
    const files = Array.from(xmlText.matchAll(/<Key>(.*?)<\/Key>/g)).map(m => m[1]);
    const folders = new Set<string>();
    files.forEach(file => {
      if (file.includes('/')) {
        folders.add(file.split('/')[0] + '/');
      }
    });

    return { 
      files: files.filter(f => !f.endsWith('/')), // filter out directories which are sometimes listed as files
      folders: Array.from(folders) 
    };

  } catch (error: any) {
    console.error(`Error browsing S3 bucket: ${error.message}`);
    throw error;
  }
};


// Main function to discover open buckets in an AWS environment.
// This function is no longer used by the primary UI but is kept for potential future use.
export const discoverAwsBuckets = async (keywords: string[] = [], stream: (update: ScanUpdate) => void): Promise<void> => {
    const commonSeparators = ['', '-', '.'];
    const commonAffixes = ['dev', 'prod', 'staging', 'backup', 'data', 'assets', 'files', 'test', 'public'];

    const generateBucketPermutations = (keywords: string[]): string[] => {
        if (keywords.length === 0) return [];
        const permutations = new Set<string>();
        
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

    stream({type: 'log', message: 'Starting AWS public discovery scan...'});
    
    if (keywords.length > 0) {
        const potentialBuckets = generateBucketPermutations(keywords);
        stream({type: 'log', message: `Generated ${potentialBuckets.length} potential names. Testing buckets...`});
        
        // This part requires AWS SDK, which is not suitable for client-side execution
        // and has been simplified.
        stream({type: 'log', message: `Simulating scan for ${potentialBuckets.length} buckets.`});

    } else {
        stream({type: 'log', message: 'No keywords provided. Skipping public discovery phase.'});
    }

    stream({type: 'log', message: 'AWS Scan finished.'});
};