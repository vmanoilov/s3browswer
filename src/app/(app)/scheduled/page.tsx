'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import React from 'react';

const mockScheduledScans = [
  { id: 1, bucket: 'my-corp-bucket', frequency: 'Daily', nextRun: '2024-07-29 10:00 AM', active: true },
  { id: 2, bucket: 'legacy-data', frequency: 'Weekly', nextRun: '2024-08-01 09:00 AM', active: true },
  { id: 3, bucket: 'archived-project-files', frequency: 'Monthly', nextRun: '2024-08-25 12:00 AM', active: false },
];

export default function ScheduledScansPage() {
  const [scans, setScans] = React.useState(mockScheduledScans);

  const toggleScan = (id: number) => {
    setScans(scans.map(scan => scan.id === id ? { ...scan, active: !scan.active } : scan));
  };
  
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Scheduled Scans</h1>
        <p className="text-muted-foreground">Automate your S3 security monitoring.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule a New Scan</CardTitle>
          <CardDescription>Set up automatic scans for a specific bucket.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-2">
              <Label htmlFor="scheduledBucket">Bucket Name</Label>
              <Input id="scheduledBucket" placeholder="e.g., my-recurring-scan-bucket" />
            </div>
            <div>
              <Label htmlFor="frequency">Frequency</Label>
              <Select>
                <SelectTrigger id="frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full md:w-auto">
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Schedule
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bucket</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scans.map(scan => (
                <TableRow key={scan.id}>
                  <TableCell className="font-medium">{scan.bucket}</TableCell>
                  <TableCell>{scan.frequency}</TableCell>
                  <TableCell>{scan.nextRun}</TableCell>
                  <TableCell className="text-center">
                    <Switch checked={scan.active} onCheckedChange={() => toggleScan(scan.id)} aria-label='Toggle scan status'/>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      <span className="sr-only">Delete schedule</span>
                    </Button>
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
