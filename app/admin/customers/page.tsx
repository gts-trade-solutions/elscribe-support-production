"use client";

import { useEffect, useState } from "react";
import { AppLayout } from "@/app/app-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RefreshCw, Users } from "lucide-react";

type CustomerRow = {
  id: string;
  email: string;
  role: "customer";
  isGuest: boolean;
  activeAccountType: "individual" | "company" | null;
  membershipRole: "owner" | "member" | null;
  planCode: string | null;
  billingStatus: string | null;
  seatLimit: number | null;
  createdAt: string;
  createdTickets: number;
};

export default function AdminCustomersPage() {
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [includeGuests, setIncludeGuests] = useState(false);

  const load = async (opts?: { search?: string; includeGuests?: boolean }) => {
    const nextSearch = opts?.search ?? search;
    const nextIncludeGuests = opts?.includeGuests ?? includeGuests;
    setLoading(true);
    try {
      const qs = new URLSearchParams({ role: "customer" });
      if (nextSearch.trim()) qs.set("search", nextSearch.trim());
      if (nextIncludeGuests) qs.set("includeGuests", "1");
      const res = await fetch(`/api/admin/users?${qs.toString()}`, {
        cache: "no-store",
      });
      const json = await res.json();
      if (res.ok) setCustomers(json.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ search: "", includeGuests: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="mt-2 text-muted-foreground">
                Review customer accounts, their active workspace context, and
                ticket volume across individual and company workspaces.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Switch
                  id="include-guests"
                  checked={includeGuests}
                  onCheckedChange={(checked) => {
                    setIncludeGuests(checked);
                    load({ includeGuests: checked });
                  }}
                />
                <Label htmlFor="include-guests" className="text-sm">
                  Include guests
                </Label>
              </div>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or user id"
                className="w-72"
              />
              <Button
                variant="outline"
                onClick={() => load()}
                disabled={loading}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Customer directory
              </CardTitle>
              <CardDescription>
                This view helps admins understand whether a user is operating as
                an individual customer or as part of a paid company workspace.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Workspace</TableHead>
                    <TableHead>Plan / billing</TableHead>
                    <TableHead>Tickets created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{customer.email}</span>
                          {customer.isGuest ? (
                            <Badge variant="outline" className="text-xs">
                              Guest
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.id}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.activeAccountType || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.membershipRole || "—"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {customer.planCode || "free"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {customer.billingStatus || "—"}
                        </div>
                      </TableCell>
                      <TableCell>{customer.createdTickets}</TableCell>
                    </TableRow>
                  ))}
                  {!customers.length ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-muted-foreground"
                      >
                        No customers found.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
