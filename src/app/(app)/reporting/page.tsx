'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const chartData = [
  { month: 'January', vulnerable: 18, public: 10, secure: 120 },
  { month: 'February', vulnerable: 25, public: 15, secure: 110 },
  { month: 'March', vulnerable: 15, public: 8, secure: 140 },
  { month: 'April', vulnerable: 30, public: 20, secure: 100 },
  { month: 'May', vulnerable: 22, public: 12, secure: 130 },
  { month: 'June', vulnerable: 12, public: 5, secure: 150 },
];

const chartConfig = {
    vulnerable: {
        label: 'Vulnerable',
        color: 'hsl(var(--status-vulnerable))',
    },
    public: {
        label: 'Public',
        color: 'hsl(var(--status-public))',
    },
    secure: {
        label: 'Secure',
        color: 'hsl(var(--status-secure))',
    },
};

export default function ReportingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Reporting</h1>
        <p className="text-muted-foreground">Visualize scan data and security trends.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vulnerability Trends</CardTitle>
          <CardDescription>Number of vulnerable & public buckets over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px] w-full">
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                />
                <YAxis />
                <Tooltip
                  cursor={{ fill: 'hsl(var(--muted))' }}
                  content={<ChartTooltipContent />}
                />
                <Bar dataKey="vulnerable" fill="var(--color-vulnerable)" radius={4} />
                <Bar dataKey="public" fill="var(--color-public)" radius={4} />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>
      
      <div className="grid gap-6 md:grid-cols-2">
          <Card>
              <CardHeader>
                  <CardTitle>Current Security Posture</CardTitle>
                  <CardDescription>Overview of all scanned buckets.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4 text-center">
                  <div>
                      <p className="text-4xl font-bold text-status-vulnerable">12</p>
                      <p className="text-sm text-muted-foreground">Vulnerable</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-status-public">8</p>
                      <p className="text-sm text-muted-foreground">Public</p>
                  </div>
                   <div>
                      <p className="text-4xl font-bold text-status-secure">178</p>
                      <p className="text-sm text-muted-foreground">Secure</p>
                  </div>
              </CardContent>
          </Card>
           <Card>
              <CardHeader>
                  <CardTitle>AI Insights Summary</CardTitle>
                  <CardDescription>Common issues identified by AI.</CardDescription>
              </CardHeader>
              <CardContent>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      <li>Public read access is the most common misconfiguration.</li>
                      <li>Lack of server-side encryption is a frequent high-severity finding.</li>
                      <li>Unrestricted bucket policies are present in 5% of vulnerable buckets.</li>
                  </ul>
              </CardContent>
          </Card>
      </div>
    </div>
  );
}
