"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClipboardList, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatINR, ORDER_STATUS_LABELS } from "@/lib/utils";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: { id: string; itemName: string; quantity: number }[];
}

const STATUS_VARIANT: Record<string, "success" | "warning" | "muted" | "destructive"> = {
  placed: "warning",
  accepted: "warning",
  preparing: "warning",
  ready: "success",
  completed: "muted",
  cancelled: "destructive",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[] | null>(null);

  useEffect(() => {
    fetch("/api/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []));
  }, []);

  if (!orders) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
        <ClipboardList className="h-10 w-10 text-muted-foreground" />
        <p className="font-semibold">No orders yet</p>
        <p className="text-sm text-muted-foreground">Your order history will show up here.</p>
        <Button asChild><Link href="/menu">Order Now</Link></Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/account/orders/${order.id}`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/50"
        >
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">#{order.orderNumber}</span>
              <Badge variant={STATUS_VARIANT[order.status] ?? "muted"}>{ORDER_STATUS_LABELS[order.status] ?? order.status}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {order.items.slice(0, 3).map((i) => `${i.quantity}x ${i.itemName}`).join(", ")}
              {order.items.length > 3 ? ` +${order.items.length - 3} more` : ""}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.createdAt)}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-semibold">{formatINR(order.totalAmount)}</span>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </div>
        </Link>
      ))}
    </div>
  );
}
