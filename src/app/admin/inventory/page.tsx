"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, PackagePlus, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatINR } from "@/lib/utils";

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantityOnHand: string;
  minThreshold: string;
  costPerUnit: string;
}

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItem[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [restockTarget, setRestockTarget] = useState<InventoryItem | null>(null);
  const [restockAmount, setRestockAmount] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", unit: "", quantityOnHand: "0", minThreshold: "5", costPerUnit: "0" });

  const load = useCallback(async () => {
    const res = await fetch("/api/inventory");
    const data = await res.json();
    setItems(data.items ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/inventory", { method: "POST", body: JSON.stringify(form) });
      toast.success("Inventory item added");
      setCreateOpen(false);
      setForm({ name: "", unit: "", quantityOnHand: "0", minThreshold: "5", costPerUnit: "0" });
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not add item");
    } finally {
      setSaving(false);
    }
  }

  async function handleRestock(e: React.FormEvent) {
    e.preventDefault();
    if (!restockTarget) return;
    setSaving(true);
    try {
      await apiFetch(`/api/inventory/${restockTarget.id}`, { method: "PATCH", body: JSON.stringify({ restockBy: Number(restockAmount) }) });
      toast.success("Stock updated");
      setRestockTarget(null);
      setRestockAmount("");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update stock");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Add Ingredient</Button>
      </div>

      {!items ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ingredient</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Min Threshold</th>
                <th className="px-4 py-3">Cost / Unit</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const low = Number(item.quantityOnHand) <= Number(item.minThreshold);
                return (
                  <tr key={item.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-medium">{item.name}</td>
                    <td className="px-4 py-3">{item.quantityOnHand} {item.unit}</td>
                    <td className="px-4 py-3">{item.minThreshold} {item.unit}</td>
                    <td className="px-4 py-3">{formatINR(item.costPerUnit)}</td>
                    <td className="px-4 py-3">
                      {low ? <Badge variant="warning"><AlertTriangle className="h-3 w-3" /> Low Stock</Badge> : <Badge variant="success">Healthy</Badge>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setRestockTarget(item)}><PackagePlus className="h-4 w-4" /> Restock</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div><Label htmlFor="name">Name</Label><Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label htmlFor="unit">Unit</Label><Input id="unit" required placeholder="kg, litre, packets" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
              <div><Label htmlFor="qty">Initial Stock</Label><Input id="qty" type="number" min="0" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })} /></div>
              <div><Label htmlFor="min">Min Threshold</Label><Input id="min" type="number" min="0" value={form.minThreshold} onChange={(e) => setForm({ ...form, minThreshold: e.target.value })} /></div>
              <div><Label htmlFor="cost">Cost / Unit (₹)</Label><Input id="cost" type="number" min="0" value={form.costPerUnit} onChange={(e) => setForm({ ...form, costPerUnit: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Add</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!restockTarget} onOpenChange={(o) => !o && setRestockTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Restock {restockTarget?.name}</DialogTitle></DialogHeader>
          <form onSubmit={handleRestock} className="flex flex-col gap-4">
            <div>
              <Label htmlFor="amount">Quantity to add ({restockTarget?.unit})</Label>
              <Input id="amount" type="number" step="0.01" required value={restockAmount} onChange={(e) => setRestockAmount(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRestockTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Update Stock</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
