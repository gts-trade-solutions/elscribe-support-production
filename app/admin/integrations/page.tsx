'use client';

import { AppLayout } from '../../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Settings,
  RefreshCw,
  ExternalLink,
  Info,
  Laptop,
  Smartphone,
  Monitor,
  Cloud,
  Package
} from 'lucide-react';

const mockIntegrations = {
  mdm: [
    {
      id: 'intune',
      name: 'Microsoft Intune',
      description: 'Enterprise mobility management for Windows and mobile devices',
      status: 'connected',
      lastSync: '5 mins ago',
      devices: 234,
      icon: Monitor,
    },
    {
      id: 'jamf',
      name: 'Jamf Pro',
      description: 'Apple device management for macOS and iOS',
      status: 'not_configured',
      lastSync: null,
      devices: 0,
      icon: Laptop,
    },
    {
      id: 'workspace-one',
      name: 'VMware Workspace ONE',
      description: 'Unified endpoint management platform',
      status: 'error',
      lastSync: '2 hours ago',
      devices: 45,
      icon: Cloud,
    },
    {
      id: 'mobile-iron',
      name: 'MobileIron',
      description: 'Mobile device and app management',
      status: 'not_configured',
      lastSync: null,
      devices: 0,
      icon: Smartphone,
    },
  ],
  os: [
    {
      id: 'windows-update',
      name: 'Windows Update',
      description: 'Microsoft Windows Update services integration',
      status: 'connected',
      lastSync: '10 mins ago',
      managed: 156,
      icon: Monitor,
    },
    {
      id: 'apple-business',
      name: 'Apple Business Manager',
      description: 'Automated device enrollment and app distribution',
      status: 'connected',
      lastSync: '1 hour ago',
      managed: 89,
      icon: Laptop,
    },
    {
      id: 'android-enterprise',
      name: 'Android Enterprise',
      description: 'Google Play managed configurations',
      status: 'not_configured',
      lastSync: null,
      managed: 0,
      icon: Smartphone,
    },
    {
      id: 'linux-updates',
      name: 'Linux Package Managers',
      description: 'apt, yum, dnf package management support',
      status: 'connected',
      lastSync: '30 mins ago',
      managed: 34,
      icon: Monitor,
    },
  ],
  vendors: [
    {
      id: 'dell',
      name: 'Dell TechDirect',
      description: 'Dell hardware support and warranty information',
      status: 'connected',
      lastSync: '2 hours ago',
      devices: 67,
    },
    {
      id: 'hp',
      name: 'HP Support Assistant',
      description: 'HP device diagnostics and driver updates',
      status: 'not_configured',
      lastSync: null,
      devices: 0,
    },
    {
      id: 'lenovo',
      name: 'Lenovo Vantage',
      description: 'Lenovo system updates and support',
      status: 'connected',
      lastSync: '1 hour ago',
      devices: 42,
    },
    {
      id: 'apple',
      name: 'Apple GSX',
      description: 'Apple service and repair integration',
      status: 'not_configured',
      lastSync: null,
      devices: 0,
    },
  ],
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'connected':
      return { variant: 'secondary' as const, label: 'Connected', icon: CheckCircle2, color: 'text-green-600' };
    case 'error':
      return { variant: 'destructive' as const, label: 'Error', icon: XCircle, color: 'text-red-600' };
    case 'not_configured':
      return { variant: 'outline' as const, label: 'Not Configured', icon: AlertCircle, color: 'text-gray-600' };
    default:
      return { variant: 'outline' as const, label: 'Unknown', icon: AlertCircle, color: 'text-gray-600' };
  }
};

export default function AdminIntegrationsPage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Integrations & Vendor Management</h1>
            <p className="text-muted-foreground">
              Connect with MDM platforms, OS update services, and hardware vendors
            </p>
          </div>

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">Integration Status:</span> Backend services are required to enable real-time sync with external platforms. Current connections are simulated for demonstration.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">MDM Platforms</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold">
                  {mockIntegrations.mdm.filter(i => i.status === 'connected').length} / {mockIntegrations.mdm.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Active connections</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">OS Integrations</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold">
                  {mockIntegrations.os.filter(i => i.status === 'connected').length} / {mockIntegrations.os.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Operating systems</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Vendor Partners</span>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div className="text-2xl font-bold">
                  {mockIntegrations.vendors.filter(i => i.status === 'connected').length} / {mockIntegrations.vendors.length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Hardware vendors</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="mdm" className="space-y-6">
            <TabsList>
              <TabsTrigger value="mdm">MDM Platforms</TabsTrigger>
              <TabsTrigger value="os">Operating Systems</TabsTrigger>
              <TabsTrigger value="vendors">Hardware Vendors</TabsTrigger>
            </TabsList>

            <TabsContent value="mdm" className="space-y-4">
              {mockIntegrations.mdm.map((integration) => {
                const statusInfo = getStatusBadge(integration.status);
                const Icon = integration.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={integration.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{integration.name}</h3>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {integration.description}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Managed Devices</span>
                                <p className="font-medium">{integration.devices}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Sync</span>
                                <p className="font-medium">{integration.lastSync || 'Never'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {integration.status === 'connected' && (
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Sync Now
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          {integration.status === 'not_configured' && (
                            <Button size="sm">Connect</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="os" className="space-y-4">
              {mockIntegrations.os.map((integration) => {
                const statusInfo = getStatusBadge(integration.status);
                const Icon = integration.icon;
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={integration.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{integration.name}</h3>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {integration.description}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Managed Devices</span>
                                <p className="font-medium">{integration.managed}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Sync</span>
                                <p className="font-medium">{integration.lastSync || 'Never'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {integration.status === 'connected' && (
                            <>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Check Updates
                              </Button>
                              <Button variant="outline" size="sm">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          {integration.status === 'not_configured' && (
                            <Button size="sm">Configure</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Update Policies</CardTitle>
                  <CardDescription>
                    Configure automatic update behavior across platforms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium">Automatic Windows Updates</p>
                      <p className="text-sm text-muted-foreground">
                        Install updates automatically during maintenance windows
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium">macOS Auto-Update</p>
                      <p className="text-sm text-muted-foreground">
                        Download and install system updates automatically
                      </p>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="font-medium">Linux Package Auto-Update</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically apply security patches
                      </p>
                    </div>
                    <Switch />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="vendors" className="space-y-4">
              {mockIntegrations.vendors.map((integration) => {
                const statusInfo = getStatusBadge(integration.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={integration.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{integration.name}</h3>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {integration.description}
                            </p>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Registered Devices</span>
                                <p className="font-medium">{integration.devices}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Last Sync</span>
                                <p className="font-medium">{integration.lastSync || 'Never'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {integration.status === 'connected' && (
                            <>
                              <Button variant="outline" size="sm">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Sync
                              </Button>
                              <Button variant="outline" size="sm">
                                View Devices
                              </Button>
                            </>
                          )}
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          {integration.status === 'not_configured' && (
                            <Button size="sm">Connect</Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Vendor Integration Benefits</CardTitle>
                  <CardDescription>
                    Why connect with hardware vendors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {[
                      'Automatic warranty status tracking',
                      'Direct access to vendor support and diagnostics',
                      'Automated driver and firmware updates',
                      'Parts ordering and repair workflow integration',
                      'Enhanced device health monitoring',
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <span className="text-sm">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
