'use client';

import { useState } from 'react';
import { AppLayout } from '../../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Send, Video, Phone, FileText, User, Clock, Info, Terminal, AlertTriangle, Copy, CheckCircle2, Play } from 'lucide-react';

const mockConversation = [
  {
    role: 'customer',
    name: 'Alex Turner',
    timestamp: '2:35 PM',
    message: 'Hi, I\'m having trouble installing printer drivers on my Windows 11 laptop. The installation keeps failing.',
  },
  {
    role: 'agent',
    name: 'You',
    timestamp: '2:37 PM',
    message: 'Hello Alex! I\'ll be happy to help you with the printer driver installation. Can you tell me the printer model?',
  },
  {
    role: 'customer',
    name: 'Alex Turner',
    timestamp: '2:38 PM',
    message: 'It\'s an HP LaserJet Pro M404dn',
  },
  {
    role: 'agent',
    name: 'You',
    timestamp: '2:39 PM',
    message: 'Thank you. Let me look up the correct drivers for that model. Have you tried downloading from the HP website directly?',
  },
];

const mockTicketInfo = {
  id: 'TKT-0998',
  customer: 'Alex Turner',
  email: 'alex.turner@example.com',
  priority: 'medium',
  category: 'Hardware',
  created: '45 mins ago',
  device: 'Windows 11 Laptop',
};

export default function AgentConsolePage() {
  const [message, setMessage] = useState('');

  return (
    <AppLayout>
      <div className="container py-6">
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">Demo Mode:</span> Real-time chat requires WebSocket backend for live agent-customer communication.
          </AlertDescription>
        </Alert>

        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{mockTicketInfo.customer}</CardTitle>
                      <p className="text-sm text-muted-foreground">{mockTicketInfo.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Video className="h-4 w-4 mr-2" />
                      Screen Share
                    </Button>
                    <Button variant="outline" size="sm">
                      <Phone className="h-4 w-4 mr-2" />
                      Call
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>

            <Card className="flex-1 flex flex-col">
              <CardHeader className="border-b">
                <CardTitle className="text-lg">Conversation</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {mockConversation.map((msg, index) => (
                      <div
                        key={index}
                        className={`flex gap-3 ${
                          msg.role === 'agent' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] ${
                            msg.role === 'agent' ? 'order-2' : 'order-1'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium">{msg.name}</span>
                            <span className="text-xs text-muted-foreground">{msg.timestamp}</span>
                          </div>
                          <div
                            className={`rounded-lg p-3 ${
                              msg.role === 'agent'
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            <p className="text-sm">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="min-h-[60px]"
                    />
                    <Button size="lg">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Ticket ID</span>
                  <span className="font-mono font-medium">{mockTicketInfo.id}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Priority</span>
                  <Badge variant="default">{mockTicketInfo.priority}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Category</span>
                  <Badge variant="outline">{mockTicketInfo.category}</Badge>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Device</span>
                  <span className="font-medium">{mockTicketInfo.device}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{mockTicketInfo.created}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Status</label>
                  <Select defaultValue="in_progress">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="waiting_customer">Waiting for Customer</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Change Priority</label>
                  <Select defaultValue="medium">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Add Internal Note
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Knowledge Base</CardTitle>
              </CardHeader>
              <CardContent>
                <Input placeholder="Search articles..." className="mb-3" />
                <div className="space-y-2">
                  <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                    HP Printer Driver Installation Guide
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                    Windows 11 Driver Troubleshooting
                  </Button>
                  <Button variant="ghost" size="sm" className="w-full justify-start text-left">
                    Common Printer Connection Issues
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Safe Script Runner
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <span className="font-medium">Approval Required:</span> Script execution requires supervisor approval. Backend integration needed.
                  </AlertDescription>
                </Alert>

                <Tabs defaultValue="library" className="space-y-3">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="library">Script Library</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="library" className="space-y-2">
                    {[
                      {
                        name: 'Clear Printer Queue',
                        risk: 'low',
                        description: 'Clears all pending print jobs',
                      },
                      {
                        name: 'Reset Network Adapter',
                        risk: 'medium',
                        description: 'Resets TCP/IP stack settings',
                      },
                      {
                        name: 'Reinstall Display Drivers',
                        risk: 'high',
                        description: 'Removes and reinstalls graphics drivers',
                      },
                    ].map((script, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-2 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">{script.name}</span>
                              <Badge
                                variant={
                                  script.risk === 'low'
                                    ? 'secondary'
                                    : script.risk === 'medium'
                                    ? 'default'
                                    : 'destructive'
                                }
                                className="text-xs"
                              >
                                {script.risk} risk
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {script.description}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="flex-1" disabled>
                            <Play className="h-3 w-3 mr-1" />
                            Run
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </TabsContent>

                  <TabsContent value="history" className="space-y-2">
                    {[
                      {
                        script: 'Clear DNS Cache',
                        status: 'success',
                        time: '15 mins ago',
                      },
                      {
                        script: 'Flush Print Spooler',
                        status: 'success',
                        time: '1 hour ago',
                      },
                      {
                        script: 'Network Diagnostics',
                        status: 'pending',
                        time: '2 hours ago',
                      },
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{item.script}</span>
                          {item.status === 'success' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-600" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>

                <Separator />

                <div className="space-y-2">
                  <p className="text-xs font-medium">Approval Workflow</p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. Agent selects pre-approved script</p>
                    <p>2. System reviews risk level</p>
                    <p>3. High-risk scripts require supervisor approval</p>
                    <p>4. Customer consent collected</p>
                    <p>5. Script executed with rollback option</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
