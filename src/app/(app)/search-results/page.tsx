'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { File, Loader2, ServerCrash, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { searchS3Bucket } from '@/ai/flows/search-s3-bucket';
import { Skeleton } from '@/components/ui/skeleton';

function SearchResultsContent() {
  const searchParams = useSearchParams();
  const bucketUrl = searchParams.get('url');
  const searchTerm = searchParams.get('q');

  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bucketUrl || !searchTerm) {
      setError('Bucket URL and search term are required.');
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await searchS3Bucket({
          bucketUrl: decodeURIComponent(bucketUrl),
          searchTerm: decodeURIComponent(searchTerm),
        });

        if (response.error) {
          throw new Error(response.error);
        }
        setResults(response.results);
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred during the search.');
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [bucketUrl, searchTerm]);

  if (!bucketUrl || !searchTerm) {
    return (
       <Card>
            <CardHeader>
                <CardTitle>Invalid Search</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">
                   A bucket URL and search query are required to perform a search.
                </p>
                 <Button asChild variant="link" className="px-0">
                    <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Browser</Link>
                </Button>
            </CardContent>
        </Card>
    )
  }

  const decodedBucketUrl = decodeURIComponent(bucketUrl);
  const decodedSearchTerm = decodeURIComponent(searchTerm);


  return (
    <div className="space-y-8">
        <div>
            <Button asChild variant="outline" size="sm" className="mb-4">
                <Link href="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" />Back to Browser</Link>
            </Button>
            <h1 className="text-3xl font-bold font-headline">Search Results</h1>
            <p className="text-muted-foreground">
                Found {results.length} files matching &quot;{decodedSearchTerm}&quot; in <span className="font-mono">{decodedBucketUrl}</span>
            </p>
        </div>

        {error && (
            <Alert variant="destructive">
            <ServerCrash className="h-4 w-4" />
            <AlertTitle>Search Failed</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

        {isLoading ? (
            <Card>
                <CardHeader>
                    <Skeleton className="h-7 w-1/2" />
                    <Skeleton className="h-4 w-1/4 mt-2" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-5 w-5/6" />
                    <Skeleton className="h-5 w-3/4" />
                </CardContent>
            </Card>
        ) : (
            <Card>
            <CardHeader>
                <CardTitle>Files ({results.length})</CardTitle>
                <CardDescription>Click a file to open it in a new tab.</CardDescription>
            </CardHeader>
            <CardContent>
                {results.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                        {results.map((file, index) => {
                            const fileUrl = new URL(file, decodedBucketUrl).href;
                            return (
                                <li key={index} className="font-mono">
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
                ) : (
                     <p className="text-muted-foreground text-sm">No matching files found.</p>
                )}
            </CardContent>
            </Card>
        )}
    </div>
  );
}


export default function SearchResultsPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SearchResultsContent />
        </Suspense>
    )
}