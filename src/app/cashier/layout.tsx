"use client";

import type { ReactNode } from "react";
import { ShoppingCart, Receipt } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";

const navItems = [
  { href: "/cashier", label: "New Order (POS)", icon: ShoppingCart },
  { href: "/cashier/transactions", label: "Transactions", icon: Receipt },
];

export default function CashierLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Cashier Terminal">
      {children}
    </DashboardShell>
  );
}
