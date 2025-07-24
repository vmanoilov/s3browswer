
'use server';
/**
 * @fileOverview A Genkit flow that acts as a proxy to browse an S3 bucket.
 * This is used to bypass browser CORS restrictions.
 *
 * - browseS3Proxy - A function that fetches and parses the contents of a public S3 bucket URL.
 * - S3ProxyInput - The input type for the browseS3Proxy function.
 * - S3ProxyOutput - The return type for the browseS3Proxy function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const S3ProxyInputSchema = z.object({
  bucketUrl: z.string().describe('The public URL of the S3 bucket to browse.'),
});
export type S3ProxyInput = z.infer<typeof S3ProxyInputSchema>;

const S3FileSchema = z.object({
    key: z.string(),
    lastModified: z.string(),
});

const S3ProxyOutputSchema = z.object({
  files: z.array(S3FileSchema).describe('A list of file objects found in the bucket.'),
  folders: z.array(z.string()).describe('A list of folder prefixes found in the bucket.'),
  error: z.string().optional().describe('An error message if the operation failed.'),
});
export type S3ProxyOutput = z.infer<typeof S3ProxyOutputSchema>;


export async function browseS3Proxy(input: S3ProxyInput): Promise<S3ProxyOutput> {
  return browseS3ProxyFlow(input);
}

const browseS3ProxyFlow = ai.defineFlow(
  {
    name: 'browseS3ProxyFlow',
    inputSchema: S3ProxyInputSchema,
    outputSchema: S3ProxyOutputSchema,
  },
  async ({ bucketUrl }) => {
    try {
        const url = new URL(bucketUrl);
        const path = decodeURIComponent(url.pathname.substring(1));
        const origin = url.origin;

        let allFiles: { key: string; lastModified: string }[] = [];
        let allFolders: string[] = [];
        let isTruncated = true;
        let continuationToken: string | null = null;

        while (isTruncated) {
            let listUrl = `${origin}/?delimiter=/&prefix=${encodeURIComponent(path)}&list-type=2`;
            if (continuationToken) {
                listUrl += `&continuation-token=${encodeURIComponent(continuationToken)}`;
            }

            const response = await fetch(listUrl);

            if (!response.ok) {
                if (allFiles.length > 0 || allFolders.length > 0) break; // If we already have some items, return them
                return { files: [], folders: [], error: `Failed to fetch bucket content: ${response.statusText}` };
            }

            const xmlText = await response.text();
            
            // This is a simplified XML parser that is NOT robust for all XML, but works for S3's ListBucketResult format.
            // A production app should use a proper XML parsing library.

            const pageFiles = Array.from(xmlText.matchAll(/<Contents>(.*?)<\/Contents>/gs)).map(match => {
                const content = match[1];
                const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
                const lastModifiedMatch = content.match(/<LastModified>(.*?)<\/LastModified>/);

                const fullKey = keyMatch ? keyMatch[1] : '';
                
                if (fullKey === path) return null; // Exclude the key if it represents the directory itself
                
                const relativeKey = fullKey.substring(path.length);
                if (relativeKey.includes('/')) return null; // We only want direct children

                return {
                    key: relativeKey,
                    lastModified: lastModifiedMatch ? lastModifiedMatch[1] : new Date().toISOString()
                };
            }).filter((item): item is { key: string; lastModified: string } => item !== null && item.key !== '');

            allFiles.push(...pageFiles);

            const pageFolders = Array.from(xmlText.matchAll(/<CommonPrefixes>(.*?)<\/CommonPrefixes>/gs)).map(match => {
                const content = match[1];
                const prefixMatch = content.match(/<Prefix>(.*?)<\/Prefix>/);
                const fullPrefix = prefixMatch ? prefixMatch[1] : '';

                if (fullPrefix === path) return null; // Exclude self reference
                
                const relativePath = fullPrefix.substring(path.length);
                if (relativePath.slice(0, -1).includes('/')) return null; // We only want direct children

                return relativePath;
            }).filter((item): item is string => item !== null);
            
            allFolders.push(...pageFolders);

            const isTruncatedMatch = xmlText.match(/<IsTruncated>(true|false)<\/IsTruncated>/);
            isTruncated = isTruncatedMatch ? isTruncatedMatch[1] === 'true' : false;

            if (isTruncated) {
                const tokenMatch = xmlText.match(/<NextContinuationToken>(.*?)<\/NextContinuationToken>/);
                continuationToken = tokenMatch ? tokenMatch[1] : null;
                if (!continuationToken) {
                    isTruncated = false; // Stop if there's no token
                }
            }
        }
        
        return {
            files: allFiles,
            folders: Array.from(new Set(allFolders)), // Make unique
        };

    } catch (error: any) {
        console.error(`Error in browseS3ProxyFlow: ${error.message}`);
        return { files: [], folders: [], error: 'An unexpected error occurred while browsing the S3 bucket.' };
    }
  }
);
