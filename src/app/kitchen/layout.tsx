"use client";

import type { ReactNode } from "react";
import { ChefHat } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/shell";

const navItems = [{ href: "/kitchen", label: "Kitchen Display", icon: ChefHat }];

export default function KitchenLayout({ children }: { children: ReactNode }) {
  return (
    <DashboardShell navItems={navItems} roleLabel="Kitchen Display System">
      {children}
    </DashboardShell>
  );
}
