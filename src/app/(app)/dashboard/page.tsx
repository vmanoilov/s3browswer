
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, File, Loader2, ServerCrash } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { browseS3Proxy } from '@/ai/flows/browse-s3-proxy';

interface BucketContents {
  files: string[];
  folders: string[];
}

export default function DashboardPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [bucketUrl, setBucketUrl] = useState('http://prod.land.s3.amazonaws.com/');
  const [contents, setContents] = useState<BucketContents | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBrowse = async () => {
    if (!bucketUrl) {
      setError('Please enter a valid S3 bucket URL.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setContents(null);
    try {
      // Ensure the URL ends with a slash for proper joining
      const formattedUrl = bucketUrl.endsWith('/') ? bucketUrl : `${bucketUrl}/`;
      const result = await browseS3Proxy({ bucketUrl: formattedUrl });
      if (result.error) {
          throw new Error(result.error);
      }
      setContents(result);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">S3 Bucket Browser</h1>
          <p className="text-muted-foreground">Enter a public S3 bucket URL to list its files and folders.</p>
        </div>
      </div>
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle>Browse S3 Bucket</CardTitle>
          <CardDescription>
            Enter the full URL of a publicly listable S3 bucket.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex w-full max-w-lg items-center space-x-2">
            <Input
              type="url"
              placeholder="e.g., http://prod.land.s3.amazonaws.com/"
              value={bucketUrl}
              onChange={(e) => setBucketUrl(e.target.value)}
              disabled={isLoading}
              onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
            />
            <Button onClick={handleBrowse} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Browsing...' : 'Browse'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {contents && (
        <Card>
          <CardHeader>
            <CardTitle>Bucket Contents</CardTitle>
            <CardDescription>Files and folders at {bucketUrl}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><Folder className="mr-2 h-5 w-5" /> Folders</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {contents.folders.map((folder, index) => (
                    <li key={`folder-${index}`} className="font-mono">{folder}</li>
                  ))}
                </ul>
                {contents.folders.length === 0 && <p className="text-muted-foreground text-sm">No folders found.</p>}
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center"><File className="mr-2 h-5 w-5" /> Files</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {contents.files.map((file, index) => {
                    const fileUrl = new URL(file, bucketUrl).href;
                    return (
                        <li key={`file-${index}`} className="font-mono">
                            <a 
                                href={fileUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                            >
                                {file}
                            </a>
                        </li>
                    );
                  })}
                </ul>
                 {contents.files.length === 0 && <p className="text-muted-foreground text-sm">No files found.</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
