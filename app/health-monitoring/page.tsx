'use client';

import { useState } from 'react';
import { AppLayout } from '../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Bell,
  Settings,
  BarChart3,
  Clock
} from 'lucide-react';

const mockHealthTrends = [
  { date: 'Oct 24', score: 95, status: 'healthy' },
  { date: 'Oct 25', score: 93, status: 'healthy' },
  { date: 'Oct 26', score: 88, status: 'warning' },
  { date: 'Oct 27', score: 92, status: 'healthy' },
  { date: 'Oct 28', score: 94, status: 'healthy' },
  { date: 'Oct 29', score: 96, status: 'healthy' },
  { date: 'Oct 30', score: 95, status: 'healthy' },
];

const mockAlerts = [
  {
    id: 1,
    type: 'warning',
    title: 'Storage approaching limit',
    description: 'Your device storage is 89% full. Consider cleaning up files.',
    time: '2 hours ago',
    device: 'MacBook Pro',
  },
  {
    id: 2,
    type: 'info',
    title: 'System update available',
    description: 'macOS Sonoma 14.1.3 is now available for installation.',
    time: '1 day ago',
    device: 'MacBook Pro',
  },
  {
    id: 3,
    type: 'success',
    title: 'Health check passed',
    description: 'All systems running optimally. No issues detected.',
    time: '2 days ago',
    device: 'MacBook Pro',
  },
];

const mockPredictiveIssues = [
  {
    id: 1,
    issue: 'Battery degradation detected',
    probability: 78,
    estimatedTime: '2-3 weeks',
    recommendation: 'Schedule battery replacement soon',
    severity: 'medium',
  },
  {
    id: 2,
    issue: 'Disk space will run out',
    probability: 65,
    estimatedTime: '1-2 months',
    recommendation: 'Archive old files or upgrade storage',
    severity: 'low',
  },
];

const mockScheduledChecks = [
  {
    id: 1,
    name: 'Weekly Full System Scan',
    frequency: 'Every Sunday at 2:00 AM',
    lastRun: '3 days ago',
    nextRun: 'In 4 days',
    status: 'active',
  },
  {
    id: 2,
    name: 'Daily Quick Health Check',
    frequency: 'Every day at 9:00 AM',
    lastRun: '2 hours ago',
    nextRun: 'Tomorrow at 9:00 AM',
    status: 'active',
  },
  {
    id: 3,
    name: 'Monthly Deep Diagnostics',
    frequency: 'First day of month at 3:00 AM',
    lastRun: '30 days ago',
    nextRun: 'In 1 day',
    status: 'active',
  },
];

