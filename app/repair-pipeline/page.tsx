'use client';

import { AppLayout } from '../app-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Package,
  Wrench,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Info,
  ExternalLink,
  MapPin,
  Calendar,
  DollarSign
} from 'lucide-react';

const mockOrders = [
  {
    id: 'ORD-1024',
    item: 'MacBook Pro Battery Replacement',
    status: 'in_transit',
    orderDate: 'Oct 25, 2025',
    estimatedDelivery: 'Nov 2, 2025',
    price: '$129.99',
    tracking: 'TRK-894532',
  },
  {
    id: 'ORD-1023',
    item: 'Laptop Cooling Fan',
    status: 'delivered',
    orderDate: 'Oct 20, 2025',
    deliveredDate: 'Oct 28, 2025',
    price: '$45.50',
    tracking: 'TRK-894501',
  },
  {
    id: 'ORD-1022',
    item: 'USB-C Charging Cable',
    status: 'cancelled',
    orderDate: 'Oct 15, 2025',
    price: '$19.99',
  },
];

const mockRepairs = [
  {
    id: 'REP-2045',
    device: 'MacBook Pro 16"',
    issue: 'Battery replacement and thermal paste reapplication',
    status: 'in_progress',
    technician: 'Sarah Chen',
    startDate: 'Oct 29, 2025',
    estimatedCompletion: 'Nov 1, 2025',
    location: 'Authorized Service Center - Downtown',
  },
  {
    id: 'REP-2044',
    device: 'iPhone 14',
    issue: 'Screen replacement',
    status: 'completed',
    technician: 'Mike Johnson',
    startDate: 'Oct 25, 2025',
    completedDate: 'Oct 26, 2025',
    location: 'Authorized Service Center - Mall',
  },
  {
    id: 'REP-2043',
    device: 'Dell XPS 15',
    issue: 'Motherboard diagnostic',
    status: 'pending',
    estimatedStart: 'Nov 3, 2025',
    location: 'Dell Service Center',
  },
];

const mockVendors = [
  {
    name: 'Apple Authorized Service Provider',
    rating: 4.8,
    services: ['Screen Repair', 'Battery Replacement', 'Logic Board Repair'],
    distance: '2.3 miles',
    availability: 'Next available: Tomorrow',
  },
  {
    name: 'Dell Support Center',
    rating: 4.6,
    services: ['Hardware Diagnostics', 'Part Replacement', 'Warranty Service'],
    distance: '5.1 miles',
    availability: 'Walk-ins welcome',
  },
  {
    name: 'uBreakiFix by Asurion',
    rating: 4.5,
    services: ['Phone Repair', 'Tablet Repair', 'Computer Repair'],
    distance: '1.8 miles',
    availability: 'Same-day service available',
  },
];

const getStatusInfo = (status: string) => {
  switch (status) {
    case 'in_transit':
      return { icon: Truck, label: 'In Transit', color: 'text-blue-600', variant: 'default' as const };
    case 'delivered':
      return { icon: CheckCircle2, label: 'Delivered', color: 'text-green-600', variant: 'secondary' as const };
    case 'cancelled':
      return { icon: AlertCircle, label: 'Cancelled', color: 'text-gray-600', variant: 'outline' as const };
    case 'in_progress':
      return { icon: Wrench, label: 'In Progress', color: 'text-blue-600', variant: 'default' as const };
    case 'completed':
      return { icon: CheckCircle2, label: 'Completed', color: 'text-green-600', variant: 'secondary' as const };
    case 'pending':
      return { icon: Clock, label: 'Pending', color: 'text-yellow-600', variant: 'outline' as const };
    default:
      return { icon: AlertCircle, label: 'Unknown', color: 'text-gray-600', variant: 'outline' as const };
  }
};

