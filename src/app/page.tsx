import Image from "next/image";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { ArrowRight, ShoppingBag, ChefHat, QrCode, Star, Clock3 } from "lucide-react";
import { db } from "@/db";
import { categories, menuItems } from "@/db/schema";
import { Navbar } from "@/components/site/navbar";
import { Footer } from "@/components/site/footer";
import { FoodCard } from "@/components/site/food-card";
import { HeroSearch } from "@/components/site/hero-search";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const HOW_IT_WORKS = [
  { icon: ShoppingBag, title: "Browse & Order", description: "Explore the live menu, add your favorites to the cart, and choose a pickup time." },
  { icon: QrCode, title: "Pay Securely", description: "Pay via UPI, card, or cash at the counter. Get a unique order number instantly." },
  { icon: ChefHat, title: "We Prepare Fresh", description: "Track your order live as our kitchen accepts, prepares, and readies your meal." },
  { icon: Clock3, title: "Skip the Queue", description: "Show your pickup QR code and grab your food the moment it's ready." },
];

const REVIEWS = [
  { name: "Ananya R.", role: "Final Year Student", quote: "No more standing in long lunch queues. I order between classes and it's ready when I arrive!", rating: 5 },
  { name: "Rahul Mehta", role: "Faculty", quote: "The live order tracking is a game changer. I know exactly when to walk over and collect my food.", rating: 5 },
  { name: "Sneha Iyer", role: "Second Year Student", quote: "Loved the QR pickup - fast, contactless and no mix-ups with my order.", rating: 4 },
];

export default async function HomePage() {
  const [featured, specials, allCategories] = await Promise.all([
    db.query.menuItems.findMany({ where: eq(menuItems.isFeatured, true), limit: 8, orderBy: [desc(menuItems.rating)] }),
    db.query.menuItems.findMany({ where: eq(menuItems.isSpecialToday, true), limit: 4 }),
    db.query.categories.findMany({ where: eq(categories.isActive, true), orderBy: (fields, { asc }) => [asc(fields.sortOrder)] }),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-24 lg:px-8">
            <div className="flex flex-col items-start gap-6">
              <Badge variant="success" className="px-3 py-1 text-xs">🌿 Fresh · Fast · Contactless</Badge>
              <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Your Favorite Meals, <span className="text-primary">Just a Click Away.</span>
              </h1>
              <p className="max-w-lg text-lg text-muted-foreground">
                Order ahead from your campus canteen, track your meal live, and skip the queue entirely with secure UPI &amp; card payments.
              </p>
              <HeroSearch />
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link href="/menu">Order Now <ArrowRight className="h-4 w-4" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="#how-it-works">How it Works</Link>
                </Button>
              </div>
            </div>
            <div className="relative mx-auto aspect-[4/3] w-full max-w-lg overflow-hidden rounded-3xl shadow-2xl">
              <Image src="/images/hero-food.jpg" alt="Delicious canteen meal spread" fill priority className="object-cover" />
            </div>
          </div>
        </section>

        {/* Popular categories */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl">Popular Categories</h2>
            <Link href="/menu" className="text-sm font-medium text-primary hover:underline">View full menu</Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
            {allCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/menu?category=${cat.id}`}
                className="group relative flex h-32 flex-col justify-end overflow-hidden rounded-2xl border border-border shadow-sm"
              >
                {cat.imageUrl && (
                  <Image src={cat.imageUrl} alt={cat.name} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                <span className="relative z-10 p-3 text-sm font-semibold text-white">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Today's specials */}
        {specials.length > 0 && (
          <section className="bg-card py-12">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <div className="mb-6 flex items-center gap-2">
                <Badge variant="accent">Today Only</Badge>
                <h2 className="text-2xl font-bold sm:text-3xl">Today&apos;s Specials</h2>
              </div>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {specials.map((item) => (
                  <FoodCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured dishes */}
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-bold sm:text-3xl">Featured Dishes</h2>
            <Link href="/menu" className="text-sm font-medium text-primary hover:underline">See all</Link>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item) => (
              <FoodCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-card py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">How It Works</h2>
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HOW_IT_WORKS.map((step, idx) => (
                <div key={step.title} className="flex flex-col items-center gap-3 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <step.icon className="h-7 w-7" />
                  </div>
                  <div className="text-xs font-semibold text-accent">STEP {idx + 1}</div>
                  <h3 className="font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section id="reviews" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="mb-10 text-center text-2xl font-bold sm:text-3xl">Loved by Students &amp; Staff</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {REVIEWS.map((r) => (
              <div key={r.name} className="rounded-2xl border border-border bg-card p-6 shadow-sm">
                <div className="mb-3 flex gap-0.5 text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-foreground/90">&ldquo;{r.quote}&rdquo;</p>
                <div className="mt-4 text-sm font-semibold">{r.name}</div>
                <div className="text-xs text-muted-foreground">{r.role}</div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground">
            <h2 className="text-2xl font-bold sm:text-3xl">Hungry already?</h2>
            <p className="max-w-lg text-primary-foreground/90">Create a free account and place your first order in under a minute.</p>
            <div className="flex gap-3">
              <Button size="lg" variant="accent" asChild>
                <Link href="/register">Create Free Account</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white/40 bg-transparent text-primary-foreground hover:bg-white/10" asChild>
                <Link href="/menu">Browse Menu</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
