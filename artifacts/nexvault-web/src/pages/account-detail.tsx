import { useRoute, Link } from "wouter";
import { useGetAccount, useGetAccountTransactions } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "AED "
};

export default function AccountDetail() {
  const { token } = useAuth();
  const [, params] = useRoute("/accounts/:id");
  const id = params?.id ?? "";

  const { data: account } = useGetAccount(id, { query: { enabled: !!token && !!id } });
  const { data: txData } = useGetAccountTransactions(id, {}, { query: { enabled: !!token && !!id } });

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="mb-6">
          <Link href="/accounts" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ArrowLeft className="w-4 h-4" />
            All accounts
          </Link>
          {account && (
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{account.currency} Account</h1>
                {account.iban && <p className="text-sm font-mono text-muted-foreground mt-1">{account.iban}</p>}
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">
                  {CURRENCY_SYMBOLS[account.currency]}{Number(account.balance).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </p>
                <Badge variant={account.status === "active" ? "default" : "secondary"} className="mt-1">
                  {account.status}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-4">Transactions</h2>
          {!txData?.items?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No transactions yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {txData.items.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/60 hover:border-border transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.type === "credit" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-500"}`}>
                      {tx.type === "credit" ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{tx.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {tx.counterparty?.name && `${tx.counterparty.name} · `}
                        {new Date(tx.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold ${tx.type === "credit" ? "text-emerald-600" : "text-foreground"}`}>
                      {tx.type === "credit" ? "+" : "-"}{CURRENCY_SYMBOLS[tx.currency]}{Number(tx.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                    <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
