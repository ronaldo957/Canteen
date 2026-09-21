"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiFetch, ApiError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: "customer" | "admin" | "kitchen" | "cashier";
  isActive: boolean;
  createdAt: string;
}

const ROLE_VARIANT: Record<string, "success" | "warning" | "muted" | "destructive"> = {
  admin: "destructive",
  kitchen: "warning",
  cashier: "muted",
  customer: "success",
};

export default function AdminUsersPage() {
  const { user: me } = useCurrentUser();
  const [users, setUsers] = useState<UserRow[] | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", role: "kitchen" as UserRow["role"], password: "" });

  const load = useCallback(async () => {
    const res = await fetch("/api/users");
    const data = await res.json();
    setUsers(data.users ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await apiFetch("/api/users", { method: "POST", body: JSON.stringify(form) });
      toast.success("Staff account created");
      setCreateOpen(false);
      setForm({ fullName: "", email: "", phone: "", role: "kitchen", password: "" });
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not create account");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(u: UserRow) {
    if (u.id === me?.id) {
      toast.error("You cannot deactivate your own account");
      return;
    }
    try {
      await apiFetch(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !u.isActive }) });
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update user");
    }
  }

  async function changeRole(u: UserRow, role: string) {
    try {
      await apiFetch(`/api/users/${u.id}`, { method: "PATCH", body: JSON.stringify({ role }) });
      toast.success("Role updated");
      await load();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update role");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Users &amp; Staff</h1>
        <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create Staff Account</Button>
      </div>

      {!users ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{u.fullName}</td>
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">
                    <Select value={u.role} onValueChange={(v) => changeRole(u, v)}>
                      <SelectTrigger className="h-8 w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="customer">Customer</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="kitchen">Kitchen</SelectItem>
                        <SelectItem value="cashier">Cashier</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(u.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={u.isActive} onCheckedChange={() => toggleActive(u)} />
                      <Badge variant={u.isActive ? ROLE_VARIANT[u.role] : "destructive"}>{u.isActive ? "Active" : "Disabled"}</Badge>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Staff Account</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div><Label htmlFor="fullName">Full name</Label><Input id="fullName" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} /></div>
            <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRow["role"] })}>
                <SelectTrigger id="role"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="kitchen">Kitchen Staff</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label htmlFor="password">Temporary password</Label><Input id="password" type="text" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
