'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { findOpenBuckets } from '@/ai/flows/find-open-buckets';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const providers = [
  { value: 'aws', label: 'AWS' },
  { value: 'gcp', label: 'Google Cloud' },
  { value: 'digitalocean', label: 'DigitalOcean' },
  { value: 'dreamhost', label: 'DreamHost' },
  { value: 'linode', label: 'Linode' },
  { value: 'scaleway', label: 'Scaleway' },
  { value: 'custom', label: 'Custom' },
];

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(undefined);
  const router = useRouter();
  const { toast } = useToast();

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProvider) {
      toast({
        variant: "destructive",
        title: "No Provider Selected",
        description: "Please select a cloud provider to scan.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const results = await findOpenBuckets({ provider: selectedProvider });
      
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
            Select a cloud provider and initiate a scan to discover publicly exposed storage resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-4">
            <div>
                <Label htmlFor="provider">Cloud Provider</Label>
                <Select onValueChange={setSelectedProvider} value={selectedProvider}>
                    <SelectTrigger id="provider" className="w-full sm:w-[300px]">
                        <SelectValue placeholder="Select a provider..." />
                    </SelectTrigger>
                    <SelectContent>
                        {providers.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button type="submit" disabled={isLoading || !selectedProvider} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Scanning...' : 'Start Scan'}
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
