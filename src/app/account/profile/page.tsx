"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function ProfilePage() {
  const { user, loading, refresh } = useCurrentUser();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setPhone(user.phone ?? "");
    }
  }, [user]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      await apiFetch(`/api/users/${user.id}`, { method: "PATCH", body: JSON.stringify({ fullName, phone }) });
      toast.success("Profile updated");
      await refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !user) return <Skeleton className="h-80 w-full" />;

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>Update your personal details.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSave} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled />
          </div>
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div>
            <Label>Role</Label>
            <Input value={user.role} disabled className="capitalize" />
          </div>
          <Button type="submit" disabled={saving} className="mt-2 w-fit">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
