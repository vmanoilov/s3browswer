
'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertCircle, Loader2, Shield } from "lucide-react";
import { cn } from '@/lib/utils';
import { analyzeS3BucketConfiguration } from '@/ai/flows/anomaly-detection';
import { s3MisconfigurationDescription } from '@/ai/flows/s3-misconfiguration-description';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { type BucketInfo } from '@/ai/flows/schemas';

interface ScanResultCardProps {
  result: BucketInfo;
}

const statusConfig = {
  Secure: {
    icon: Shield,
    variant: 'secondary',
    className: 'text-status-secure',
    badgeClass: 'bg-green-100 dark:bg-green-900/30'
  },
  Public: {
    icon: AlertCircle,
    variant: 'outline',
    className: 'text-status-public',
    badgeClass: 'bg-yellow-100 dark:bg-yellow-900/30'
  },
  Vulnerable: {
    icon: AlertCircle,
    variant: 'destructive',
    className: 'text-status-vulnerable',
    badgeClass: 'bg-red-100 dark:bg-red-900/30'
  },
};

export default function ScanResultCard({ result }: ScanResultCardProps) {
    const { toast } = useToast();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoadingAi, setIsLoadingAi] = useState(false);
    const [aiData, setAiData] = useState<{ description: string; anomalies: any } | null>(null);

    const isActionable = result.status === 'Vulnerable';
    const StatusIcon = statusConfig[result.status].icon;

    const handleGetAiInsights = async () => {
        if (aiData) {
            setIsDialogOpen(true);
            return;
        }

        setIsLoadingAi(true);
        if (!isDialogOpen) setIsDialogOpen(true);

        try {
            const [descriptionRes, anomalyRes] = await Promise.all([
                s3MisconfigurationDescription({ misconfigurationDetails: result.details }),
                analyzeS3BucketConfiguration({
                    bucketName: result.name,
                    configurationDetails: result.details,
                    securityNorms: "S3 buckets should not have public read/write access unless explicitly required for a static website. All buckets should have server-side encryption enabled. Access logging should be enabled for sensitive buckets."
                })
            ]);
            
            setAiData({
                description: descriptionRes.description,
                anomalies: anomalyRes
            });

        } catch (error) {
            console.error("AI analysis failed:", error);
            toast({
                variant: 'destructive',
                title: 'AI Analysis Failed',
                description: 'Could not generate AI-powered insights for this bucket.',
            });
            setIsDialogOpen(false);
        } finally {
            setIsLoadingAi(false);
        }
    };

    return (
        <Card className="flex flex-col">
            <CardHeader>
                <div className="flex items-start justify-between">
                    <CardTitle className="text-lg font-headline">{result.name}</CardTitle>
                    <Badge variant={statusConfig[result.status].variant} className={cn(statusConfig[result.status].badgeClass)}>
                        <StatusIcon className={cn("mr-1 h-4 w-4", statusConfig[result.status].className)} />
                        {result.status}
                    </Badge>
                </div>
                <CardDescription>{result.provider} ({result.region})</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <p className="text-sm text-muted-foreground">{result.details}</p>
            </CardContent>
            <CardFooter>
                 <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button
                            className="w-full"
                            onClick={handleGetAiInsights}
                            disabled={!isActionable}
                            variant={isActionable ? 'default' : 'secondary'}
                        >
                            {isActionable ? 'View AI Insights' : 'No Actions Needed'}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[625px]">
                        <DialogHeader>
                            <DialogTitle>AI-Powered Analysis: {result.name}</DialogTitle>
                            <DialogDescription>
                                AI-generated summary and anomaly detection results.
                            </DialogDescription>
                        </DialogHeader>
                        {isLoadingAi ? (
                            <div className="flex items-center justify-center h-64">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : aiData && (
                            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
                                <div>
                                    <h3 className="font-semibold mb-2 text-foreground">Misconfiguration Summary</h3>
                                    <p className="text-sm text-muted-foreground">{aiData.description}</p>
                                </div>
                                <Alert variant={aiData.anomalies.severity === 'high' ? 'destructive' : 'default'} className="mt-4">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Anomaly Detection (Severity: {aiData.anomalies.severity})</AlertTitle>
                                    <AlertDescription>
                                        <h4 className="font-semibold mt-3 mb-1">Justification:</h4>
                                        <p className="text-sm mb-3">{aiData.anomalies.justification}</p>

                                        <h4 className="font-semibold mt-3 mb-1">Anomalies:</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {aiData.anomalies.anomalies.map((a: string, i: number) => <li key={i} className="text-sm">{a}</li>)}
                                        </ul>
                                        
                                        <h4 className="font-semibold mt-4 mb-1">Recommendations:</h4>
                                        <ul className="list-disc pl-5 space-y-1">
                                            {aiData.anomalies.recommendations.map((r: string, i: number) => <li key={i} className="text-sm">{r}</li>)}
                                        </ul>
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </CardFooter>
        </Card>
    );
}
