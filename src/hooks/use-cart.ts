"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface CartMenuItem {
  id: string;
  name: string;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
}

export interface CartItem {
  id: string;
  quantity: number;
  specialInstructions: string | null;
  menuItem: CartMenuItem;
}

export interface CartData {
  id: string;
  items: CartItem[];
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
}

export function useCart() {
  const [cart, setCart] = useState<CartData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch<{ cart: CartData }>("/api/cart");
      setCart(data.cart);
    } catch {
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (menuItemId: string, quantity = 1) => {
      try {
        await apiFetch("/api/cart/items", { method: "POST", body: JSON.stringify({ menuItemId, quantity }) });
        toast.success("Added to cart");
        await refresh();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Could not add item");
      }
    },
    [refresh],
  );

  const updateQuantity = useCallback(
    async (cartItemId: string, quantity: number) => {
      try {
        await apiFetch(`/api/cart/items/${cartItemId}`, { method: "PATCH", body: JSON.stringify({ quantity }) });
        await refresh();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Could not update item");
      }
    },
    [refresh],
  );

  const removeItem = useCallback(
    async (cartItemId: string) => {
      try {
        await apiFetch(`/api/cart/items/${cartItemId}`, { method: "DELETE" });
        toast.success("Removed from cart");
        await refresh();
      } catch (error) {
        toast.error(error instanceof ApiError ? error.message : "Could not remove item");
      }
    },
    [refresh],
  );

  return { cart, loading, refresh, addItem, updateQuantity, removeItem };
}
