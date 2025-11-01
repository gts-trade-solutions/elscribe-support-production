'use client';

import { AppLayout } from '../../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Clock, User, MessageSquare } from 'lucide-react';
import Link from 'next/link';

const mockTimeline = [
  {
    type: 'created',
    user: 'You',
    timestamp: '2 hours ago',
    content: 'My WiFi keeps disconnecting every few minutes on my MacBook Pro. I\'ve tried restarting the router but the issue persists.',
  },
  {
    type: 'agent_response',
    user: 'Agent Sarah',
    timestamp: '1 hour ago',
    content: 'Thank you for reaching out. I\'ll help you troubleshoot this issue. Can you tell me which version of macOS you\'re running?',
  },
  {
    type: 'user_response',
    user: 'You',
    timestamp: '50 mins ago',
    content: 'I\'m on macOS Sonoma 14.1.2',
  },
  {
    type: 'agent_response',
    user: 'Agent Sarah',
    timestamp: '30 mins ago',
    content: 'Great. Let\'s try resetting your network settings. I\'ll walk you through the steps safely.',
  },
];

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl">
          <Link href="/tickets">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tickets
            </Button>
          </Link>

          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-mono text-muted-foreground">
                      {params.id.toUpperCase()}
                    </span>
                    <Badge variant="destructive">Open</Badge>
                    <Badge variant="destructive">High Priority</Badge>
                  </div>
                  <CardTitle className="text-2xl mb-4">
                    WiFi keeps disconnecting on MacBook Pro
                  </CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      <span>Created by You</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>2 hours ago</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline">Close Ticket</Button>
              </div>
            </CardHeader>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Conversation Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockTimeline.map((event, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="relative">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      {index < mockTimeline.length - 1 && (
                        <div className="absolute top-10 left-5 bottom-0 w-px bg-border" />
                      )}
                    </div>
                    <div className="flex-1 pb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium">{event.user}</span>
                        <span className="text-sm text-muted-foreground">
                          {event.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {event.content}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-6" />

              <div className="space-y-3">
                <label className="text-sm font-medium">Add a response</label>
                <Textarea
                  placeholder="Type your message here..."
                  rows={4}
                />
                <div className="flex justify-end">
                  <Button>Send Response</Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <span className="ml-2 font-medium">Open</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Priority:</span>
                  <span className="ml-2 font-medium">High</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <span className="ml-2 font-medium">Network</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Assigned Agent:</span>
                  <span className="ml-2 font-medium">Sarah Johnson</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
