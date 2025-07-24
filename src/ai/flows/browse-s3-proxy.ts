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
  bucketUrl: z.string().url().describe('The public URL of the S3 bucket to browse.'),
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
      const response = await fetch(bucketUrl);

      if (!response.ok) {
        return { files: [], folders: [], error: `Failed to fetch bucket content: ${response.statusText}` };
      }

      const xmlText = await response.text();
      
      // Basic XML parsing. A robust solution would use a dedicated library.
      const files = Array.from(xmlText.matchAll(/<Key>(.*?)<\/Key>/g)).map(m => m[1]);
      const folders = new Set<string>();
      
      files.forEach(file => {
        if (file.includes('/')) {
          folders.add(file.split('/')[0] + '/');
        }
      });

      return {
        files: files.filter(f => !f.endsWith('/')), // filter out "directory" objects
        folders: Array.from(folders),
      };

    } catch (error: any) {
      console.error(`Error in browseS3ProxyFlow: ${error.message}`);
      return { files: [], folders: [], error: 'An unexpected error occurred while browsing the S3 bucket.' };
    }
  }
);
