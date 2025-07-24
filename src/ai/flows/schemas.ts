import {z} from 'zod';

export const BucketInfoSchema = z.object({
  id: z.string().describe('A unique identifier for the bucket scan result.'),
  name: z.string().describe('The name of the storage resource.'),
  status: z.enum(['Secure', 'Public', 'Vulnerable']).describe('The security status of the bucket.'),
  provider: z.string().describe('The cloud provider where the resource is located.'),
  details: z.string().describe('A description of the bucket configuration and/or vulnerability.'),
  region: z.string().describe('The region where the resource is located.'),
});
export type BucketInfo = z.infer<typeof BucketInfoSchema>;

export const ProgressLogSchema = z.object({
  type: z.literal('log'),
  message: z.string(),
});
export type ProgressLog = z.infer<typeof ProgressLogSchema>;

export const ScanResultSchema = z.object({
  type: z.literal('result'),
  bucket: BucketInfoSchema,
});
export type ScanResult = z.infer<typeof ScanResultSchema>;

export const ScanUpdateSchema = z.union([ProgressLogSchema, ScanResultSchema]);
export type ScanUpdate = z.infer<typeof ScanUpdateSchema>;

export const FindOpenBucketsInputSchema = z.object({
  providers: z.array(z.string()).describe('The cloud providers to scan. e.g., AWS, GCP, DigitalOcean.'),
  keywords: z.array(z.string()).optional().describe('Optional list of keywords to generate and test potential bucket names.'),
});
export type FindOpenBucketsInput = z.infer<typeof FindOpenBucketsInputSchema>;

export const FindOpenBucketsOutputSchema = z.array(BucketInfoSchema);
export type FindOpenBucketsOutput = z.infer<typeof FindOpenBucketsOutputSchema>;
