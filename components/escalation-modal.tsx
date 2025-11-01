'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Video, MonitorPlay, Calendar, AlertCircle, MessageCircle, Mail, Phone } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface EscalationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stepTitle: string;
}

export function EscalationModal({ open, onOpenChange, stepTitle }: EscalationModalProps) {
  const router = useRouter();
  const [deviceType, setDeviceType] = useState('');
  const [os, setOs] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [recentActions, setRecentActions] = useState('');
  const [showBackendDialog, setShowBackendDialog] = useState(false);

  const likelyCauses = [
    { cause: 'Network adapter driver outdated', confidence: 78 },
    { cause: 'Router firmware needs update', confidence: 65 },
    { cause: 'DNS configuration issue', confidence: 52 },
    { cause: 'Hardware compatibility problem', confidence: 41 },
  ];

  const handleScreenShare = () => {
    onOpenChange(false);
    router.push('/screen-share');
  };

  const handleBackendRequired = () => {
    setShowBackendDialog(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escalate for Additional Help</DialogTitle>
            <DialogDescription>
              Couldn't resolve: "{stepTitle}". Let's gather more information to connect you with an expert.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-sm">Device Information</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="device-type">Device Type</Label>
                  <Select value={deviceType} onValueChange={setDeviceType}>
                    <SelectTrigger id="device-type">
                      <SelectValue placeholder="Select device type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="laptop">Laptop</SelectItem>
                      <SelectItem value="desktop">Desktop</SelectItem>
                      <SelectItem value="smartphone">Smartphone</SelectItem>
                      <SelectItem value="tablet">Tablet</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="os">Operating System</Label>
                  <Select value={os} onValueChange={setOs}>
                    <SelectTrigger id="os">
                      <SelectValue placeholder="Select OS" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="windows11">Windows 11</SelectItem>
                      <SelectItem value="windows10">Windows 10</SelectItem>
                      <SelectItem value="macos">macOS</SelectItem>
                      <SelectItem value="linux">Linux</SelectItem>
                      <SelectItem value="ios">iOS</SelectItem>
                      <SelectItem value="android">Android</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="error-code">Error Code or Message (if any)</Label>
                <Input
                  id="error-code"
                  placeholder="e.g., 0x80070002 or 'Connection timeout'"
                  value={errorCode}
                  onChange={(e) => setErrorCode(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="recent-actions">What did you try before this?</Label>
                <Textarea
                  id="recent-actions"
                  placeholder="Describe the steps you've already taken..."
                  rows={3}
                  value={recentActions}
                  onChange={(e) => setRecentActions(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Likely Root Causes</h3>
              <div className="space-y-2">
                {likelyCauses.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <span className="text-sm">{item.cause}</span>
                    <Badge variant="secondary">{item.confidence}% match</Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Choose How to Continue</h3>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={handleBackendRequired}
                >
                  <MessageSquare className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Web Chat</div>
                    <div className="text-xs text-muted-foreground">Live chat support</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={handleScreenShare}
                >
                  <Video className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Screen Share</div>
                    <div className="text-xs text-muted-foreground">Show your screen</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={handleBackendRequired}
                >
                  <MonitorPlay className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Remote Session</div>
                    <div className="text-xs text-muted-foreground">Agent controls device</div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="h-auto flex-col gap-2 py-4"
                  onClick={handleBackendRequired}
                >
                  <Calendar className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-semibold text-sm">Book a Call</div>
                    <div className="text-xs text-muted-foreground">Schedule callback</div>
                  </div>
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Alternative Support Channels</h3>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto flex-col gap-2 py-3"
                  onClick={handleBackendRequired}
                >
                  <MessageCircle className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-xs">WhatsApp</div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto flex-col gap-2 py-3"
                  onClick={handleBackendRequired}
                >
                  <Mail className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-xs">Email</div>
                  </div>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto flex-col gap-2 py-3"
                  onClick={handleBackendRequired}
                >
                  <Phone className="h-5 w-5" />
                  <div className="text-center">
                    <div className="font-medium text-xs">SMS</div>
                  </div>
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showBackendDialog} onOpenChange={setShowBackendDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Backend Integration Required
            </DialogTitle>
            <DialogDescription>
              This feature requires backend integration to connect you with live agents and scheduling systems.
              In the full version, this will:
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
              <span>Connect you to available support agents in real-time</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
              <span>Enable remote desktop access with your consent</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
              <span>Integrate with calendar systems for appointment booking</span>
            </li>
          </ul>
          <div className="flex justify-end">
            <Button onClick={() => setShowBackendDialog(false)}>Got it</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
