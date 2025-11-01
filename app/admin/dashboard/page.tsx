'use client';

import { AppLayout } from '../../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Monitor, Smartphone, Laptop, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const mockFleetDevices = [
  { type: 'Windows', count: 245, status: 'healthy', icon: Monitor },
  { type: 'macOS', count: 128, status: 'healthy', icon: Laptop },
  { type: 'iOS', count: 186, status: 'healthy', icon: Smartphone },
  { type: 'Android', count: 92, status: 'warning', icon: Smartphone },
];

const mockRecentIssues = [
  {
    device: 'WIN-DESK-042',
    user: 'John Smith',
    issue: 'WiFi connectivity',
    status: 'resolved',
    time: '2 hours ago',
  },
  {
    device: 'MAC-LPT-108',
    user: 'Sarah Chen',
    issue: 'Battery draining',
    status: 'in_progress',
    time: '4 hours ago',
  },
  {
    device: 'IPHONE-234',
    user: 'Mike Johnson',
    issue: 'Storage full',
    status: 'open',
    time: '6 hours ago',
  },
];

export default function AdminDashboardPage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Fleet Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor and manage your organization's devices
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
                <Monitor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">651</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+12</span> this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Issues</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">23</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-yellow-600">8 high priority</span>
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Resolved Today</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">47</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">+18%</span> vs yesterday
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Resolution</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2 hrs</div>
                <p className="text-xs text-muted-foreground">
                  <span className="text-green-600">-12%</span> this week
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle>Fleet Overview</CardTitle>
                <CardDescription>Device distribution by platform</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockFleetDevices.map((device) => {
                    const Icon = device.icon;
                    return (
                      <div key={device.type} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">{device.type}</p>
                            <p className="text-sm text-muted-foreground">{device.count} devices</p>
                          </div>
                        </div>
                        <Badge variant={device.status === 'healthy' ? 'secondary' : 'default'}>
                          {device.status}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Issues</CardTitle>
                <CardDescription>Latest support requests across fleet</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRecentIssues.map((issue, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium text-sm mb-1">{issue.device}</p>
                        <p className="text-sm text-muted-foreground mb-1">{issue.user}</p>
                        <p className="text-xs text-muted-foreground">{issue.issue}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={
                            issue.status === 'resolved'
                              ? 'secondary'
                              : issue.status === 'in_progress'
                              ? 'default'
                              : 'destructive'
                          }
                        >
                          {issue.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">{issue.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Device Health Trends</CardTitle>
              <CardDescription>Weekly issue breakdown by category</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Network Issues</span>
                    <span className="text-sm text-muted-foreground">124 incidents</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600" style={{ width: '38%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Hardware Problems</span>
                    <span className="text-sm text-muted-foreground">87 incidents</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-green-600" style={{ width: '26%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Software Updates</span>
                    <span className="text-sm text-muted-foreground">65 incidents</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-yellow-600" style={{ width: '20%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Performance Issues</span>
                    <span className="text-sm text-muted-foreground">52 incidents</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-red-600" style={{ width: '16%' }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
