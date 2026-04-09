import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <header className="flex h-16 items-center px-6 md:px-12 border-b border-border/40">
        <div className="font-bold text-xl tracking-tight text-primary flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">N</div>
          Nexvault
        </div>
        <nav className="ml-auto flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-primary transition-colors">
            Log in
          </Link>
          <Link href="/register">
            <Button size="sm" className="rounded-full">Get Started</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="py-24 md:py-32 px-6 md:px-12 text-center max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-secondary leading-tight mb-6">
            Private banking for the borderless.
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Multi-currency accounts, instant global transfers, and physical cards that work everywhere. Engineered for modern nomads and global teams.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/register">
              <Button size="lg" className="rounded-full h-12 px-8 text-base">Open an Account</Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" size="lg" className="rounded-full h-12 px-8 text-base">Sign In</Button>
            </Link>
          </div>
        </section>

        <section className="bg-secondary text-secondary-foreground py-24 px-6 md:px-12">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Multi-Currency</h3>
              <p className="text-muted-foreground">Hold USD, EUR, GBP, SGD, and AED in a single account. Convert at real mid-market rates.</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Global Cards</h3>
              <p className="text-muted-foreground">Virtual and physical cards with zero foreign transaction fees and robust spend limits.</p>
            </div>
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-primary">Instant Transfers</h3>
              <p className="text-muted-foreground">Send money locally or globally with complete transparency and unparalleled speed.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 px-6 md:px-12 border-t border-border/40 text-center text-sm text-muted-foreground">
        <p>© 2025 Nexvault. All rights reserved.</p>
      </footer>
    </div>
  );
}
