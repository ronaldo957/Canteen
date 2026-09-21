"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiFetch, ApiError } from "@/lib/api-client";

interface SettingsShape {
  canteen_name?: { value: string };
  opening_hours?: { open: string; close: string };
  tax_rate?: { value: number };
  allow_cancellation_within_minutes?: { value: number };
  pickup_slot_interval_minutes?: { value: number };
}

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsShape | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings));
  }, []);

  async function saveSetting(key: string, value: unknown) {
    setSaving(key);
    try {
      await apiFetch("/api/settings", { method: "PATCH", body: JSON.stringify({ key, value }) });
      toast.success("Settings updated");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Could not update settings");
    } finally {
      setSaving(null);
    }
  }

  if (!settings) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Canteen Settings</h1>

      <Card>
        <CardHeader><CardTitle>General</CardTitle><CardDescription>Basic canteen information</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <Label htmlFor="name">Canteen name</Label>
            <div className="flex gap-2">
              <Input id="name" defaultValue={settings.canteen_name?.value} onBlur={(e) => saveSetting("canteen_name", { value: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="open">Opening time</Label>
              <Input id="open" type="time" defaultValue={settings.opening_hours?.open} onBlur={(e) => saveSetting("opening_hours", { ...settings.opening_hours, open: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="close">Closing time</Label>
              <Input id="close" type="time" defaultValue={settings.opening_hours?.close} onBlur={(e) => saveSetting("opening_hours", { ...settings.opening_hours, close: e.target.value })} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Orders &amp; Cancellations</CardTitle><CardDescription>Configure cancellation rules and pickup slots</CardDescription></CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="cancelWindow">Cancellation window (minutes after accepted)</Label>
            <Input id="cancelWindow" type="number" min="0" defaultValue={settings.allow_cancellation_within_minutes?.value} onBlur={(e) => saveSetting("allow_cancellation_within_minutes", { value: Number(e.target.value) })} />
          </div>
          <div>
            <Label htmlFor="pickupInterval">Pickup slot interval (minutes)</Label>
            <Input id="pickupInterval" type="number" min="5" defaultValue={settings.pickup_slot_interval_minutes?.value} onBlur={(e) => saveSetting("pickup_slot_interval_minutes", { value: Number(e.target.value) })} />
          </div>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        {saving ? <><Loader2 className="h-3 w-3 animate-spin" /> Saving...</> : <><Save className="h-3 w-3" /> Changes save automatically when you leave a field.</>}
      </p>
    </div>
  );
}
