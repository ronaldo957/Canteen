"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Loader2, Minus, Plus, Search, Trash2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";
import { computeOrderTotals, formatINR } from "@/lib/utils";

interface MenuItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
}

interface LineItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export default function CashierPosPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[] | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<LineItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<{ orderNumber: string; items: LineItem[]; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/menu-items").then((r) => r.json()).then((d) => setMenuItems(d.items ?? []));
  }, []);

  const filtered = useMemo(
    () => (menuItems ?? []).filter((i) => i.name.toLowerCase().includes(search.toLowerCase())),
    [menuItems, search],
  );

  function addToCart(item: MenuItem) {
    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) return prev.map((i) => (i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  }

  function updateQty(id: string, qty: number) {
    setCart((prev) => (qty <= 0 ? prev.filter((i) => i.menuItemId !== id) : prev.map((i) => (i.menuItemId === id ? { ...i, quantity: qty } : i))));
  }

  const subtotal = cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const totals = computeOrderTotals(subtotal);

  async function handlePlaceOrder() {
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const { order } = await apiFetch<{ order: { id: string; orderNumber: string } }>("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          paymentMethod: "cash",
          customerName: customerName || "Walk-in Customer",
          customerPhone,
          items: cart.map((i) => ({ menuItemId: i.menuItemId, quantity: i.quantity })),
        }),
      });
      await apiFetch("/api/payments/cash", { method: "POST", body: JSON.stringify({ orderId: order.id }) });
      toast.success(`Order #${order.orderNumber} placed & cash collected`);
      setLastReceipt({ orderNumber: order.orderNumber, items: cart, total: totals.totalAmount });
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not place order");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="flex flex-col gap-4 lg:col-span-2">
        <h1 className="text-2xl font-bold">New Walk-in Order</h1>
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search menu items..." className="border-none bg-transparent shadow-none focus-visible:ring-0" />
        </div>
        {!menuItems ? (
          <Skeleton className="h-96 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((item) => (
              <button
                key={item.id}
                disabled={!item.isAvailable}
                onClick={() => addToCart(item)}
                className="flex flex-col items-start gap-2 rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-colors hover:border-primary disabled:opacity-40"
              >
                <div className="relative h-20 w-full overflow-hidden rounded-lg bg-muted">
                  {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
                </div>
                <div className="flex w-full items-center gap-1">
                  <span className={item.isVeg ? "veg-dot" : "nonveg-dot"} />
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <span className="text-sm font-semibold">{formatINR(item.price)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Current Order</h2>
          {cart.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tap items to add them here</p>
          ) : (
            <div className="flex flex-col gap-3">
              {cart.map((item) => (
                <div key={item.menuItemId} className="flex items-center justify-between gap-2 text-sm">
                  <span className="flex-1">{item.name}</span>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                    <span className="w-5 text-center">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                  </div>
                  <span className="w-16 text-right">{formatINR(item.price * item.quantity)}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => updateQty(item.menuItemId, 0)}><Trash2 className="h-3 w-3 text-red-500" /></Button>
                </div>
              ))}
              <div className="mt-2 flex flex-col gap-1 border-t border-border pt-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>{formatINR(totals.taxAmount)}</span></div>
                <div className="flex justify-between font-bold"><span>Total</span><span>{formatINR(subtotal + totals.taxAmount)}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <Label htmlFor="custName">Customer name (optional)</Label>
          <Input id="custName" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="mb-3" />
          <Label htmlFor="custPhone">Phone (optional)</Label>
          <Input id="custPhone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
        </div>

        <Button size="lg" disabled={cart.length === 0 || submitting} onClick={handlePlaceOrder}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Collect Cash &amp; Place Order
        </Button>

        {lastReceipt && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-semibold">Receipt · #{lastReceipt.orderNumber}</h3>
              <Button variant="ghost" size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print</Button>
            </div>
            {lastReceipt.items.map((i) => (
              <div key={i.menuItemId} className="flex justify-between text-muted-foreground"><span>{i.quantity} x {i.name}</span><span>{formatINR(i.price * i.quantity)}</span></div>
            ))}
            <div className="mt-2 flex justify-between border-t border-border pt-2 font-bold"><span>Total Paid</span><span>{formatINR(lastReceipt.total)}</span></div>
          </div>
        )}
      </div>
    </div>
  );
}
