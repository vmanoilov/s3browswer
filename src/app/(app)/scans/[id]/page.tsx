
'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import ScanResultCard from '@/components/scan-result-card';
import { type BucketInfo } from '@/ai/flows/schemas';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

// This is the Client Component that displays the results.
function ScanResultsPageContent({ scanId }: { scanId: string }) {
  const [scanResults, setScanResults] = useState<BucketInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch results from a database using the scan ID.
    // For this prototype, we retrieve them from localStorage.
    const storedResults = localStorage.getItem(scanId);
    if (storedResults) {
      try {
        const parsedResults = JSON.parse(storedResults);
        // Ensure what we parsed is an array
        if (Array.isArray(parsedResults)) {
          setScanResults(parsedResults);
        } else {
          console.error("Stored scan results are not in the expected array format.");
          setScanResults([]);
        }
      } catch (e) {
        console.error("Failed to parse scan results from localStorage:", e);
        setScanResults([]);
      }
    }
    setIsLoading(false);
  }, [scanId]);

  if (isLoading) {
    return <ScanResultsPageSkeleton />;
  }
  
  if (scanResults.length === 0) {
      return (
        <Card>
            <CardHeader>
                <CardTitle>No Results Found</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                    The scan may have completed with no findings, or the results for this ID have expired or are invalid.
                </p>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Scan Results</h1>
        <p className="text-muted-foreground">Found {scanResults.length} open buckets (Scan ID: {scanId})</p>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <h2 className="text-xl font-semibold flex-grow">Detected Issues ({scanResults.length})</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline"><FileText className="mr-2 h-4 w-4" /> Export CSV</Button>
          <Button variant="outline"><FileJson className="mr-2 h-4 w-4" /> Export JSON</Button>
          <Button><Download className="mr-2 h-4 w-4" /> Download Report (PDF)</Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {scanResults.map(result => (
          <ScanResultCard key={result.id} result={result} />
        ))}
      </div>
    </div>
  );
}

function ScanResultsPageSkeleton() {
    return (
        <div className="space-y-8">
            <div>
                <Skeleton className="h-9 w-1/2 rounded-lg" />
                <Skeleton className="h-5 w-1/3 mt-2 rounded-lg" />
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
                <Skeleton className="h-7 w-48 rounded-lg" />
                <div className="flex gap-2 ml-auto">
                    <Skeleton className="h-10 w-32 rounded-md" />
                    <Skeleton className="h-10 w-36 rounded-md" />
                    <Skeleton className="h-10 w-48 rounded-md" />
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {[...Array(3)].map((_, i) => (
                    <Card key={i}>
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4 rounded-lg" />
                            <Skeleton className="h-4 w-1/4 mt-1 rounded-lg" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-4 w-full mb-2 rounded-lg" />
                            <Skeleton className="h-4 w-2/3 rounded-lg" />
                        </CardContent>
                        <CardFooter>
                           <Skeleton className="h-10 w-full rounded-md" />
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// This is the default export - a Server Component. It receives params from Next.js.
export default function ScanResultsPage({ params }: { params: { id: string } }) {
  // We can safely access params.id here because this is a Server Component.
  const { id } = params;

  return (
    <Suspense fallback={<ScanResultsPageSkeleton />}>
        {/* We pass the resolved `id` string as a prop to the Client Component. */}
        <ScanResultsPageContent scanId={id} />
    </Suspense>
  )
}
