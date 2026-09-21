"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/hooks/use-cart";
import { useCurrentUser } from "@/hooks/use-current-user";
import { formatINR } from "@/lib/utils";

export default function CartPage() {
  const { cart, loading, updateQuantity, removeItem } = useCart();
  const { user } = useCurrentUser();
  const router = useRouter();

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold">Your Cart</h1>

        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : !cart || cart.items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
            <p className="font-semibold">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">Add some delicious food to get started.</p>
            <Button asChild><Link href="/menu">Browse Menu</Link></Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="flex flex-col gap-4 lg:col-span-2">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
                    {item.menuItem.imageUrl && <Image src={item.menuItem.imageUrl} alt={item.menuItem.name} fill className="object-cover" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className={item.menuItem.isVeg ? "veg-dot" : "nonveg-dot"} />
                      <h3 className="font-semibold">{item.menuItem.name}</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">{formatINR(item.menuItem.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-border p-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Decrease quantity" onClick={() => (item.quantity > 1 ? updateQuantity(item.id, item.quantity - 1) : removeItem(item.id))}>
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Increase quantity" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div className="w-20 text-right font-semibold">{formatINR(Number(item.menuItem.price) * item.quantity)}</div>
                  <Button variant="ghost" size="icon" aria-label="Remove item" onClick={() => removeItem(item.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Order Summary</h2>
              <div className="flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatINR(cart.subtotal)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Tax (5% GST)</span><span>{formatINR(cart.taxAmount)}</span></div>
                <div className="my-2 h-px bg-border" />
                <div className="flex justify-between text-base font-bold"><span>Total</span><span>{formatINR(cart.totalAmount)}</span></div>
              </div>
              <Button
                size="lg"
                className="mt-6 w-full"
                onClick={() => {
                  if (!user) {
                    router.push("/login?next=/checkout");
                    return;
                  }
                  router.push("/checkout");
                }}
              >
                Proceed to Checkout
              </Button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
