"use client";

import { useCallback, useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/utils";

interface Summary {
  totalRevenue: number;
  totalOrders: number;
  dailySales: { day: string; revenue: number; orderCount: number }[];
  bestSellers: { name: string; totalQuantity: number; totalRevenue: number }[];
  paymentBreakdown: { method: string; total: number; count: number }[];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function AdminReportsPage() {
  const [from, setFrom] = useState(isoDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(isoDate(new Date()));
  const [summary, setSummary] = useState<Summary | null>(null);

  const load = useCallback(async () => {
    const params = new URLSearchParams({ from: new Date(from).toISOString(), to: new Date(to + "T23:59:59").toISOString() });
    const res = await fetch(`/api/reports/summary?${params.toString()}`);
    setSummary(await res.json());
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  function handleExport() {
    const params = new URLSearchParams({ from: new Date(from).toISOString(), to: new Date(to + "T23:59:59").toISOString() });
    window.open(`/api/reports/export?${params.toString()}`, "_blank");
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Sales Reports</h1>
        <Button onClick={handleExport}><Download className="h-4 w-4" /> Export CSV</Button>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div><Label htmlFor="from">From</Label><Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
        <div><Label htmlFor="to">To</Label><Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      </div>

      {!summary ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Revenue in range</p><p className="text-2xl font-bold">{formatINR(summary.totalRevenue)}</p></CardContent></Card>
            <Card><CardContent className="p-6"><p className="text-sm text-muted-foreground">Orders in range</p><p className="text-2xl font-bold">{summary.totalOrders}</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Daily Revenue</CardTitle></CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(v) => v.slice(5)} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => formatINR(Number(v))} />
                  <Bar dataKey="revenue" fill="#16A34A" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Best-Selling Products</CardTitle></CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm">
                  {summary.bestSellers.map((b) => (
                    <li key={b.name} className="flex justify-between"><span>{b.name}</span><span className="text-muted-foreground">{b.totalQuantity} sold · {formatINR(b.totalRevenue)}</span></li>
                  ))}
                  {summary.bestSellers.length === 0 && <p className="text-muted-foreground">No sales in this range</p>}
                </ul>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Payment Method Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-3 text-sm">
                  {summary.paymentBreakdown.map((p) => (
                    <li key={p.method} className="flex justify-between capitalize"><span>{p.method}</span><span className="text-muted-foreground">{p.count} txns · {formatINR(p.total)}</span></li>
                  ))}
                  {summary.paymentBreakdown.length === 0 && <p className="text-muted-foreground">No payments yet</p>}
                </ul>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
