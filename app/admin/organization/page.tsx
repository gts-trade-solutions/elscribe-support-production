'use client';

import { AppLayout } from '../../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, UserPlus, MoreVertical } from 'lucide-react';

const mockUsers = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@company.com',
    role: 'Agent',
    status: 'active',
    lastActive: '2 hours ago',
  },
  {
    id: 2,
    name: 'Mike Chen',
    email: 'mike.c@company.com',
    role: 'Agent',
    status: 'active',
    lastActive: '1 hour ago',
  },
  {
    id: 3,
    name: 'Emily Davis',
    email: 'emily.d@company.com',
    role: 'Admin',
    status: 'active',
    lastActive: '30 mins ago',
  },
  {
    id: 4,
    name: 'Tom Wilson',
    email: 'tom.w@company.com',
    role: 'User',
    status: 'inactive',
    lastActive: '2 days ago',
  },
];

const mockDevices = [
  {
    id: 'WIN-DESK-042',
    owner: 'John Smith',
    type: 'Windows Desktop',
    status: 'healthy',
    lastSeen: '5 mins ago',
  },
  {
    id: 'MAC-LPT-108',
    owner: 'Sarah Chen',
    type: 'MacBook Pro',
    status: 'healthy',
    lastSeen: '1 hour ago',
  },
  {
    id: 'IPHONE-234',
    owner: 'Mike Johnson',
    type: 'iPhone 14',
    status: 'warning',
    lastSeen: '2 hours ago',
  },
  {
    id: 'WIN-LPT-095',
    owner: 'Rachel Green',
    type: 'Windows Laptop',
    status: 'healthy',
    lastSeen: '30 mins ago',
  },
];

export default function AdminOrganizationPage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Organization Management</h1>
            <p className="text-muted-foreground">
              Manage users, devices, and team members
            </p>
          </div>

          <Tabs defaultValue="users" className="space-y-6">
            <TabsList>
              <TabsTrigger value="users">Users ({mockUsers.length})</TabsTrigger>
              <TabsTrigger value="devices">Devices ({mockDevices.length})</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." className="pl-10" />
                </div>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite User
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {mockUsers.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-sm font-medium text-primary">
                              {user.name.split(' ').map(n => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge variant="outline">{user.role}</Badge>
                          <Badge variant={user.status === 'active' ? 'secondary' : 'default'}>
                            {user.status}
                          </Badge>
                          <span className="text-sm text-muted-foreground min-w-24 text-right">
                            {user.lastActive}
                          </span>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="devices" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search devices..." className="pl-10" />
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Register Device
                </Button>
              </div>

              <Card>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {mockDevices.map((device) => (
                      <div key={device.id} className="flex items-center justify-between p-4 hover:bg-muted/50">
                        <div>
                          <p className="font-medium font-mono text-sm">{device.id}</p>
                          <p className="text-sm text-muted-foreground mt-1">{device.type}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-medium">{device.owner}</p>
                            <p className="text-xs text-muted-foreground">{device.lastSeen}</p>
                          </div>
                          <Badge
                            variant={
                              device.status === 'healthy'
                                ? 'secondary'
                                : device.status === 'warning'
                                ? 'default'
                                : 'destructive'
                            }
                          >
                            {device.status}
                          </Badge>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teams" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search teams..." className="pl-10" />
                </div>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Support Team</CardTitle>
                    <CardDescription>Primary support agents</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">12</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Tickets</span>
                        <span className="font-medium">34</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg Response Time</span>
                        <span className="font-medium">2.4 hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Technical Team</CardTitle>
                    <CardDescription>Advanced technical support</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Members</span>
                        <span className="font-medium">6</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Active Tickets</span>
                        <span className="font-medium">15</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Avg Response Time</span>
                        <span className="font-medium">3.1 hrs</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
