'use server';
/**
 * @fileOverview A Genkit flow to search for files within an S3 bucket recursively.
 *
 * - searchS3Bucket - A function that searches for files across an entire S3 bucket.
 * - S3SearchInput - The input type for the searchS3Bucket function.
 * - S3SearchOutput - The return type for the searchS3Bucket function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const S3SearchInputSchema = z.object({
  bucketUrl: z.string().url().describe('The base URL of the S3 bucket to search.'),
  searchTerm: z.string().describe('The search term to filter file keys.'),
});
export type S3SearchInput = z.infer<typeof S3SearchInputSchema>;

const S3SearchOutputSchema = z.object({
    results: z.array(z.string()).describe('A list of file keys that match the search term.'),
    error: z.string().optional().describe('An error message if the operation failed.'),
});
export type S3SearchOutput = z.infer<typeof S3SearchOutputSchema>;

export async function searchS3Bucket(input: S3SearchInput): Promise<S3SearchOutput> {
  return searchS3BucketFlow(input);
}

const searchS3BucketFlow = ai.defineFlow(
  {
    name: 'searchS3BucketFlow',
    inputSchema: S3SearchInputSchema,
    outputSchema: S3SearchOutputSchema,
  },
  async ({ bucketUrl, searchTerm }) => {
    try {
        const url = new URL(bucketUrl);
        const baseUrl = `${url.origin}/`;
        let allFiles: string[] = [];
        let isTruncated = true;
        let continuationToken: string | null = null;

        while (isTruncated) {
            let listUrl = `${baseUrl}?list-type=2`;
            if (continuationToken) {
                listUrl += `&continuation-token=${encodeURIComponent(continuationToken)}`;
            }

            const response = await fetch(listUrl);

            if (!response.ok) {
                if (allFiles.length > 0) break; // If we already have some files, return them
                return { results: [], error: `Failed to fetch bucket content: ${response.statusText}` };
            }

            const xmlText = await response.text();

            const pageFiles = Array.from(xmlText.matchAll(/<Key>(.*?)<\/Key>/g))
                .map(m => m[1])
                .filter(key => !key.endsWith('/')); // Exclude directories

            allFiles.push(...pageFiles);

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

        const searchResults = allFiles.filter(file => file.toLowerCase().includes(searchTerm.toLowerCase()));

        return {
            results: searchResults,
        };

    } catch (error: any) {
        console.error(`Error in searchS3BucketFlow: ${error.message}`);
        return { results: [], error: 'An unexpected error occurred while searching the S3 bucket.' };
    }
  }
);
