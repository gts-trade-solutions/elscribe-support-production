'use client';

import Link from 'next/link';
import { AppLayout } from '../../app-layout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, User, MessageSquare } from 'lucide-react';

const mockMyTickets = [
  {
    id: 'TKT-0998',
    customer: 'Alex Turner',
    subject: 'Unable to install printer drivers',
    priority: 'medium',
    status: 'in_progress',
    lastMessage: '15 mins ago',
    messages: 8,
  },
  {
    id: 'TKT-0995',
    customer: 'Linda Martinez',
    subject: 'Laptop running slow after Windows update',
    priority: 'low',
    status: 'waiting_customer',
    lastMessage: '2 hours ago',
    messages: 12,
  },
];

const mockTeamQueue = [
  {
    id: 'TKT-1005',
    agent: 'Sarah Johnson',
    customer: 'Tom Wilson',
    subject: 'MacBook screen flickering issue',
    priority: 'high',
    status: 'in_progress',
    lastUpdate: '10 mins ago',
  },
  {
    id: 'TKT-1006',
    agent: 'Mike Chen',
    customer: 'Rachel Green',
    subject: 'Android phone not charging',
    priority: 'medium',
    status: 'in_progress',
    lastUpdate: '45 mins ago',
  },
  {
    id: 'TKT-1007',
    agent: 'Emily Davis',
    customer: 'David Brown',
    subject: 'External hard drive formatting help',
    priority: 'low',
    status: 'waiting_customer',
    lastUpdate: '1 hour ago',
  },
];

const priorityConfig = {
  high: { variant: 'destructive' as const },
  medium: { variant: 'default' as const },
  low: { variant: 'secondary' as const },
};

const statusConfig = {
  in_progress: { label: 'In Progress', variant: 'default' as const },
  waiting_customer: { label: 'Waiting for Customer', variant: 'secondary' as const },
};

export default function AgentQueuePage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Work Queue</h1>
            <p className="text-muted-foreground">
              Manage your assigned tickets and view team activity
            </p>
          </div>

          <Tabs defaultValue="my-tickets" className="space-y-6">
            <TabsList>
              <TabsTrigger value="my-tickets">My Tickets ({mockMyTickets.length})</TabsTrigger>
              <TabsTrigger value="team-queue">Team Queue ({mockTeamQueue.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="my-tickets">
              <div className="space-y-3">
                {mockMyTickets.map((ticket) => {
                  const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];
                  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];

                  return (
                    <Card key={ticket.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                {ticket.id}
                              </span>
                              <Badge variant={priorityInfo.variant}>
                                {ticket.priority}
                              </Badge>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">{ticket.subject}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <User className="h-3 w-3" />
                                <span>{ticket.customer}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" />
                                <span>{ticket.messages} messages</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>Last message {ticket.lastMessage}</span>
                              </div>
                            </div>
                          </div>
                          <Link href={`/agent/console?ticket=${ticket.id}`}>
                            <Button>View</Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            <TabsContent value="team-queue">
              <div className="space-y-3">
                {mockTeamQueue.map((ticket) => {
                  const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];
                  const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];

                  return (
                    <Card key={ticket.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-sm font-mono text-muted-foreground">
                                {ticket.id}
                              </span>
                              <Badge variant={priorityInfo.variant}>
                                {ticket.priority}
                              </Badge>
                              <Badge variant={statusInfo.variant}>
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">{ticket.subject}</h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Agent: {ticket.agent}</span>
                              <span>•</span>
                              <span>Customer: {ticket.customer}</span>
                              <span>•</span>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{ticket.lastUpdate}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
