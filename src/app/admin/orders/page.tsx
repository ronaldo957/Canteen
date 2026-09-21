"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Search, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime, formatINR, ORDER_STATUS_LABELS } from "@/lib/utils";

interface OrderRow {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  totalAmount: string;
  createdAt: string;
  customerName: string | null;
  items: { id: string; itemName: string; quantity: number; specialInstructions: string | null }[];
  payments: { method: string; status: string }[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "destructive"> = {
  placed: "warning",
  accepted: "warning",
  preparing: "warning",
  ready: "success",
  completed: "muted",
  cancelled: "destructive",
};

const NEXT_STATUS: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<OrderRow | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (search) params.set("search", search);
    const res = await fetch(`/api/orders?${params.toString()}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
  }, [status, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(id: string, next: string) {
    try {
      await apiFetch(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
      toast.success(`Order marked as ${next}`);
      await load();
      setSelected(null);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update order");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Order Management</h1>

      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by order number..." className="border-none bg-transparent shadow-none focus-visible:ring-0" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(ORDER_STATUS_LABELS).map((s) => <SelectItem key={s} value={s}>{ORDER_STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {!orders ? (
        <Skeleton className="h-96 w-full" />
      ) : orders.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">No orders found.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Placed</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{o.orderNumber}</td>
                  <td className="px-4 py-3">{o.customerName ?? "Walk-in"}</td>
                  <td className="px-4 py-3 capitalize">{o.orderType.replace("_", " ")}</td>
                  <td className="px-4 py-3">{formatINR(o.totalAmount)}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_VARIANT[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(o.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => setSelected(o)} aria-label="View details"><Eye className="h-4 w-4" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        {selected && (
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Order #{selected.orderNumber}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Customer</span><span>{selected.customerName ?? "Walk-in"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Payment</span><span className="capitalize">{selected.payments[0]?.method} · {selected.payments[0]?.status}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span className="font-semibold">{formatINR(selected.totalAmount)}</span></div>
              <div className="border-t border-border pt-3">
                <p className="mb-2 font-medium">Items</p>
                {selected.items.map((i) => (
                  <div key={i.id} className="flex justify-between text-muted-foreground">
                    <span>{i.quantity} x {i.itemName}{i.specialInstructions ? ` (${i.specialInstructions})` : ""}</span>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter className="flex-wrap">
              {(NEXT_STATUS[selected.status] ?? []).map((next) => (
                <Button key={next} variant={next === "cancelled" ? "destructive" : "default"} onClick={() => updateStatus(selected.id, next)}>
                  Mark as {ORDER_STATUS_LABELS[next]}
                </Button>
              ))}
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
