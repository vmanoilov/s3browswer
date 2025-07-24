import { type BucketInfo } from "@/ai/flows/schemas";

// This is a simple in-memory cache for demonstration purposes.
// In a real application, you would use a more persistent store like Redis,
// Firestore, or a relational database to handle multiple server instances
// and to persist results.

interface ScanState {
  log: string[];
  results: BucketInfo[];
  isDone: boolean;
}

// The key is the scanId (string), and the value is the ScanState
export const scanStore = new Map<string, ScanState>();
