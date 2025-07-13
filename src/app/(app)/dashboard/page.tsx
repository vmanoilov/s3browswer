'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { findOpenBuckets } from '@/ai/flows/find-open-buckets';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const results = await findOpenBuckets();
      
      // In a real app, we'd store the scan job and results in a DB.
      // For this prototype, we'll pass the results via localStorage.
      const scanId = `scan_${Date.now()}`;
      localStorage.setItem(scanId, JSON.stringify(results.buckets));
      
      router.push(`/scans/${scanId}`);

    } catch(error) {
       console.error("Failed to scan for open buckets:", error);
       toast({
        variant: "destructive",
        title: "Error",
        description: "Could not complete the scan for open buckets.",
       });
       setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <p className="text-muted-foreground">Start a new scan or view recent activity.</p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Scan for Publicly Accessible Buckets</CardTitle>
          <CardDescription>
            Initiate a scan across your environment to discover S3 buckets that are exposed to the public internet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan}>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Scanning...' : 'Start Environment Scan'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
       <Card className="shadow-md">
        <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>A summary of recent scan activities.</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">No recent scans to display. Start a new scan to see results here.</p>
        </CardContent>
       </Card>
    </div>
  );
}