export default function RepairPipelinePage() {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Parts & Repair Pipeline</h1>
            <p className="text-muted-foreground">
              Order replacement parts and track repair services
            </p>
          </div>

          <Alert className="mb-6">
            <Info className="h-4 w-4" />
            <AlertDescription>
              <span className="font-medium">E-commerce Integration Required:</span> Parts ordering and payment processing require backend integration with vendor APIs and payment gateways.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Active Orders</span>
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">
                  {mockOrders.filter(o => o.status === 'in_transit').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Parts in transit</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Open Repairs</span>
                  <Wrench className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">
                  {mockRepairs.filter(r => r.status === 'in_progress' || r.status === 'pending').length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Devices being serviced</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Service Centers</span>
                  <MapPin className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-bold">{mockVendors.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Authorized nearby</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="parts" className="space-y-6">
            <TabsList>
              <TabsTrigger value="parts">Parts Orders</TabsTrigger>
              <TabsTrigger value="repairs">Repair Tracking</TabsTrigger>
              <TabsTrigger value="vendors">Service Centers</TabsTrigger>
            </TabsList>

            <TabsContent value="parts" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Your Parts Orders</CardTitle>
                    <CardDescription>
                      Track replacement parts and accessories
                    </CardDescription>
                  </div>
                  <Button>
                    <Package className="h-4 w-4 mr-2" />
                    Order Parts
                  </Button>
                </CardHeader>
              </Card>

              {mockOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={order.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{order.item}</h3>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <div className="grid md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Order ID</span>
                                <p className="font-medium font-mono">{order.id}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Order Date</span>
                                <p className="font-medium">{order.orderDate}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  {order.status === 'delivered' ? 'Delivered' : 'Est. Delivery'}
                                </span>
                                <p className="font-medium">
                                  {order.deliveredDate || order.estimatedDelivery || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Price</span>
                                <p className="font-medium">{order.price}</p>
                              </div>
                            </div>
                            {order.tracking && (
                              <div className="mt-3">
                                <span className="text-xs text-muted-foreground">
                                  Tracking: {order.tracking}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {order.status === 'in_transit' && (
                            <Button variant="outline" size="sm">
                              <Truck className="h-4 w-4 mr-2" />
                              Track
                            </Button>
                          )}
                          {order.status === 'delivered' && (
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Receipt
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="repairs" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Repair Services</CardTitle>
                    <CardDescription>
                      Track device repairs and service appointments
                    </CardDescription>
                  </div>
                  <Button>
                    <Calendar className="h-4 w-4 mr-2" />
                    Book Repair
                  </Button>
                </CardHeader>
              </Card>

              {mockRepairs.map((repair) => {
                const statusInfo = getStatusInfo(repair.status);
                const StatusIcon = statusInfo.icon;

                return (
                  <Card key={repair.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Wrench className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-lg">{repair.device}</h3>
                              <Badge variant={statusInfo.variant}>
                                <StatusIcon className={`h-3 w-3 mr-1 ${statusInfo.color}`} />
                                {statusInfo.label}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{repair.issue}</p>
                            <div className="grid md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Service ID</span>
                                <p className="font-medium font-mono">{repair.id}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  {repair.status === 'completed' ? 'Completed' : 'Start Date'}
                                </span>
                                <p className="font-medium">
                                  {repair.completedDate || repair.startDate || repair.estimatedStart}
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">
                                  {repair.status === 'completed' ? 'Technician' : 'Est. Completion'}
                                </span>
                                <p className="font-medium">
                                  {repair.technician || repair.estimatedCompletion || 'TBD'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span>{repair.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {repair.status === 'in_progress' && (
                            <Button variant="outline" size="sm">
                              View Status
                            </Button>
                          )}
                          {repair.status === 'completed' && (
                            <Button variant="outline" size="sm">
                              Download Report
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            <TabsContent value="vendors" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Authorized Service Centers</CardTitle>
                  <CardDescription>
                    Find nearby repair services for your devices
                  </CardDescription>
                </CardHeader>
              </Card>

              {mockVendors.map((vendor, index) => (
                <Card key={index}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg">{vendor.name}</h3>
                          <Badge variant="secondary">
                            {vendor.rating} ★
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-muted-foreground">{vendor.distance}</span>
                          </div>
                          <span className="text-muted-foreground">•</span>
                          <span className="text-muted-foreground">{vendor.availability}</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {vendor.services.map((service, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <MapPin className="h-4 w-4 mr-2" />
                          Directions
                        </Button>
                        <Button size="sm">
                          <Calendar className="h-4 w-4 mr-2" />
                          Book
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppLayout>
  );
}
