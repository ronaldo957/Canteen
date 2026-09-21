"use client";

import type { ReactNode } from "react";
import { LayoutDashboard, UtensilsCrossed, ClipboardList, Boxes, Users, BarChart3, Settings } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu Management", icon: UtensilsCrossed },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList },
  { href: "/admin/inventory", label: "Inventory", icon: Boxes },
  { href: "/admin/users", label: "Users & Staff", icon: Users },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Admin Dashboard">
      {children}
    </DashboardShell>
  );
}
