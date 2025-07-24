
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Folder, File, Loader2, ServerCrash, ArrowLeft, Search, ListFilter, ChevronLeft, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { browseS3Proxy, type S3ProxyOutput } from '@/ai/flows/browse-s3-proxy';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { type S3File as S3FileType } from '@/ai/flows/browse-s3-proxy';

interface S3File {
  key: string;
  lastModified: string;
}

interface BucketContents {
  files: S3File[];
  folders: string[];
}

type SortField = 'key' | 'lastModified';
type SortDirection = 'asc' | 'desc';

const PRESET_EXTENSIONS = ['txt', 'doc', 'docx', 'xls', 'xlsx', 'pdf', 'zip'];

export default function DashboardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [bucketUrl, setBucketUrl] = useState('http://prod.land.s3.amazonaws.com/');
  const [currentPath, setCurrentPath] = useState('');
  const [contents, setContents] = useState<BucketContents | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [continuationTokens, setContinuationTokens] = useState<(string | undefined)[]>([undefined]); // index 0 is for page 1 (no token)
  const [nextContinuationToken, setNextContinuationToken] = useState<string | undefined>(undefined);
  
  // Filtering and Sorting State
  const [localFilter, setLocalFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('key');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [extensionFilter, setExtensionFilter] = useState('');
  const [customExtension, setCustomExtension] = useState('');

  const resetPagination = () => {
    setCurrentPage(1);
    setContinuationTokens([undefined]);
    setNextContinuationToken(undefined);
  }

  const handleBrowse = useCallback(async (path: string, token?: string) => {
    if (!bucketUrl) {
      setError('Please enter a valid S3 bucket URL.');
      return;
    }

    setIsLoading(true);
    setContents(null);
    setError(null);
    if (!token) { // only reset filters/sort on new directory browse, not on pagination
        setLocalFilter('');
        setExtensionFilter('');
        setCustomExtension('');
    }

    try {
      const formattedUrl = bucketUrl.endsWith('/') ? bucketUrl : `${bucketUrl}/`;
      const fullUrl = `${formattedUrl}${path}`;
      
      const result = await browseS3Proxy({ bucketUrl: fullUrl, continuationToken: token });
      if (result.error) {
          throw new Error(result.error);
      }
      
      setContents({
          files: result.files,
          folders: result.folders,
      });

      setNextContinuationToken(result.nextContinuationToken);

      // If we got a next token and it's not already in our list, add it.
      if (result.nextContinuationToken && !continuationTokens.includes(result.nextContinuationToken)) {
         setContinuationTokens(prev => [...prev, result.nextContinuationToken]);
      }
      setCurrentPath(path);

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bucketUrl]);

  const handleFolderClick = (folder: string) => {
    const newPath = `${currentPath}${folder}`;
    resetPagination();
    handleBrowse(newPath);
  };
  
  const handleBackClick = () => {
    if (!currentPath) return;
    const newPath = currentPath.slice(0, currentPath.lastIndexOf('/', currentPath.length - 2) + 1);
    resetPagination();
    handleBrowse(newPath);
  };

  const handleUrlSubmit = () => {
      resetPagination();
      handleBrowse('');
  };

  const handleGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearch) return;
    const encodedBucketUrl = encodeURIComponent(getBaseUrl());
    const encodedSearchTerm = encodeURIComponent(globalSearch);
    router.push(`/search-results?url=${encodedBucketUrl}&q=${encodedSearchTerm}`);
  };

  const handleNextPage = () => {
    if (nextContinuationToken) {
        setCurrentPage(prev => prev + 1);
        handleBrowse(currentPath, nextContinuationToken);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
      const prevToken = continuationTokens[newPage - 1]; // Array is 0-indexed
      handleBrowse(currentPath, prevToken);
    }
  };

  useEffect(() => {
    handleBrowse('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getBaseUrl = () => {
      return bucketUrl.endsWith('/') ? bucketUrl : `${bucketUrl}/`;
  };

  const sortedAndFilteredContents = contents ? {
      folders: contents.folders
        .filter(f => f.toLowerCase().includes(localFilter.toLowerCase()))
        .sort((a, b) => a.localeCompare(b)),
      files: contents.files
        .filter(f => f.key.toLowerCase().includes(localFilter.toLowerCase()))
        .filter(f => extensionFilter ? f.key.toLowerCase().endsWith(`.${extensionFilter.toLowerCase()}`) : true)
        .sort((a, b) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          let comparison = 0;
          if (aValue > bValue) {
            comparison = 1;
          } else if (aValue < bValue) {
            comparison = -1;
          }
          return sortDirection === 'asc' ? comparison : -comparison;
        }),
  } : null;

  const getDisplayPath = () => {
    try {
      return `${getBaseUrl()}${decodeURIComponent(currentPath)}`;
    } catch (e) {
      return `${getBaseUrl()}${currentPath}`;
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
              onKeyDown={(e) => e.key === 'Enter' && handleUrlSubmit()}
            />
            <Button onClick={handleUrlSubmit} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isLoading ? 'Browsing...' : 'Browse'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
          <CardHeader>
            <CardTitle>Global Bucket Search</CardTitle>
            <CardDescription>Search for files across the entire bucket. This may take a moment for large buckets.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGlobalSearch} className="flex w-full max-w-lg items-center space-x-2">
                <Input
                    type="search"
                    placeholder="Search entire bucket..."
                    value={globalSearch}
                    onChange={(e) => setGlobalSearch(e.target.value)}
                />
                <Button type="submit">
                    <Search className="mr-2 h-4 w-4" /> Search
                </Button>
            </form>
          </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading && (
          <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
      )}

      {contents && !isLoading && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
               {currentPath && (
                <Button onClick={handleBackClick} variant="outline" size="icon">
                  <ArrowLeft className="h-4 w-4" />
                   <span className="sr-only">Go back</span>
                </Button>
              )}
              <div>
                <CardTitle>Current Directory Contents</CardTitle>
                <CardDescription className="font-mono">{getDisplayPath()}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 items-center mb-4">
                <div className="relative flex-grow sm:flex-grow-0">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Filter by name..."
                        className="pl-8 sm:w-[250px] md:w-[300px]"
                        value={localFilter}
                        onChange={(e) => setLocalFilter(e.target.value)}
                    />
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        <ListFilter className="mr-2 h-4 w-4" />
                        Sort by: {sortField === 'key' ? 'Name' : 'Last Modified'} ({sortDirection})
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                       <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                        <DropdownMenuRadioGroup value={`${sortField}-${sortDirection}`} onValueChange={(v) => {
                            const [field, dir] = v.split('-') as [SortField, SortDirection];
                            if (field === 'key') {
                                setSortField('key');
                            } else {
                                setSortField('lastModified');
                            }
                            setSortDirection(dir);
                        }}>
                            <DropdownMenuRadioItem value="key-asc">Name (A-Z)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="key-desc">Name (Z-A)</DropdownMenuRadioItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioItem value="lastModified-desc">Last Modified (Newest)</DropdownMenuRadioItem>
                            <DropdownMenuRadioItem value="lastModified-asc">Last Modified (Oldest)</DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <Card>
                <CardHeader className="py-3">
                    <CardTitle className="text-base">Filter by Extension</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2">
                    {PRESET_EXTENSIONS.map(ext => (
                         <Button key={ext} variant={extensionFilter === ext ? "default" : "outline"} size="sm" onClick={() => setExtensionFilter(ext === extensionFilter ? '' : ext)}>
                            .{ext}
                        </Button>
                    ))}
                    <form onSubmit={(e) => { e.preventDefault(); setExtensionFilter(customExtension);}} className="flex items-center gap-2">
                         <Input 
                            type="text" 
                            placeholder="custom ext" 
                            className="h-9 w-24"
                            value={customExtension}
                            onChange={(e) => setCustomExtension(e.target.value.replace('.', ''))}
                          />
                         <Button type="submit" size="sm" variant="secondary">Filter</Button>
                    </form>
                    {extensionFilter && (
                         <Button variant="ghost" size="sm" onClick={() => { setExtensionFilter(''); setCustomExtension(''); }}>
                            Clear filter
                        </Button>
                    )}
                </CardContent>
            </Card>


            {sortedAndFilteredContents && (
              <div className="space-y-4 mt-6">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><Folder className="mr-2 h-5 w-5" /> Folders ({sortedAndFilteredContents.folders.length})</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {sortedAndFilteredContents.folders.map((folder, index) => (
                      <li key={`folder-${index}`} className="font-mono">
                          <button onClick={() => handleFolderClick(folder)} className="text-primary hover:underline text-left">
                              {folder}
                          </button>
                      </li>
                    ))}
                  </ul>
                  {sortedAndFilteredContents.folders.length === 0 && <p className="text-muted-foreground text-sm">No matching folders found.</p>}
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center"><File className="mr-2 h-5 w-5" /> Files ({sortedAndFilteredContents.files.length})</h3>
                  <ul className="list-disc pl-5 space-y-1">
                    {sortedAndFilteredContents.files.map((file, index) => {
                      const fileUrl = new URL(file.key, getDisplayPath()).href;
                      return (
                          <li key={`file-${index}`} className="font-mono flex justify-between items-center">
                              <a
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-primary hover:underline"
                              >
                                  {file.key}
                              </a>
                              <Badge variant="secondary">{new Date(file.lastModified).toLocaleDateString()}</Badge>
                          </li>
                      );
                    })}
                  </ul>
                   {sortedAndFilteredContents.files.length === 0 && <p className="text-muted-foreground text-sm">No matching files found.</p>}
                </div>
              </div>
            )}
            <div className="mt-6 flex justify-center items-center gap-4">
                <Button onClick={handlePrevPage} disabled={currentPage === 1 || isLoading}>
                    <ChevronLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
                <span className="text-sm font-medium">Page {currentPage}</span>
                <Button onClick={handleNextPage} disabled={!nextContinuationToken || isLoading}>
                    Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

    