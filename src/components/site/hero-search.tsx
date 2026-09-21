"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function HeroSearch() {
  const [q, setQ] = useState("");
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push(q.trim() ? `/menu?search=${encodeURIComponent(q.trim())}` : "/menu");
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-lg">
      <Search className="ml-3 h-5 w-5 shrink-0 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search for dosa, thali, chai..."
        aria-label="Search food menu"
        className="h-11 border-none bg-transparent shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="lg" className="shrink-0">
        Search
      </Button>
    </form>
  );
}
