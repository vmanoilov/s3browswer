'use server';
/**
 * @fileOverview This file defines a Genkit flow to generate human-readable descriptions of S3 bucket misconfigurations.
 *
 * - s3MisconfigurationDescription - A function that generates a description of an S3 bucket misconfiguration.
 * - S3MisconfigurationDescriptionInput - The input type for the s3MisconfigurationDescription function.
 * - S3MisconfigurationDescriptionOutput - The return type for the s3MisconfigurationDescription function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const S3MisconfigurationDescriptionInputSchema = z.object({
  misconfigurationDetails: z.string().describe('Detailed information about the S3 bucket misconfiguration.'),
});
export type S3MisconfigurationDescriptionInput = z.infer<typeof S3MisconfigurationDescriptionInputSchema>;

const S3MisconfigurationDescriptionOutputSchema = z.object({
  description: z.string().describe('A human-readable description of the S3 bucket misconfiguration.'),
});
export type S3MisconfigurationDescriptionOutput = z.infer<typeof S3MisconfigurationDescriptionOutputSchema>;

export async function s3MisconfigurationDescription(input: S3MisconfigurationDescriptionInput): Promise<S3MisconfigurationDescriptionOutput> {
  return s3MisconfigurationDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 's3MisconfigurationDescriptionPrompt',
  input: {schema: S3MisconfigurationDescriptionInputSchema},
  output: {schema: S3MisconfigurationDescriptionOutputSchema},
  prompt: `You are a security expert specializing in cloud storage misconfigurations.

  Given the following details about an S3 bucket misconfiguration, generate a concise and human-readable description of the issue.

  Misconfiguration Details: {{{misconfigurationDetails}}}
  `,
});

const s3MisconfigurationDescriptionFlow = ai.defineFlow(
  {
    name: 's3MisconfigurationDescriptionFlow',
    inputSchema: S3MisconfigurationDescriptionInputSchema,
    outputSchema: S3MisconfigurationDescriptionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
