import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">🍲</span>
              CanteenCo.
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Your favorite meals, just a click away. Order ahead, skip the line, and enjoy fresh food every day.
            </p>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Explore</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/menu" className="hover:text-primary">Food Menu</Link></li>
              <li><Link href="/cart" className="hover:text-primary">Your Cart</Link></li>
              <li><Link href="/account/orders" className="hover:text-primary">Track Order</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/login" className="hover:text-primary">Staff Login</Link></li>
              <li><Link href="/register" className="hover:text-primary">Create Account</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 text-sm font-semibold">Contact</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>Campus Canteen, Block A</li>
              <li>Mon - Sat, 8:00 AM - 8:00 PM</li>
              <li>support@canteen.app</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border pt-6 text-center text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} CanteenCo. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
