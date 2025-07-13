'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [bucketName, setBucketName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bucketName) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an S3 bucket name.",
      });
      return;
    }

    setIsLoading(true);
    
    // Simulate a scan and create a fake scan ID
    const scanId = `scan_${Date.now()}`;
    
    // Simulate delay for scanning
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // To pass the bucket name to the results page, we use query params
    // In a real app, we'd store the scan job and results in a DB
    router.push(`/scans/${scanId}?bucket=${encodeURIComponent(bucketName)}`);
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
          <CardTitle>New Scan</CardTitle>
          <CardDescription>Enter an S3 bucket name to scan for vulnerabilities.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-grow w-full">
              <Label htmlFor="bucketName" className="sr-only">
                S3 Bucket Name
              </Label>
              <Input
                id="bucketName"
                placeholder="e.g., my-s3-bucket"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Scanning...' : 'Scan Bucket'}
            </Button>
          </form>
        </CardContent>
      </Card>
      
      {/* A section for recent scans could go here */}
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
