"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/utils";

interface Category { id: string; name: string; }
interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isSpecialToday: boolean;
  prepTimeMinutes: number;
  categoryId: string;
  category?: Category;
}

const emptyForm = {
  id: "",
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  isVeg: true,
  isAvailable: true,
  isFeatured: false,
  isSpecialToday: false,
  prepTimeMinutes: "15",
  categoryId: "",
};

export default function AdminMenuPage() {
  const [items, setItems] = useState<MenuItem[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [itemsRes, catsRes] = await Promise.all([
      fetch("/api/menu-items?all=true").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ]);
    setItems(itemsRes.items ?? []);
    setCategories(catsRes.categories ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setForm({ ...emptyForm, categoryId: categories[0]?.id ?? "" });
    setDialogOpen(true);
  }

  function openEdit(item: MenuItem) {
    setForm({
      id: item.id,
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      imageUrl: item.imageUrl ?? "",
      isVeg: item.isVeg,
      isAvailable: item.isAvailable,
      isFeatured: item.isFeatured,
      isSpecialToday: item.isSpecialToday,
      prepTimeMinutes: String(item.prepTimeMinutes),
      categoryId: item.categoryId,
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        name: form.name,
        description: form.description,
        price: Number(form.price),
        imageUrl: form.imageUrl,
        isVeg: form.isVeg,
        isAvailable: form.isAvailable,
        isFeatured: form.isFeatured,
        isSpecialToday: form.isSpecialToday,
        prepTimeMinutes: Number(form.prepTimeMinutes),
      };
      if (form.id) {
        await apiFetch(`/api/menu-items/${form.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast.success("Item updated");
      } else {
        await apiFetch("/api/menu-items", { method: "POST", body: JSON.stringify(payload) });
        toast.success("Item created");
      }
      setDialogOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not save item");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Disable this menu item? It will no longer be visible to customers.")) return;
    try {
      await apiFetch(`/api/menu-items/${id}`, { method: "DELETE" });
      toast.success("Item disabled");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not disable item");
    }
  }

  async function toggleAvailability(item: MenuItem) {
    try {
      await apiFetch(`/api/menu-items/${item.id}`, { method: "PATCH", body: JSON.stringify({ isAvailable: !item.isAvailable }) });
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update item");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Menu Management</h1>
        <Button onClick={openCreate}><Plus className="h-4 w-4" /> Add Item</Button>
      </div>

      {!items ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Available</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-border last:border-0">
                  <td className="flex items-center gap-3 px-4 py-3">
                    <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-muted">
                      {item.imageUrl && <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />}
                    </div>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="flex gap-1">
                        {item.isFeatured && <Badge variant="muted">Featured</Badge>}
                        {item.isSpecialToday && <Badge variant="accent">Special</Badge>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{item.category?.name ?? categories.find((c) => c.id === item.categoryId)?.name}</td>
                  <td className="px-4 py-3">{formatINR(item.price)}</td>
                  <td className="px-4 py-3"><span className={item.isVeg ? "veg-dot" : "nonveg-dot"} /></td>
                  <td className="px-4 py-3"><Switch checked={item.isAvailable} onCheckedChange={() => toggleAvailability(item)} /></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(item)} aria-label="Edit"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} aria-label="Disable"><Trash2 className="h-4 w-4 text-red-500" /></Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
            <DialogDescription>Fill in the details below.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Price (INR)</Label>
                <Input id="price" type="number" min="0" step="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="prepTime">Prep Time (mins)</Label>
                <Input id="prepTime" type="number" min="1" required value={form.prepTimeMinutes} onChange={(e) => setForm({ ...form, prepTimeMinutes: e.target.value })} />
              </div>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={form.categoryId} onValueChange={(v) => setForm({ ...form, categoryId: v })}>
                <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="imageUrl">Image URL</Label>
              <Input id="imageUrl" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} placeholder="/images/menu-item.jpg" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">Vegetarian <Switch checked={form.isVeg} onCheckedChange={(v) => setForm({ ...form, isVeg: v })} /></label>
              <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">Available <Switch checked={form.isAvailable} onCheckedChange={(v) => setForm({ ...form, isAvailable: v })} /></label>
              <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">Featured <Switch checked={form.isFeatured} onCheckedChange={(v) => setForm({ ...form, isFeatured: v })} /></label>
              <label className="flex items-center justify-between rounded-xl border border-border p-3 text-sm">Today&apos;s Special <Switch checked={form.isSpecialToday} onCheckedChange={(v) => setForm({ ...form, isSpecialToday: v })} /></label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Item</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
