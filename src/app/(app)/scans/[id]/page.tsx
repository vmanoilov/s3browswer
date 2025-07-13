'use client';

import { Suspense, useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import ScanResultCard, { type ScanResult } from '@/components/scan-result-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

function ScanResultsPageContent({ params }: { params: { id: string } }) {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // In a real app, you would fetch results from a database using the scan ID.
    // For this prototype, we retrieve them from localStorage.
    const storedResults = localStorage.getItem(params.id);
    if (storedResults) {
      setScanResults(JSON.parse(storedResults));
    }
    setIsLoading(false);
  }, [params.id]);

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
                    The scan completed, but no open buckets were found. Or, the scan results for this ID have expired.
                </p>
            </CardContent>
        </Card>
      )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Scan Results</h1>
        <p className="text-muted-foreground">Found {scanResults.length} open buckets (Scan ID: {params.id})</p>
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


export default function ScanResultsPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<ScanResultsPageSkeleton />}>
        <ScanResultsPageContent params={params} />
    </Suspense>
  )
}
