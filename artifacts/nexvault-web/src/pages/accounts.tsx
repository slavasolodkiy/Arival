import { Link } from "wouter";
import { useGetAccounts, useCreateAccount } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "AED "
};

const CURRENCY_FLAGS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", SGD: "🇸🇬", AED: "🇦🇪"
};

export default function Accounts() {
  const { token } = useAuth();
  const { data: accounts, refetch } = useGetAccounts({ query: { enabled: !!token } });
  const { mutate: createAccount, isPending } = useCreateAccount();
  const [creating, setCreating] = useState<string | null>(null);

  const handleCreate = (currency: string) => {
    setCreating(currency);
    createAccount(
      { data: { currency: currency as "USD" | "EUR" | "GBP" | "SGD" | "AED" } },
      { onSuccess: () => { refetch(); setCreating(null); }, onError: () => setCreating(null) }
    );
  };

  const existingCurrencies = accounts?.map(a => a.currency) ?? [];
  const availableCurrencies = ["USD", "EUR", "GBP", "SGD", "AED"].filter(c => !existingCurrencies.includes(c as "USD" | "EUR" | "GBP" | "SGD" | "AED"));

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your multi-currency accounts</p>
          </div>
          {availableCurrencies.length > 0 && (
            <div className="flex gap-2">
              {availableCurrencies.map(currency => (
                <Button
                  key={currency}
                  variant="outline"
                  size="sm"
                  onClick={() => handleCreate(currency)}
                  disabled={creating === currency || isPending}
                  className="gap-1"
                >
                  <Plus className="w-4 h-4" />
                  {currency}
                </Button>
              ))}
            </div>
          )}
        </div>

        {!accounts || accounts.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Plus className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2">No accounts yet</h3>
              <p className="text-muted-foreground text-sm max-w-xs">Complete onboarding to get your multi-currency accounts, or create one below.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {accounts.map(account => (
              <Link key={account.id} href={`/accounts/${account.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-border/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{CURRENCY_FLAGS[account.currency]}</span>
                        <CardTitle className="text-base">{account.currency}</CardTitle>
                      </div>
                      <Badge variant={account.status === "active" ? "default" : "secondary"} className="text-xs">
                        {account.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold text-foreground">
                      {CURRENCY_SYMBOLS[account.currency]}{Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: {CURRENCY_SYMBOLS[account.currency]}{Number(account.availableBalance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    {account.iban && (
                      <p className="text-xs text-muted-foreground mt-2 font-mono truncate">{account.iban}</p>
                    )}
                    <div className="flex items-center gap-1 mt-3 text-primary text-xs font-medium">
                      View transactions <ArrowUpRight className="w-3 h-3" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
