'use client';

import { AppLayout } from '../../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

export default function AdminPoliciesPage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Organization Policies</h1>
            <p className="text-muted-foreground">
              Configure security and support policies for your organization
            </p>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Security Policies</CardTitle>
                <CardDescription>
                  Control security settings for all devices and users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Enforce Privacy Redaction</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically redact sensitive information during all support sessions
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Require Session Recording Consent</Label>
                    <p className="text-sm text-muted-foreground">
                      Users must explicitly approve session recording
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Multi-Factor Authentication</Label>
                    <p className="text-sm text-muted-foreground">
                      Require MFA for all users accessing support portal
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">IP Whitelisting</Label>
                    <p className="text-sm text-muted-foreground">
                      Restrict access to support from specific IP ranges
                    </p>
                  </div>
                  <Switch />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Support Policies</CardTitle>
                <CardDescription>
                  Configure how support is delivered to users
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Auto-Assignment</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically assign new tickets to available agents
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Instant Help AI Assistant</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable AI-powered instant help for users
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Screen Share Required Approval</Label>
                    <p className="text-sm text-muted-foreground">
                      Require supervisor approval before initiating screen share
                    </p>
                  </div>
                  <Switch />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Command Execution Consent</Label>
                    <p className="text-sm text-muted-foreground">
                      Always ask for user consent before running commands
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data & Compliance</CardTitle>
                <CardDescription>
                  Manage data retention and compliance settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Session Recording</Label>
                    <p className="text-sm text-muted-foreground">
                      Record support sessions for quality assurance
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Data Retention (90 days)</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete support data after retention period
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">GDPR Compliance Mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable additional privacy controls for GDPR compliance
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="font-medium">Audit Logging</Label>
                    <p className="text-sm text-muted-foreground">
                      Maintain detailed logs of all system activities
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Service Level Agreements</CardTitle>
                <CardDescription>
                  Define response and resolution time targets
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm">Priority</Label>
                    <div className="space-y-2">
                      <Badge variant="destructive">High</Badge>
                      <Badge variant="default">Medium</Badge>
                      <Badge variant="secondary">Low</Badge>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Response Time</Label>
                    <div className="space-y-2 text-sm">
                      <p>15 minutes</p>
                      <p>2 hours</p>
                      <p>8 hours</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm">Resolution Time</Label>
                    <div className="space-y-2 text-sm">
                      <p>4 hours</p>
                      <p>24 hours</p>
                      <p>72 hours</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save All Changes</Button>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
