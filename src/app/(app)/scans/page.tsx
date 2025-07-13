'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const mockScans = [
  { id: 'scan_1672531200', bucket: 'my-corp-bucket', date: '2024-07-28 10:00 AM', status: 'Completed', results: { vulnerable: 2, public: 1, secure: 5 } },
  { id: 'scan_1672444800', bucket: 'test-assets-public', date: '2024-07-27 08:30 AM', status: 'Completed', results: { vulnerable: 0, public: 8, secure: 1 } },
  { id: 'scan_1672358400', bucket: 'legacy-data', date: '2024-07-26 04:15 PM', status: 'Failed', results: { vulnerable: 0, public: 0, secure: 0 } },
];

export default function ScansPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Scan History</h1>
        <p className="text-muted-foreground">Review your past S3 bucket scans.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Scans</CardTitle>
          <CardDescription>A log of all scans performed.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket Name</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Vulnerable</TableHead>
                <TableHead className="text-center">Public</TableHead>
                <TableHead className="text-center">Secure</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockScans.map(scan => (
                <TableRow key={scan.id}>
                  <TableCell className="font-medium">{scan.bucket}</TableCell>
                  <TableCell>{scan.date}</TableCell>
                  <TableCell>
                    <Badge variant={scan.status === 'Completed' ? 'default' : 'destructive'}>{scan.status}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-medium text-status-vulnerable">{scan.results.vulnerable}</TableCell>
                  <TableCell className="text-center font-medium text-status-public">{scan.results.public}</TableCell>
                  <TableCell className="text-center font-medium text-status-secure">{scan.results.secure}</TableCell>
                  <TableCell className="text-right">
                    {scan.status !== 'Failed' && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/scans/${scan.id}?bucket=${scan.bucket}`}>
                            View Results <ArrowRight className="ml-2 h-4 w-4" />
                          </Link>
                        </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
