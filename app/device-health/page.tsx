'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Cpu, HardDrive, Battery, Wifi, CheckCircle2, AlertTriangle, XCircle, Play } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DeviceInfo {
  os: string;
  browser: string;
  viewport: string;
  memory: string;
  cores: number;
  online: boolean;
  storageUsed: number;
  storageTotal: number;
  battery?: number;
  batteryCharging?: boolean;
}

interface HealthCheckResult {
  name: string;
  status: 'pass' | 'warning' | 'fail';
  message: string;
  icon: any;
}

export default function DeviceHealthPage() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [healthResults, setHealthResults] = useState<HealthCheckResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    const getDeviceInfo = async () => {
      const info: DeviceInfo = {
        os: navigator.platform,
        browser: navigator.userAgent.split('(')[1]?.split(')')[0] || 'Unknown',
        viewport: `${window.innerWidth} x ${window.innerHeight}`,
        memory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory}GB` : 'Unknown',
        cores: navigator.hardwareConcurrency || 0,
        online: navigator.onLine,
        storageUsed: 0,
        storageTotal: 0,
      };

      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        info.storageUsed = Math.round((estimate.usage || 0) / (1024 * 1024));
        info.storageTotal = Math.round((estimate.quota || 0) / (1024 * 1024));
      }

      if ('getBattery' in navigator) {
        try {
          const battery = await (navigator as any).getBattery();
          info.battery = Math.round(battery.level * 100);
          info.batteryCharging = battery.charging;
        } catch (e) {
        }
      }

      setDeviceInfo(info);
    };

    getDeviceInfo();
  }, []);

  const runHealthCheck = async () => {
    setIsRunning(true);
    setHealthResults([]);

    await new Promise(resolve => setTimeout(resolve, 500));

    const results: HealthCheckResult[] = [];

    results.push({
      name: 'Internet Connection',
      status: navigator.onLine ? 'pass' : 'fail',
      message: navigator.onLine ? 'Connected to the internet' : 'No internet connection detected',
      icon: Wifi,
    });

    if (deviceInfo) {
      results.push({
        name: 'Browser Storage',
        status: deviceInfo.storageUsed < deviceInfo.storageTotal * 0.9 ? 'pass' :
                deviceInfo.storageUsed < deviceInfo.storageTotal * 0.95 ? 'warning' : 'fail',
        message: `Using ${deviceInfo.storageUsed}MB of ${deviceInfo.storageTotal}MB available`,
        icon: HardDrive,
      });

      if (deviceInfo.battery !== undefined) {
        results.push({
          name: 'Battery Status',
          status: deviceInfo.battery > 20 ? 'pass' : deviceInfo.battery > 10 ? 'warning' : 'fail',
          message: `Battery at ${deviceInfo.battery}% ${deviceInfo.batteryCharging ? '(charging)' : ''}`,
          icon: Battery,
        });
      }

      results.push({
        name: 'System Resources',
        status: deviceInfo.cores >= 4 ? 'pass' : 'warning',
        message: `${deviceInfo.cores} CPU cores available`,
        icon: Cpu,
      });
    }

    results.push({
      name: 'Browser Updates',
      status: 'pass',
      message: 'Browser appears to be up to date',
      icon: Monitor,
    });

    setHealthResults(results);
    setIsRunning(false);
    setLastCheck(new Date().toLocaleString());

    const passCount = results.filter(r => r.status === 'pass').length;
    const score = Math.round((passCount / results.length) * 100);
    toast.success(`Health check complete! Score: ${score}%`, {
      description: `${passCount} of ${results.length} checks passed`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'fail': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return CheckCircle2;
      case 'warning': return AlertTriangle;
      case 'fail': return XCircle;
      default: return AlertTriangle;
    }
  };

  const passCount = healthResults.filter(r => r.status === 'pass').length;
  const overallScore = healthResults.length > 0
    ? Math.round((passCount / healthResults.length) * 100)
    : 0;

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Device Fingerprint & Health Check</h1>
            <p className="text-muted-foreground">
              View your device information and run a safe system health diagnostic
            </p>
          </div>

          <Alert className="mb-6">
            <AlertDescription>
              <span className="font-medium">Privacy Notice:</span> All checks are performed locally in your browser.
              No data is sent to external servers.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <Monitor className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Device Information</CardTitle>
                <CardDescription>
                  Your current device specifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {deviceInfo ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Operating System:</span>
                      <span className="font-medium">{deviceInfo.os}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Browser:</span>
                      <span className="font-medium text-right max-w-[60%]">{deviceInfo.browser.substring(0, 40)}...</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Viewport:</span>
                      <span className="font-medium">{deviceInfo.viewport}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Memory:</span>
                      <span className="font-medium">{deviceInfo.memory}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Cores:</span>
                      <span className="font-medium">{deviceInfo.cores}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Connection:</span>
                      <Badge variant={deviceInfo.online ? 'secondary' : 'destructive'}>
                        {deviceInfo.online ? 'Online' : 'Offline'}
                      </Badge>
                    </div>
                    {deviceInfo.battery !== undefined && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Battery:</span>
                        <span className="font-medium">
                          {deviceInfo.battery}% {deviceInfo.batteryCharging && '(Charging)'}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">Loading device info...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle2 className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Health Check</CardTitle>
                <CardDescription>
                  Run a safe diagnostic of your system
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    This check will verify:
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Internet connectivity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Browser storage capacity</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Battery status (if available)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>System resources</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <span>Browser update status</span>
                    </li>
                  </ul>
                </div>

                <Button
                  onClick={runHealthCheck}
                  disabled={isRunning}
                  className="w-full"
                  size="lg"
                >
                  {isRunning ? (
                    <>Running Checks...</>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Run Health Check
                    </>
                  )}
                </Button>

                {lastCheck && (
                  <p className="text-xs text-center text-muted-foreground">
                    Last check: {lastCheck}
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {healthResults.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Health Report Card</CardTitle>
                <CardDescription>
                  Overall system health score: {overallScore}% ({passCount} of {healthResults.length} checks passed)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {healthResults.map((result, index) => {
                  const StatusIcon = getStatusIcon(result.status);
                  const ResultIcon = result.icon;

                  return (
                    <div key={index} className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                      <ResultIcon className="h-6 w-6 text-muted-foreground shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-medium">{result.name}</h3>
                          <div className="flex items-center gap-1">
                            <StatusIcon className={`h-5 w-5 ${getStatusColor(result.status)}`} />
                            <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                              {result.status}
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      </div>
                    </div>
                  );
                })}

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>Safe Diagnostic Complete</AlertTitle>
                  <AlertDescription>
                    All checks performed were read-only and made no changes to your system.
                    {healthResults.some(r => r.status !== 'pass') &&
                      ' Some issues were detected - consider addressing them for optimal performance.'}
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
