"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Printer, XCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { OrderStatusStepper } from "@/components/site/order-status-stepper";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime, formatINR, ORDER_STATUS_LABELS, timeSince } from "@/lib/utils";

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  orderType: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  pickupTime: string | null;
  specialInstructions: string | null;
  estimatedReadyAt: string | null;
  createdAt: string;
  customerName: string | null;
  items: { id: string; itemName: string; quantity: number; itemPrice: string; lineTotal: string }[];
  payments: { id: string; method: string; status: string }[];
}

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      const data = await apiFetch<{ order: OrderDetail }>(`/api/orders/${params.id}`);
      setOrder(data.order);
    } catch {
      router.replace("/account/orders");
    }
  }, [params.id, router]);

  useEffect(() => {
    loadOrder();
    const interval = setInterval(loadOrder, 6000);
    return () => clearInterval(interval);
  }, [loadOrder]);

  useEffect(() => {
    if (order && ["accepted", "preparing", "ready"].includes(order.status)) {
      apiFetch<{ qrCode: string }>(`/api/orders/${order.id}/qr`)
        .then((d) => setQr(d.qrCode))
        .catch(() => setQr(null));
    }
  }, [order?.id, order?.status]);

  async function handleCancel() {
    setCancelling(true);
    try {
      await apiFetch(`/api/orders/${params.id}`, { method: "PATCH", body: JSON.stringify({ status: "cancelled", cancelReason }) });
      toast.success("Order cancelled");
      setCancelOpen(false);
      await loadOrder();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not cancel order");
    } finally {
      setCancelling(false);
    }
  }

  if (!order) return <Skeleton className="h-96 w-full" />;

  const payment = order.payments[0];
  const cancellable = order.status === "placed" || order.status === "accepted";

  return (
    <div className="flex flex-col gap-6">
      <style>{`@media print { body * { visibility: hidden; } #receipt, #receipt * { visibility: visible; } #receipt { position: absolute; top: 0; left: 0; width: 100%; } }`}</style>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Order #{order.orderNumber}</h1>
          <p className="text-sm text-muted-foreground">Placed on {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          {cancellable && (
            <Button variant="outline" onClick={() => setCancelOpen(true)}>
              <XCircle className="h-4 w-4" /> Cancel Order
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Receipt
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <OrderStatusStepper status={order.status} />
        {order.estimatedReadyAt && order.status !== "completed" && order.status !== "cancelled" && (
          <p className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" /> Estimated ready by {formatDateTime(order.estimatedReadyAt)} ({timeSince(order.createdAt)})
          </p>
        )}
      </div>

      {qr && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
          <h2 className="font-semibold">Show this QR code at pickup</h2>
          <Image src={qr} alt="Pickup QR code" width={220} height={220} className="rounded-xl" />
          <p className="text-xs text-muted-foreground">This secure code verifies your pickup - it does not contain personal data.</p>
        </div>
      )}

      <div id="receipt" className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold">Receipt</h2>
        <div className="mb-4 flex justify-between text-sm text-muted-foreground">
          <span>Order #{order.orderNumber}</span>
          <span>{formatDateTime(order.createdAt)}</span>
        </div>
        <div className="flex flex-col gap-2 border-y border-dashed border-border py-4 text-sm">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between">
              <span>{item.quantity} x {item.itemName}</span>
              <span>{formatINR(item.lineTotal)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col gap-1 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(order.taxAmount)}</span></div>
          <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatINR(order.totalAmount)}</span></div>
        </div>
        {payment && (
          <div className="mt-4 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Payment ({payment.method === "razorpay" ? "UPI/Card" : "Cash"})</span>
            <Badge variant={payment.status === "paid" ? "success" : payment.status === "failed" ? "destructive" : "warning"}>
              {payment.status}
            </Badge>
          </div>
        )}
        {order.specialInstructions && (
          <p className="mt-4 text-sm text-muted-foreground">Instructions: {order.specialInstructions}</p>
        )}
        <p className="mt-6 text-center text-xs text-muted-foreground">Status: {ORDER_STATUS_LABELS[order.status] ?? order.status} · Thank you for ordering with CanteenCo.!</p>
      </div>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel this order?</DialogTitle>
            <DialogDescription>This action cannot be undone. Let us know why (optional).</DialogDescription>
          </DialogHeader>
          <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Reason for cancellation" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>Keep Order</Button>
            <Button variant="destructive" disabled={cancelling} onClick={handleCancel}>Confirm Cancellation</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
