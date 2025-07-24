
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
      // The prefix for S3 is the path without the leading slash.
      // It needs to be decoded first (e.g., 'Client%20docs/' -> 'Client docs/')
      // and then re-encoded for the fetch URL.
      const path = decodeURIComponent(url.pathname.substring(1));

      // For directory listing, S3 expects URL parameters `delimiter=/` and `prefix`.
      const listUrl = `${url.origin}/?delimiter=/&prefix=${encodeURIComponent(path)}`;

      const response = await fetch(listUrl);

      if (!response.ok) {
        return { files: [], folders: [], error: `Failed to fetch bucket content: ${response.statusText}` };
      }

      const xmlText = await response.text();

      // This is a simplified XML parser that is NOT robust for all XML, but works for S3's ListBucketResult format.
      // A production app should use a proper XML parsing library.

      const fileContents = Array.from(xmlText.matchAll(/<Contents>(.*?)<\/Contents>/gs)).map(match => {
          const content = match[1];
          const keyMatch = content.match(/<Key>(.*?)<\/Key>/);
          const lastModifiedMatch = content.match(/<LastModified>(.*?)<\/LastModified>/);

          const fullKey = keyMatch ? keyMatch[1] : '';
          
          // Exclude the key if it represents the directory itself
          if (fullKey === path) return null;

          // Make the key relative to the current path
          const relativeKey = fullKey.substring(path.length);

          // We only want direct children, not children of sub-folders
          if (relativeKey.includes('/')) return null;

          return {
              key: relativeKey,
              lastModified: lastModifiedMatch ? lastModifiedMatch[1] : new Date().toISOString()
          };
      }).filter(Boolean); // Filter out nulls and empty strings


      const folders = Array.from(xmlText.matchAll(/<Prefix>(.*?)<\/Prefix>/g))
        .map(m => m[1])
        .map(p => {
          if (p === path) return null; // Exclude self reference
          const relativePath = p.substring(path.length);
          // We only want direct children, so there should be no slashes in the middle
          if (relativePath.slice(0, -1).includes('/')) return null;
          return relativePath;
        })
        .filter(Boolean); // filter out nulls

      return {
        // @ts-ignore - filter(Boolean) above ensures they are not null
        files: fileContents.filter(f => f.key),
        // @ts-ignore
        folders: Array.from(new Set(folders)), // Make unique
      };

    } catch (error: any) {
      console.error(`Error in browseS3ProxyFlow: ${error.message}`);
      return { files: [], folders: [], error: 'An unexpected error occurred while browsing the S3 bucket.' };
    }
  }
);
