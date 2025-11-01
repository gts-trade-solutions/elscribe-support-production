'use client';

import Link from 'next/link';
import { AppLayout } from '../../app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Clock, AlertCircle, Filter } from 'lucide-react';

const mockInboxItems = [
  {
    id: 'TKT-1001',
    customer: 'John Smith',
    subject: 'WiFi keeps disconnecting on MacBook Pro',
    priority: 'high',
    status: 'unassigned',
    created: '5 mins ago',
    category: 'Network',
  },
  {
    id: 'TKT-1002',
    customer: 'Sarah Johnson',
    subject: 'Printer installation failing on Windows 11',
    priority: 'medium',
    status: 'unassigned',
    created: '12 mins ago',
    category: 'Hardware',
  },
  {
    id: 'TKT-1003',
    customer: 'Mike Chen',
    subject: 'iPhone storage management help needed',
    priority: 'low',
    status: 'unassigned',
    created: '25 mins ago',
    category: 'Mobile',
  },
  {
    id: 'TKT-1004',
    customer: 'Emily Davis',
    subject: 'Laptop battery draining too fast',
    priority: 'high',
    status: 'unassigned',
    created: '32 mins ago',
    category: 'Hardware',
  },
];

const priorityConfig = {
  high: { variant: 'destructive' as const, label: 'High' },
  medium: { variant: 'default' as const, label: 'Medium' },
  low: { variant: 'secondary' as const, label: 'Low' },
};

export default function AgentInboxPage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Agent Inbox</h1>
              <p className="text-muted-foreground">
                Manage incoming support requests
              </p>
            </div>
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold mb-1">12</div>
                <div className="text-sm text-muted-foreground">Unassigned</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold mb-1">8</div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold mb-1">45</div>
                <div className="text-sm text-muted-foreground">Resolved Today</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold mb-1">3.2 hrs</div>
                <div className="text-sm text-muted-foreground">Avg Response Time</div>
              </CardContent>
            </Card>
          </div>

          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets..."
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-3">
            {mockInboxItems.map((item) => {
              const priorityInfo = priorityConfig[item.priority as keyof typeof priorityConfig];

              return (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono text-muted-foreground">
                            {item.id}
                          </span>
                          <Badge variant={priorityInfo.variant}>
                            {priorityInfo.label}
                          </Badge>
                          <Badge variant="outline">{item.category}</Badge>
                          <Badge variant="outline">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {item.status}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{item.subject}</h3>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{item.customer}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{item.created}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/agent/console?ticket=${item.id}`}>
                          <Button>Assign to Me</Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
