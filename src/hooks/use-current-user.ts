"use client";

import { useEffect, useState, useCallback } from "react";
import type { CurrentUser } from "@/lib/api-client";

export function useCurrentUser() {
  const [user, setUser] = useState<CurrentUser | null | undefined>(undefined);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, loading: user === undefined, refresh };
}
