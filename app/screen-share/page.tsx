'use client';

import { useState } from 'react';
import { AppLayout } from '../app-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Monitor, Video, VideoOff, Shield, Info } from 'lucide-react';

export default function ScreenSharePage() {
  const [isSharing, setIsSharing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startScreenShare = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });
      setStream(mediaStream);
      setIsSharing(true);

      mediaStream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };
    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  };

  const stopScreenShare = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsSharing(false);
  };

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Screen Share</h1>
            <p className="text-muted-foreground">
              Share your screen with a support agent for real-time assistance
            </p>
          </div>

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              This is a local preview only. Screen sharing with an agent requires backend integration.
              You can test the browser's screen capture API here.
              <br /><br />
              <span className="font-medium">Note for iOS:</span> Remote control is not possible on iOS devices through web browsers.
              For iOS support, users receive screen sharing with guided step-by-step instructions.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <Monitor className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Screen Capture Preview</CardTitle>
                <CardDescription>
                  Test your browser's screen sharing capability
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {!isSharing ? (
                    <Button onClick={startScreenShare} className="w-full" size="lg">
                      <Video className="h-4 w-4 mr-2" />
                      Start Screen Share
                    </Button>
                  ) : (
                    <Button onClick={stopScreenShare} variant="destructive" className="w-full" size="lg">
                      <VideoOff className="h-4 w-4 mr-2" />
                      Stop Sharing
                    </Button>
                  )}

                  {isSharing && (
                    <Badge variant="default" className="w-full justify-center py-2">
                      Screen sharing active
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <Shield className="h-8 w-8 mb-2 text-primary" />
                <CardTitle>Privacy & Security</CardTitle>
                <CardDescription>
                  Your privacy is protected during screen sharing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>You control what to share - entire screen, window, or tab</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>You can stop sharing at any time</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>Agents cannot access your device or files</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5" />
                    <span>Sessions are not recorded without consent</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {isSharing && stream && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  This is what the agent would see (local preview only)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg overflow-hidden aspect-video">
                  <video
                    autoPlay
                    ref={(video) => {
                      if (video && stream) {
                        video.srcObject = stream;
                      }
                    }}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {!isSharing && (
            <Card>
              <CardHeader>
                <CardTitle>How It Works</CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </span>
                    <div>
                      <p className="font-medium">Initiate Screen Share</p>
                      <p className="text-sm text-muted-foreground">
                        Click the button above to start screen sharing
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      2
                    </span>
                    <div>
                      <p className="font-medium">Choose What to Share</p>
                      <p className="text-sm text-muted-foreground">
                        Select your entire screen, a specific window, or browser tab
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      3
                    </span>
                    <div>
                      <p className="font-medium">Get Real-Time Help</p>
                      <p className="text-sm text-muted-foreground">
                        Agent can see your screen and guide you through the solution
                      </p>
                    </div>
                  </li>
                  <li className="flex gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      4
                    </span>
                    <div>
                      <p className="font-medium">Stop Anytime</p>
                      <p className="text-sm text-muted-foreground">
                        You're always in control - stop sharing whenever you want
                      </p>
                    </div>
                  </li>
                </ol>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
