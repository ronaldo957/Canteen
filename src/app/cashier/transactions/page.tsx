"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatINR } from "@/lib/utils";

interface PaymentRow {
  id: string;
  method: string;
  status: string;
  amount: string;
  createdAt: string;
  order: { orderNumber: string; customerName: string | null } | null;
}

export default function CashierTransactionsPage() {
  const [payments, setPayments] = useState<PaymentRow[] | null>(null);

  useEffect(() => {
    fetch("/api/payments").then((r) => r.json()).then((d) => setPayments(d.payments ?? []));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Payment Transactions</h1>
      {!payments ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{p.order?.orderNumber ?? "-"}</td>
                  <td className="px-4 py-3">{p.order?.customerName ?? "-"}</td>
                  <td className="px-4 py-3 capitalize">{p.method === "razorpay" ? "UPI/Card" : "Cash"}</td>
                  <td className="px-4 py-3">{formatINR(p.amount)}</td>
                  <td className="px-4 py-3"><Badge variant={p.status === "paid" ? "success" : p.status === "failed" ? "destructive" : "warning"}>{p.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(p.createdAt)}</td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">No transactions yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
