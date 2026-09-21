"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Volume2, VolumeX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";
import { timeSince } from "@/lib/utils";
import { playNotificationBeep } from "@/components/dashboard/notification-sound";

interface KitchenOrder {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  createdAt: string;
  specialInstructions: string | null;
  items: { id: string; itemName: string; quantity: number; specialInstructions: string | null }[];
}

function OrderCard({ order, action }: { order: KitchenOrder; action: (id: string, status: string) => void }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-lg font-bold">#{order.orderNumber}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {timeSince(order.createdAt)}</span>
      </div>
      {order.orderType === "walk_in" && <Badge variant="muted" className="w-fit">Walk-in</Badge>}
      <ul className="flex flex-col gap-1 text-sm">
        {order.items.map((i) => (
          <li key={i.id}>
            <span className="font-semibold">{i.quantity}x</span> {i.itemName}
            {i.specialInstructions && <span className="block text-xs text-amber-600">Note: {i.specialInstructions}</span>}
          </li>
        ))}
      </ul>
      {order.specialInstructions && <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">{order.specialInstructions}</p>}
      <div className="mt-auto flex gap-2">
        {order.status === "placed" && <Button className="flex-1" onClick={() => action(order.id, "accepted")}>Accept Order</Button>}
        {order.status === "accepted" && <Button className="flex-1" onClick={() => action(order.id, "preparing")}>Start Preparing</Button>}
        {order.status === "preparing" && <Button className="flex-1" onClick={() => action(order.id, "ready")}>Mark Ready</Button>}
        {order.status === "ready" && <Button variant="outline" className="flex-1" onClick={() => action(order.id, "completed")}>Mark Picked Up</Button>}
      </div>
    </div>
  );
}

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<KitchenOrder[] | null>(null);
  const [soundOn, setSoundOn] = useState(true);
  const prevIdsRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const res = await fetch("/api/orders");
    const data = await res.json();
    const active: KitchenOrder[] = (data.orders ?? []).filter((o: KitchenOrder) => ["placed", "accepted", "preparing", "ready"].includes(o.status));

    const newIds = new Set(active.map((o) => o.id));
    const isFirstLoad = prevIdsRef.current.size === 0 && orders === null;
    const hasNewOrder = [...newIds].some((id) => !prevIdsRef.current.has(id));
    if (!isFirstLoad && hasNewOrder && soundOn) {
      playNotificationBeep();
      toast.info("New order received!");
    }
    prevIdsRef.current = newIds;
    setOrders(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundOn]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(id: string, status: string) {
    try {
      await apiFetch(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update order");
    }
  }

  if (!orders) return <Skeleton className="h-96 w-full" />;

  const columns = [
    { title: "New Orders", statuses: ["placed", "accepted"], color: "border-t-amber-400" },
    { title: "Preparing", statuses: ["preparing"], color: "border-t-blue-400" },
    { title: "Ready for Pickup", statuses: ["ready"], color: "border-t-emerald-500" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Kitchen Display</h1>
        <Button variant="outline" onClick={() => setSoundOn((s) => !s)}>
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />} {soundOn ? "Sound On" : "Sound Off"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {columns.map((col) => {
          const colOrders = orders.filter((o) => col.statuses.includes(o.status));
          return (
            <div key={col.title} className={`flex flex-col gap-4 rounded-2xl border-t-4 bg-muted/30 p-4 ${col.color}`}>
              <div className="flex items-center justify-between">
                <h2 className="font-bold">{col.title}</h2>
                <Badge variant="muted">{colOrders.length}</Badge>
              </div>
              {colOrders.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">No orders</p>
              ) : (
                colOrders.map((order) => <OrderCard key={order.id} order={order} action={updateStatus} />)
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
