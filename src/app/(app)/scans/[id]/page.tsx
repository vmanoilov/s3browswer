'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
import ScanResultCard, { type ScanResult } from '@/components/scan-result-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

// Mock data generation
const generateMockResults = (bucketName: string): ScanResult[] => {
  return [
    { id: '1', name: bucketName, status: 'Vulnerable', region: 'us-east-1', details: 'Public read access enabled via ACL. Insecure bucket policy allows anonymous users to list objects.' },
    { id: '2', name: `${bucketName}-logs`, status: 'Secure', region: 'us-east-1', details: 'Properly configured for private logging with server-side encryption.' },
    { id: '3', name: `${bucketName}-assets`, status: 'Public', region: 'us-west-2', details: 'Public read access configured for static website hosting. This might be intentional.' },
    { id: '4', name: `${bucketName}-backups`, status: 'Vulnerable', region: 'eu-central-1', details: 'Server-side encryption is not enabled, and versioning is disabled.' },
  ];
};

function ScanResultsPageContent({ params }: { params: { id: string } }) {
  const searchParams = useSearchParams();
  const bucketName = searchParams.get('bucket') || 'unknown-bucket';
  
  const scanResults = generateMockResults(bucketName);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Scan Results</h1>
        <p className="text-muted-foreground">Results for <span className="font-semibold text-primary">{bucketName}</span> (ID: {params.id})</p>
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
