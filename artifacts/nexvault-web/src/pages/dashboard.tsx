import { Link } from "wouter";
import { useGetAccountsSummary, useGetCards, useGetMe } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/app-shell";
import { ArrowDownLeft, ArrowUpRight, CreditCard, Send, Plus } from "lucide-react";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "AED "
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", SGD: "🇸🇬", AED: "🇦🇪"
};

export default function Dashboard() {
  const { token } = useAuth();
  const { data: summary } = useGetAccountsSummary({ query: { enabled: !!token } });
  const { data: cards } = useGetCards({ query: { enabled: !!token } });
  const { data: user } = useGetMe({ query: { enabled: !!token } });

  const firstName = user?.firstName ?? "there";

  return (
    <AppShell>
      <div className="p-8 max-w-5xl">
        {/* Header greeting */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">Good morning, {firstName}</h1>
          <p className="text-muted-foreground text-sm mt-1">Here's your financial overview</p>
        </div>

        {/* Balance hero */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="col-span-2 rounded-2xl bg-sidebar text-sidebar-foreground p-8 relative overflow-hidden">
            <div className="absolute inset-0 opacity-5">
              <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full border-2 border-white" />
              <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full border-2 border-white" />
            </div>
            <p className="text-sm text-sidebar-foreground/60 mb-1">Total balance</p>
            <p className="text-4xl font-bold mb-6">
              ${(summary?.totalBalanceUsd ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <div className="flex gap-3">
              <Link href="/payments">
                <Button size="sm" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
                  <Send className="w-3.5 h-3.5" /> Send money
                </Button>
              </Link>
              <Link href="/accounts">
                <Button size="sm" variant="outline" className="gap-2 border-sidebar-foreground/20 text-sidebar-foreground hover:bg-sidebar-accent rounded-full">
                  <Plus className="w-3.5 h-3.5" /> Add funds
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">Monthly income</p>
                <p className="text-xl font-bold text-emerald-600">+${(summary?.monthlyIncome ?? 0).toLocaleString()}</p>
              </CardContent>
            </Card>
            <Card className="border-border/60">
              <CardContent className="pt-4">
                <p className="text-xs text-muted-foreground mb-1">Monthly spend</p>
                <p className="text-xl font-bold">-${(summary?.monthlySpend ?? 0).toLocaleString()}</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Accounts */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Accounts</h2>
              <Link href="/accounts" className="text-sm text-primary hover:underline">View all</Link>
            </div>

            {!summary?.accounts?.length ? (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  <p>No accounts yet. Complete onboarding to get started.</p>
                  <Link href="/onboarding">
                    <Button size="sm" className="mt-3">Start onboarding</Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {summary.accounts.slice(0, 4).map(acc => (
                  <Link key={acc.id} href={`/accounts/${acc.id}`}>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{CURRENCY_FLAGS[acc.currency]}</span>
                          <span className="text-sm font-medium">{acc.currency}</span>
                          <Badge variant="outline" className="text-xs ml-auto">{acc.status}</Badge>
                        </div>
                        <p className="text-xl font-bold">
                          {CURRENCY_SYMBOLS[acc.currency]}{Number(acc.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}

            {/* Recent Transactions */}
            <div className="flex items-center justify-between mt-6">
              <h2 className="font-semibold">Recent transactions</h2>
            </div>

            {!summary?.recentTransactions?.length ? (
              <div className="text-center py-8 text-muted-foreground text-sm border rounded-lg border-dashed">
                No transactions yet
              </div>
            ) : (
              <div className="space-y-1">
                {summary.recentTransactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-600"}`}>
                        {tx.type === "credit" ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{tx.description}</p>
                        <p className="text-xs text-muted-foreground">{new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${tx.type === "credit" ? "text-emerald-600" : ""}`}>
                      {tx.type === "credit" ? "+" : "-"}{CURRENCY_SYMBOLS[tx.currency] ?? ""}{Number(tx.amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cards sidebar */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Cards</h2>
              <Link href="/cards" className="text-sm text-primary hover:underline">Manage</Link>
            </div>

            {!cards || cards.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <CreditCard className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No cards yet</p>
                  <Link href="/cards">
                    <Button size="sm" variant="outline" className="mt-3 text-xs gap-1">
                      <Plus className="w-3 h-3" /> Issue a card
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {cards.slice(0, 2).map(card => (
                  <div key={card.id} className="rounded-xl p-4 bg-sidebar text-sidebar-foreground relative overflow-hidden">
                    <div className="flex justify-between items-start mb-6">
                      <span className="text-xs opacity-60">{card.cardType === "virtual" ? "Virtual" : "Physical"}</span>
                      <div className="flex gap-0.5">
                        <div className="w-5 h-5 rounded-full bg-red-400 opacity-80" />
                        <div className="w-5 h-5 rounded-full bg-yellow-400 opacity-80 -ml-1.5" />
                      </div>
                    </div>
                    <p className="font-mono text-sm tracking-widest mb-2">•••• •••• •••• {card.lastFour}</p>
                    <div className="flex justify-between items-end">
                      <p className="text-xs opacity-60">{String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}</p>
                      <Badge variant="secondary" className="text-xs bg-sidebar-accent text-sidebar-foreground">{card.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