export default function HealthMonitoringPage() {
  const [autoRepair, setAutoRepair] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const currentScore = mockHealthTrends[mockHealthTrends.length - 1].score;
  const previousScore = mockHealthTrends[mockHealthTrends.length - 2].score;
  const scoreTrend = currentScore - previousScore;

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Proactive Health Monitoring</h1>
            <p className="text-muted-foreground">
              Continuous device health tracking with predictive alerts and automated checks
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Health Score</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currentScore}%</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  {scoreTrend > 0 ? (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{scoreTrend}% from yesterday</span>
                    </>
                  ) : scoreTrend < 0 ? (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">{scoreTrend}% from yesterday</span>
                    </>
                  ) : (
                    <span>No change from yesterday</span>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <Bell className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockAlerts.filter(a => a.type === 'warning').length}</div>
                <p className="text-xs text-muted-foreground">
                  {mockAlerts.length} total notifications
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Scheduled Checks</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockScheduledChecks.length}</div>
                <p className="text-xs text-muted-foreground">
                  All active and running
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Predicted Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{mockPredictiveIssues.length}</div>
                <p className="text-xs text-muted-foreground">
                  Potential future problems
                </p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="trends" className="space-y-6">
            <TabsList>
              <TabsTrigger value="trends">Health Trends</TabsTrigger>
              <TabsTrigger value="alerts">Alerts & Notifications</TabsTrigger>
              <TabsTrigger value="predictive">Predictive Analysis</TabsTrigger>
              <TabsTrigger value="schedule">Scheduled Checks</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="trends" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>7-Day Health Score Trend</CardTitle>
                  <CardDescription>
                    Track your device health over time
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-end justify-between h-48 gap-2">
                      {mockHealthTrends.map((day, index) => (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="relative flex-1 w-full flex items-end">
                            <div
                              className={`w-full rounded-t transition-all ${
                                day.status === 'healthy' ? 'bg-green-500' :
                                day.status === 'warning' ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ height: `${day.score}%` }}
                            >
                              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs font-medium whitespace-nowrap">
                                {day.score}%
                              </div>
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">{day.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Health Checks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: 'System Performance', result: 'Pass', time: '2 hours ago' },
                      { name: 'Storage Health', result: 'Warning', time: '2 hours ago' },
                      { name: 'Network Connectivity', result: 'Pass', time: '2 hours ago' },
                      { name: 'Battery Health', result: 'Pass', time: '2 hours ago' },
                      { name: 'Security Status', result: 'Pass', time: '2 hours ago' },
                    ].map((check, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          {check.result === 'Pass' ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-yellow-600" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{check.name}</p>
                            <p className="text-xs text-muted-foreground">{check.time}</p>
                          </div>
                        </div>
                        <Badge variant={check.result === 'Pass' ? 'secondary' : 'default'}>
                          {check.result}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Health Metrics Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      { metric: 'CPU Performance', score: 98, color: 'bg-green-500' },
                      { metric: 'Memory Usage', score: 85, color: 'bg-blue-500' },
                      { metric: 'Disk Health', score: 78, color: 'bg-yellow-500' },
                      { metric: 'Network Speed', score: 92, color: 'bg-green-500' },
                      { metric: 'Battery Capacity', score: 88, color: 'bg-blue-500' },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">{item.metric}</span>
                          <span className="text-sm text-muted-foreground">{item.score}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${item.color} transition-all`}
                            style={{ width: `${item.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="alerts" className="space-y-4">
              {mockAlerts.map((alert) => (
                <Card key={alert.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3">
                        {alert.type === 'warning' && (
                          <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        )}
                        {alert.type === 'info' && (
                          <Bell className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        )}
                        {alert.type === 'success' && (
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{alert.title}</h3>
                            <Badge variant="outline" className="text-xs">
                              {alert.device}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.description}
                          </p>
                          <p className="text-xs text-muted-foreground">{alert.time}</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="predictive" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Predictive Issue Detection</CardTitle>
                  <CardDescription>
                    AI-powered analysis identifies potential problems before they occur
                  </CardDescription>
                </CardHeader>
              </Card>

              {mockPredictiveIssues.map((issue) => (
                <Card key={issue.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold">{issue.issue}</h3>
                            <Badge variant={issue.severity === 'high' ? 'destructive' : 'default'}>
                              {issue.severity} severity
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Probability</span>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-primary"
                                    style={{ width: `${issue.probability}%` }}
                                  />
                                </div>
                                <span className="font-medium">{issue.probability}%</span>
                              </div>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Estimated Time</span>
                              <p className="font-medium mt-1">{issue.estimatedTime}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Recommendation</span>
                              <p className="font-medium mt-1 text-xs">{issue.recommendation}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm">Take Action</Button>
                        <Button size="sm" variant="outline">Dismiss</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="schedule" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Scheduled Health Checks</CardTitle>
                    <CardDescription>
                      Automated routine checks run on your device
                    </CardDescription>
                  </div>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Add Schedule
                  </Button>
                </CardHeader>
              </Card>

              {mockScheduledChecks.map((check) => (
                <Card key={check.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold">{check.name}</h3>
                          <Badge variant="secondary">{check.status}</Badge>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Frequency</span>
                            <p className="font-medium mt-1">{check.frequency}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Last Run</span>
                            <p className="font-medium mt-1">{check.lastRun}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Next Run</span>
                            <p className="font-medium mt-1">{check.nextRun}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">Run Now</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Monitoring Settings</CardTitle>
                  <CardDescription>
                    Configure how health monitoring works on your device
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive alerts when issues are detected
                      </p>
                    </div>
                    <Switch
                      checked={notificationsEnabled}
                      onCheckedChange={setNotificationsEnabled}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Repair Minor Issues</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically fix safe, low-risk problems
                      </p>
                    </div>
                    <Switch
                      checked={autoRepair}
                      onCheckedChange={setAutoRepair}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Predictive Analysis</Label>
                      <p className="text-sm text-muted-foreground">
                        Use AI to predict future issues
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Background Monitoring</Label>
                      <p className="text-sm text-muted-foreground">
                        Continuously monitor device health
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Share Anonymous Diagnostics</Label>
                      <p className="text-sm text-muted-foreground">
                        Help improve FixMate by sharing anonymous data
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data Retention</CardTitle>
                  <CardDescription>
                    Control how long health data is stored
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Keep health check history for:</Label>
                    <div className="flex gap-2">
                      {['7 days', '30 days', '90 days', '1 year'].map((period) => (
                        <Button
                          key={period}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          {period}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
