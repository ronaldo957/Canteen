"use client";

import Image from "next/image";
import { Plus, Star, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCart } from "@/hooks/use-cart";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface FoodCardItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  isSpecialToday?: boolean;
  prepTimeMinutes?: number;
  rating?: string;
}

export function FoodCard({ item }: { item: FoodCardItem }) {
  const { user } = useCurrentUser();
  const { addItem } = useCart();
  const router = useRouter();

  async function handleAdd() {
    if (user === null) {
      toast.info("Please log in to add items to your cart");
      router.push("/login?next=/menu");
      return;
    }
    if (user && user.role !== "customer") {
      toast.info("Switch to a customer account to place online orders");
      return;
    }
    await addItem(item.id, 1);
  }

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
    >
      <div className="relative h-44 w-full overflow-hidden bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width: 768px) 100vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🍽️</div>
        )}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span title={item.isVeg ? "Vegetarian" : "Non-Vegetarian"} className={item.isVeg ? "veg-dot" : "nonveg-dot"} />
          {item.isSpecialToday && <Badge variant="accent">Today&apos;s Special</Badge>}
        </div>
        {!item.isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-semibold text-white">
            Currently Unavailable
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-snug">{item.name}</h3>
          <span className="flex items-center gap-1 whitespace-nowrap text-xs font-medium text-amber-500">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {item.rating ?? "4.5"}
          </span>
        </div>
        <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">{item.description}</p>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {item.prepTimeMinutes ?? 15} mins</span>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-lg font-bold text-foreground">{formatINR(item.price)}</span>
          <Button size="sm" disabled={!item.isAvailable} onClick={handleAdd} aria-label={`Add ${item.name} to cart`}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
