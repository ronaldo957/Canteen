import { Suspense } from "react";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { MenuBrowser } from "@/components/site/menu-browser";

export const dynamic = "force-dynamic";

export default function MenuPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold sm:text-4xl">Our Menu</h1>
          <p className="mt-2 text-muted-foreground">Freshly prepared meals, snacks and beverages - ready when you are.</p>
        </div>
        <Suspense>
          <MenuBrowser />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
