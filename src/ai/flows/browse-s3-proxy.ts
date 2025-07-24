
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

const S3ProxyOutputSchema = z.object({
  files: z.array(z.string()).describe('A list of file keys found in the bucket.'),
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
      const prefix = decodeURIComponent(url.pathname.substring(1)); // S3 path without leading '/'

      // For directory listing, S3 expects a URL parameter `delimiter=/`
      // and optionally a `prefix`
      const listUrl = `${url.origin}/?delimiter=/&prefix=${encodeURIComponent(prefix)}`;

      const response = await fetch(listUrl);

      if (!response.ok) {
        return { files: [], folders: [], error: `Failed to fetch bucket content: ${response.statusText}` };
      }

      const xmlText = await response.text();
      
      const files = Array.from(xmlText.matchAll(/<Key>(.*?)<\/Key>/g))
        .map(m => m[1])
        .filter(key => key !== prefix) // Exclude the directory itself
        .map(key => key.substring(prefix.length)); // Get relative path

      const folders = Array.from(xmlText.matchAll(/<Prefix>(.*?)<\/Prefix>/g))
        .map(m => m[1])
        .filter(p => p !== prefix) // Exclude self
        .map(p => p.substring(prefix.length)); // Get relative path

      return {
        files: files.filter(f => !f.endsWith('/')), // filter out "directory" objects
        folders: Array.from(new Set(folders)), // Make unique
      };

    } catch (error: any) {
      console.error(`Error in browseS3ProxyFlow: ${error.message}`);
      return { files: [], folders: [], error: 'An unexpected error occurred while browsing the S3 bucket.' };
    }
  }
);
