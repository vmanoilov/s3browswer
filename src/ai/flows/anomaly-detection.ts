// anomaly-detection.ts
'use server';

/**
 * @fileOverview Anomaly detection AI agent for S3 bucket configurations.
 *
 * - analyzeS3BucketConfiguration - A function that analyzes S3 bucket configurations for anomalies.
 * - AnomalyDetectionInput - The input type for the analyzeS3BucketConfiguration function.
 * - AnomalyDetectionOutput - The return type for the analyzeS3BucketConfiguration function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const AnomalyDetectionInputSchema = z.object({
  bucketName: z.string().describe('The name of the S3 bucket.'),
  configurationDetails: z
    .string()
    .describe(
      'Detailed configuration information of the S3 bucket, including ACLs, policies, and encryption settings.'
    ),
  securityNorms: z
    .string()
    .describe(
      'Established security norms and best practices for S3 bucket configurations.'
    ),
});
export type AnomalyDetectionInput = z.infer<typeof AnomalyDetectionInputSchema>;

const AnomalyDetectionOutputSchema = z.object({
  anomalies: z
    .array(z.string())
    .describe(
      'A list of identified anomalies in the S3 bucket configuration, with detailed descriptions of each anomaly.'
    ),
  severity: z
    .string()
    .describe(
      'The severity level of the identified anomalies (e.g., high, medium, low).'
    ),
  recommendations: z
    .array(z.string())
    .describe(
      'Recommended actions to address the identified anomalies and improve the S3 bucket security posture.'
    ),
  justification:
    z.string().describe('A detailed justification for why each anomaly is considered an anomaly based on the provided security norms.')
});

export type AnomalyDetectionOutput = z.infer<typeof AnomalyDetectionOutputSchema>;

export async function analyzeS3BucketConfiguration(
  input: AnomalyDetectionInput
): Promise<AnomalyDetectionOutput> {
  return anomalyDetectionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'anomalyDetectionPrompt',
  input: {schema: AnomalyDetectionInputSchema},
  output: {schema: AnomalyDetectionOutputSchema},
  prompt: `You are a security expert specializing in identifying anomalies in S3 bucket configurations.

You will analyze the provided S3 bucket configuration details against established security norms to identify any deviations or potential security risks.

Based on your analysis, you will provide a list of identified anomalies, their severity levels, recommended actions to address them, and justification for why they are considered anomalies.

S3 Bucket Name: {{{bucketName}}}
Configuration Details: {{{configurationDetails}}}
Security Norms: {{{securityNorms}}}

Analyze the configuration and identify any anomalies.
`,
});

const anomalyDetectionFlow = ai.defineFlow(
  {
    name: 'anomalyDetectionFlow',
    inputSchema: AnomalyDetectionInputSchema,
    outputSchema: AnomalyDetectionOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
