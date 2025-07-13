'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';
import { findOpenBuckets } from '@/ai/flows/find-open-buckets';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

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
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);
  const [keywords, setKeywords] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  const handleProviderChange = (providerValue: string) => {
    setSelectedProviders(prev => 
      prev.includes(providerValue) 
        ? prev.filter(p => p !== providerValue)
        : [...prev, providerValue]
    );
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProviders.length === 0) {
      toast({
        variant: "destructive",
        title: "No Provider Selected",
        description: "Please select at least one cloud provider to scan.",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const results = await findOpenBuckets({ 
        providers: selectedProviders,
        keywords: keywords.split(',').map(k => k.trim()).filter(Boolean),
      });
      
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
          <CardTitle>Discover Publicly Accessible Buckets</CardTitle>
          <CardDescription>
            Select one or more providers and add optional keywords to discover exposed storage resources.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleScan} className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label>Cloud Providers</Label>
                 <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
                    {providers.map(p => (
                        <div key={p.value} className="flex items-center space-x-2">
                            <Checkbox 
                                id={`provider-${p.value}`} 
                                checked={selectedProviders.includes(p.value)}
                                onCheckedChange={() => handleProviderChange(p.value)}
                            />
                            <Label htmlFor={`provider-${p.value}`} className="font-normal">{p.label}</Label>
                        </div>
                    ))}
                </div>
              </div>
              <div>
                <Label htmlFor="keywords">Discovery Keywords (Optional)</Label>
                <Input 
                    id="keywords"
                    placeholder="e.g., my-company, assets, backup"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                />
                 <p className="text-xs text-muted-foreground mt-1">Comma-separated keywords to search for public buckets.</p>
              </div>
            </div>
            <Button type="submit" disabled={isLoading || selectedProviders.length === 0} className="w-full sm:w-auto">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              {isLoading ? 'Scanning...' : 'Start Discovery Scan'}
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
