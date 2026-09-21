"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Wallet, CreditCard } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/utils";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function pickupSlots() {
  const slots: { label: string; value: string }[] = [];
  const now = new Date();
  for (let i = 1; i <= 8; i++) {
    const t = new Date(now.getTime() + i * 10 * 60 * 1000);
    slots.push({ label: t.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), value: t.toISOString() });
  }
  return slots;
}

export default function CheckoutPage() {
  const { cart, loading, refresh } = useCart();
  const { user } = useCurrentUser();
  const router = useRouter();
  const [slots] = useState(pickupSlots());
  const [pickupTime, setPickupTime] = useState(slots[1]?.value ?? "");
  const [instructions, setInstructions] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cash">("razorpay");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!cart || cart.items.length === 0)) {
      router.replace("/cart");
    }
  }, [loading, cart, router]);

  async function handlePlaceOrder() {
    setSubmitting(true);
    try {
      const { order } = await apiFetch<{ order: { id: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({ pickupTime, specialInstructions: instructions, paymentMethod }),
      });

      if (paymentMethod === "cash") {
        toast.success("Order placed! Pay at the counter upon pickup.");
        await refresh();
        router.push(`/account/orders/${order.id}`);
        return;
      }

      const rpData = await apiFetch<{ razorpayOrderId: string; amount: number; currency: string; keyId?: string }>(
        "/api/payments/razorpay/create-order",
        { method: "POST", body: JSON.stringify({ orderId: order.id }) },
      );

      if (!rpData.keyId) {
        toast.error("Online payment is not configured. Please choose Cash at Counter.");
        setSubmitting(false);
        return;
      }

      const rzp = new window.Razorpay({
        key: rpData.keyId,
        amount: Math.round(rpData.amount * 100),
        currency: rpData.currency,
        name: "CanteenCo.",
        description: "Food order payment",
        order_id: rpData.razorpayOrderId,
        prefill: { name: user?.fullName, email: user?.email, contact: user?.phone ?? undefined },
        theme: { color: "#16A34A" },
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          try {
            await apiFetch("/api/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({ orderId: order.id, ...response }),
            });
            toast.success("Payment successful! Your order is confirmed.");
            await refresh();
            router.push(`/account/orders/${order.id}`);
          } catch (error) {
            toast.error(error instanceof ApiError ? error.message : "Payment verification failed");
          }
        },
        modal: { ondismiss: () => setSubmitting(false) },
      });
      rzp.open();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not place order");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />
      <Navbar />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Checkout</h1>
        {loading || !cart ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-semibold">Order Items</h2>
                <div className="flex flex-col gap-2 text-sm">
                  {cart.items.map((i) => (
                    <div key={i.id} className="flex justify-between">
                      <span>{i.quantity} x {i.menuItem.name}</span>
                      <span>{formatINR(Number(i.menuItem.price) * i.quantity)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <Label htmlFor="pickupTime">Pickup time</Label>
                <Select value={pickupTime} onValueChange={setPickupTime}>
                  <SelectTrigger id="pickupTime"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {slots.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>

                <Label htmlFor="instructions" className="mt-4">Special instructions (optional)</Label>
                <Textarea id="instructions" value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="E.g. less spicy, no onions..." />
              </div>

              <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <h2 className="mb-4 font-semibold">Payment Method</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("razorpay")}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${paymentMethod === "razorpay" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">UPI / Card</div>
                      <div className="text-xs text-muted-foreground">Pay securely via Razorpay</div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex items-center gap-3 rounded-xl border p-4 text-left transition-colors ${paymentMethod === "cash" ? "border-primary bg-primary/5" : "border-border"}`}
                  >
                    <Wallet className="h-5 w-5 text-primary" />
                    <div>
                      <div className="font-medium">Cash at Counter</div>
                      <div className="text-xs text-muted-foreground">Pay when you pick up</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>

            <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Total</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(cart.taxAmount)}</span></div>
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatINR(cart.totalAmount)}</span></div>
              </div>
              <Button size="lg" className="mt-6 w-full" disabled={submitting} onClick={handlePlaceOrder}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Place Order
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
