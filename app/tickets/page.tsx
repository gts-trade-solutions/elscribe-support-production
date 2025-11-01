'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AppLayout } from '../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, Search, Clock, CheckCircle2, AlertCircle, Filter, X } from 'lucide-react';
import { mockTickets, type Ticket, type TicketStatus, type TicketPriority } from '@/lib/mock-data';

const statusConfig = {
  open: { label: 'Open', icon: AlertCircle, variant: 'destructive' as const },
  in_progress: { label: 'In Progress', icon: Clock, variant: 'default' as const },
  waiting_customer: { label: 'Waiting', icon: Clock, variant: 'default' as const },
  resolved: { label: 'Resolved', icon: CheckCircle2, variant: 'secondary' as const },
  closed: { label: 'Closed', icon: CheckCircle2, variant: 'secondary' as const },
};

const priorityConfig = {
  low: { label: 'Low', variant: 'secondary' as const },
  medium: { label: 'Medium', variant: 'default' as const },
  high: { label: 'High', variant: 'destructive' as const },
  critical: { label: 'Critical', variant: 'destructive' as const },
};

export default function TicketsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<TicketStatus[]>([]);
  const [selectedPriorities, setSelectedPriorities] = useState<TicketPriority[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const allTags = Array.from(new Set(mockTickets.flatMap(t => t.tags)));

  const filteredTickets = mockTickets.filter(ticket => {
    if (searchQuery && !ticket.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !ticket.id.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (selectedStatuses.length > 0 && !selectedStatuses.includes(ticket.status)) {
      return false;
    }
    if (selectedPriorities.length > 0 && !selectedPriorities.includes(ticket.priority)) {
      return false;
    }
    if (selectedTags.length > 0 && !selectedTags.some(tag => ticket.tags.includes(tag))) {
      return false;
    }
    return true;
  });

  const toggleStatus = (status: TicketStatus) => {
    setSelectedStatuses(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const togglePriority = (priority: TicketPriority) => {
    setSelectedPriorities(prev =>
      prev.includes(priority) ? prev.filter(p => p !== priority) : [...prev, priority]
    );
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const clearFilters = () => {
    setSelectedStatuses([]);
    setSelectedPriorities([]);
    setSelectedTags([]);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedStatuses.length > 0 || selectedPriorities.length > 0 ||
                           selectedTags.length > 0 || searchQuery !== '';

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2">Support Tickets</h1>
              <p className="text-muted-foreground">
                Track and manage your support requests
              </p>
            </div>
            <Link href="/tickets/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
            </Link>
          </div>

          <div className="mb-6 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tickets by ID or title..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Filters</span>
              </div>

              <div className="flex items-start gap-4 flex-wrap">
                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Status:</span>
                  <div className="flex gap-2 flex-wrap">
                    {(['open', 'in_progress', 'waiting_customer', 'resolved'] as TicketStatus[]).map(status => (
                      <Button
                        key={status}
                        variant={selectedStatuses.includes(status) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleStatus(status)}
                      >
                        {statusConfig[status].label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Priority:</span>
                  <div className="flex gap-2 flex-wrap">
                    {(['low', 'medium', 'high', 'critical'] as TicketPriority[]).map(priority => (
                      <Button
                        key={priority}
                        variant={selectedPriorities.includes(priority) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => togglePriority(priority)}
                      >
                        {priority}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Tags:</span>
                  <div className="flex gap-2 flex-wrap">
                    {allTags.map(tag => (
                      <Button
                        key={tag}
                        variant={selectedTags.includes(tag) ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Showing {filteredTickets.length} of {mockTickets.length} tickets
                </span>
                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={clearFilters}
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear all filters
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredTickets.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No tickets match your filters</p>
                  <Button variant="link" onClick={clearFilters} className="mt-2">
                    Clear filters
                  </Button>
                </CardContent>
              </Card>
            ) : (
              filteredTickets.map((ticket) => {
                const statusInfo = statusConfig[ticket.status as keyof typeof statusConfig];
                const priorityInfo = priorityConfig[ticket.priority as keyof typeof priorityConfig];
                const StatusIcon = statusInfo.icon;

                return (
                  <Link key={ticket.id} href={`/tickets/${ticket.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <span className="text-sm font-mono text-muted-foreground">
                                {ticket.id}
                              </span>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {statusInfo.label}
                              </Badge>
                              <Badge variant={priorityInfo.variant}>
                                {priorityInfo.label}
                              </Badge>
                            </div>
                            <CardTitle className="text-xl mb-2">{ticket.title}</CardTitle>
                            <CardDescription className="space-y-2">
                              <div>Created {ticket.created} • Last updated {ticket.lastUpdate}</div>
                              <div className="flex items-center gap-2 flex-wrap">
                                {ticket.tags.map(tag => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                              {ticket.slaStatus && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span className={`text-xs font-medium ${
                                    ticket.slaStatus === 'breached' ? 'text-red-600' :
                                    ticket.slaStatus === 'at-risk' ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    SLA: {ticket.slaDeadline} ({ticket.slaStatus.replace('-', ' ')})
                                  </span>
                                </div>
                              )}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
