"use client";

import { useEffect, useState } from "react";
import { IndianRupee, ShoppingBag, Clock, CheckCircle2, Users, AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/utils";

interface Summary {
  totalRevenue: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalCustomers: number;
  lowStockCount: number;
  lowStockItems: { id: string; name: string; quantityOnHand: string; unit: string; minThreshold: string }[];
  dailySales: { day: string; revenue: number; orderCount: number }[];
  bestSellers: { name: string; totalQuantity: number; totalRevenue: number }[];
  paymentBreakdown: { method: string; total: number; count: number }[];
}

const COLORS = ["#16A34A", "#FFB347", "#1F2937", "#60A5FA"];

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);

  useEffect(() => {
    fetch("/api/reports/summary")
      .then((r) => r.json())
      .then(setSummary);
  }, []);

  if (!summary) return <Skeleton className="h-[600px] w-full" />;

  const kpis = [
    { label: "Total Revenue", value: formatINR(summary.totalRevenue), icon: IndianRupee },
    { label: "Today's Orders", value: summary.todayOrders, icon: ShoppingBag },
    { label: "Pending Orders", value: summary.pendingOrders, icon: Clock },
    { label: "Completed Orders", value: summary.completedOrders, icon: CheckCircle2 },
    { label: "Total Customers", value: summary.totalCustomers, icon: Users },
    { label: "Low Stock Items", value: summary.lowStockCount, icon: AlertTriangle, alert: summary.lowStockCount > 0 },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className={kpi.alert ? "border-amber-400" : undefined}>
            <CardContent className="flex flex-col gap-2 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.alert ? "text-amber-500" : "text-primary"}`} />
              </div>
              <span className="text-xl font-bold">{kpi.value}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Sales Trend (Last 30 Days)</CardTitle></CardHeader>
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

        <Card>
          <CardHeader><CardTitle>Payment Methods</CardTitle></CardHeader>
          <CardContent className="h-80">
            {summary.paymentBreakdown.length === 0 ? (
              <p className="flex h-full items-center justify-center text-sm text-muted-foreground">No payments yet</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.paymentBreakdown} dataKey="total" nameKey="method" outerRadius={90} label>
                    {summary.paymentBreakdown.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => formatINR(Number(v))} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Best-Selling Items</CardTitle></CardHeader>
          <CardContent>
            {summary.bestSellers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {summary.bestSellers.map((item, idx) => (
                  <li key={item.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><Badge variant="muted">{idx + 1}</Badge>{item.name}</span>
                    <span className="text-muted-foreground">{item.totalQuantity} sold · {formatINR(item.totalRevenue)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Low Stock Alerts</CardTitle></CardHeader>
          <CardContent>
            {summary.lowStockItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">All inventory levels look healthy 🎉</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {summary.lowStockItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span>{item.name}</span>
                    <Badge variant="warning">{item.quantityOnHand} {item.unit} left</Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
