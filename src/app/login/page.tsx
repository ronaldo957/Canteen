"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiFetch, ApiError, type CurrentUser } from "@/lib/api-client";

const ROLE_HOME: Record<string, string> = {
  admin: "/admin",
  kitchen: "/kitchen",
  cashier: "/cashier",
  customer: "/menu",
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiFetch<{ user: CurrentUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      toast.success(`Welcome back, ${data.user.fullName.split(" ")[0]}!`);
      const next = searchParams.get("next");
      router.push(next || ROLE_HOME[data.user.role] || "/");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Log in to order, track your meals, or manage the canteen.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          <div>
            <Label htmlFor="email">Email address</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" />
          </div>
          <Button type="submit" size="lg" disabled={loading} className="mt-2">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Log in
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account? <Link href="/register" className="font-medium text-primary hover:underline">Sign up</Link>
        </p>
        <div className="mt-6 rounded-xl bg-muted p-4 text-xs text-muted-foreground">
          <p className="mb-1 font-semibold text-foreground">Demo accounts</p>
          <p>Admin: admin@canteen.app / Admin@123</p>
          <p>Kitchen: kitchen@canteen.app / Kitchen@123</p>
          <p>Cashier: cashier@canteen.app / Cashier@123</p>
          <p>Student: student@canteen.app / Student@123</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
