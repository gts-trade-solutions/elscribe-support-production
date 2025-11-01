'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { AppLayout } from '../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Shield, ExternalLink, AlertTriangle, CheckCircle2, Copy, Clock, AlertCircle, ThumbsUp } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EscalationModal } from '@/components/escalation-modal';
import { mockChecklistSteps, type ChecklistStep } from '@/lib/mock-data';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  confidence?: number;
  sources?: { title: string; url: string }[];
  suggestions?: string[];
  requiresConsent?: boolean;
}

const mockMessages: Message[] = [
  {
    role: 'assistant',
    content: "Hello! I'm here to help you with your device issues. What problem are you experiencing?",
  },
];

export default function InstantHelpPage() {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [input, setInput] = useState('');
  const [redactionEnabled, setRedactionEnabled] = useState(false);
  const [checklist, setChecklist] = useState<ChecklistStep[]>(mockChecklistSteps);
  const [escalationOpen, setEscalationOpen] = useState(false);
  const [escalatingStep, setEscalatingStep] = useState<ChecklistStep | null>(null);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: 'user', content: input };
    setMessages([...messages, userMessage]);

    setTimeout(() => {
      const assistantMessage: Message = {
        role: 'assistant',
        content: 'Based on your WiFi connectivity issue, here are the recommended steps to resolve it. I\'ll guide you through each one safely. Follow the checklist on the right to track your progress.',
        confidence: 85,
        sources: [
          { title: 'Microsoft Support - WiFi Troubleshooting', url: 'https://support.microsoft.com/windows/fix-wi-fi-connection-issues' },
          { title: 'Intel - Network Connectivity Guide', url: 'https://www.intel.com/content/www/us/en/support/articles/000005489/wireless.html' },
        ],
        suggestions: [
          'Check router placement and signal strength',
          'Update WiFi adapter firmware',
          'Run Windows Network Troubleshooter',
        ],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    }, 1000);

    setInput('');
  };

  const handleCopyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
    toast.success('Command copied to clipboard');
  };

  const handleStepComplete = (stepId: string) => {
    setChecklist(checklist.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    ));
    const step = checklist.find(s => s.id === stepId);
    if (step) {
      toast.success(`Step completed: ${step.title}`);
    }
  };

  const handleNotFixed = (step: ChecklistStep) => {
    setEscalatingStep(step);
    setEscalationOpen(true);
    toast.info('Opening escalation options...');
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <AppLayout>
      <div className="container py-6">
        <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="border-b">
                <div className="flex items-center justify-between">
                  <CardTitle>Instant Help Chat</CardTitle>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="redaction"
                      checked={redactionEnabled}
                      onCheckedChange={(checked) => setRedactionEnabled(checked as boolean)}
                    />
                    <label
                      htmlFor="redaction"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Privacy Redaction
                    </label>
                    <Shield className={`h-4 w-4 ${redactionEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0">
                <ScrollArea className="flex-1 p-6">
                  <div className="space-y-4">
                    {messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-4 ${
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                          {message.confidence && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium">Confidence</span>
                                <Badge variant="secondary" className="text-xs">
                                  {message.confidence}%
                                </Badge>
                              </div>
                            </div>
                          )}

                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-2">Sources:</p>
                              <div className="space-y-1">
                                {message.sources.map((source, idx) => (
                                  <a
                                    key={idx}
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    {source.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.suggestions && message.suggestions.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-border/50">
                              <p className="text-xs font-medium mb-2">Try next:</p>
                              <div className="flex flex-wrap gap-2">
                                {message.suggestions.map((suggestion, idx) => (
                                  <Button
                                    key={idx}
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-auto py-1.5"
                                    onClick={() => setInput(suggestion)}
                                  >
                                    {suggestion}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {message.requiresConsent && (
                            <Alert className="mt-3">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription className="text-xs">
                                This action requires your approval before proceeding.
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Describe your issue..."
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                      className="flex-1"
                    />
                    <Button onClick={handleSend}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4 overflow-y-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Troubleshooting Checklist</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {checklist.map((step) => (
                  <div key={step.id} className="space-y-3 pb-4 border-b last:border-0 last:pb-0">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        id={`check-${step.id}`}
                        checked={step.completed}
                        onCheckedChange={() => handleStepComplete(step.id)}
                      />
                      <div className="flex-1 space-y-2">
                        <label
                          htmlFor={`check-${step.id}`}
                          className="text-sm font-medium leading-none cursor-pointer block"
                        >
                          {step.title}
                        </label>
                        <p className="text-xs text-muted-foreground">{step.description}</p>

                        <div className="flex items-center gap-3 text-xs">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span>{step.estimatedMinutes} min</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <AlertCircle className={`h-3 w-3 ${getRiskColor(step.risk)}`} />
                            <span className={getRiskColor(step.risk)}>{step.risk} risk</span>
                          </div>
                        </div>

                        {step.command && (
                          <div className="bg-muted/50 rounded p-2 space-y-1">
                            <div className="flex items-center justify-between">
                              <code className="text-xs">{step.command}</code>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleCopyCommand(step.command!)}
                              >
                                {copiedCommand === step.command ? (
                                  <CheckCircle2 className="h-3 w-3 text-green-600" />
                                ) : (
                                  <Copy className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                          </div>
                        )}

                        {step.rollback && (
                          <Alert className="py-2">
                            <AlertDescription className="text-xs">
                              <span className="font-medium">Rollback:</span> {step.rollback}
                            </AlertDescription>
                          </Alert>
                        )}

                        {!step.completed && (
                          <div className="flex gap-2 pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs flex-1"
                              onClick={() => handleStepComplete(step.id)}
                            >
                              <ThumbsUp className="h-3 w-3 mr-1" />
                              Fixed
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs flex-1"
                              onClick={() => handleNotFixed(step)}
                            >
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Not Fixed
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Safety Indicators</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Consent Required</p>
                    <p className="text-xs text-muted-foreground">
                      No commands run without approval
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">Verified Sources</p>
                    <p className="text-xs text-muted-foreground">
                      All guidance backed by citations
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Shield className={`h-5 w-5 shrink-0 ${redactionEnabled ? 'text-green-600' : 'text-muted-foreground'}`} />
                  <div>
                    <p className="text-sm font-medium">Privacy Protected</p>
                    <p className="text-xs text-muted-foreground">
                      {redactionEnabled ? 'Redaction is active' : 'Enable redaction for sensitive data'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <span className="font-medium">Never share:</span> Passwords, 2FA codes, or credit card numbers. We will never ask for these.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>

      <EscalationModal
        open={escalationOpen}
        onOpenChange={setEscalationOpen}
        stepTitle={escalatingStep?.title || ''}
      />
    </AppLayout>
  );
}
