"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FoodCard, type FoodCardItem } from "@/components/site/food-card";

interface Category {
  id: string;
  name: string;
}

export function MenuBrowser() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<FoodCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const category = searchParams.get("category") ?? "all";
  const veg = searchParams.get("veg") ?? "all";
  const sort = searchParams.get("sort") ?? "default";

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === "all" || value === "" || value === "default") params.delete(key);
      else params.set(key, value);
      router.push(`/menu?${params.toString()}`);
    },
    [router, searchParams],
  );

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchParams.get("search")) params.set("search", searchParams.get("search") as string);
    if (category !== "all") params.set("category", category);
    if (veg !== "all") params.set("veg", veg);
    if (sort !== "default") params.set("sort", sort);
    fetch(`/api/menu-items?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setItems(d.items ?? []))
      .finally(() => setLoading(false));
  }, [searchParams, category, veg, sort]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateParam("search", search.trim());
  }

  const emptyState = useMemo(() => !loading && items.length === 0, [loading, items]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm md:flex-row md:items-center">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 items-center gap-2">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search dishes..." aria-label="Search dishes" className="border-none bg-transparent shadow-none focus-visible:ring-0" />
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={category} onValueChange={(v) => updateParam("category", v)}>
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={veg} onValueChange={(v) => updateParam("veg", v)}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Veg &amp; Non-Veg</SelectItem>
              <SelectItem value="veg">Vegetarian</SelectItem>
              <SelectItem value="nonveg">Non-Vegetarian</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v) => updateParam("sort", v)}>
            <SelectTrigger className="w-[170px]">
              <SlidersHorizontal className="h-4 w-4" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Recommended</SelectItem>
              <SelectItem value="price_asc">Price: Low to High</SelectItem>
              <SelectItem value="price_desc">Price: High to Low</SelectItem>
              <SelectItem value="rating">Top Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-80 w-full" />
          ))}
        </div>
      ) : emptyState ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-20 text-center">
          <UtensilsCrossed className="h-10 w-10 text-muted-foreground" />
          <p className="font-semibold">No dishes found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
          <Button variant="outline" onClick={() => router.push("/menu")}>Clear filters</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <FoodCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}
