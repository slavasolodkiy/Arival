import { useGetTransfers } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "AED "
};

const STATUS_COLORS: Record<string, string> = {
  completed: "default",
  pending: "secondary",
  processing: "secondary",
  failed: "destructive",
  cancelled: "outline",
};

export default function PaymentHistory() {
  const { token } = useAuth();
  const { data: transfers } = useGetTransfers({}, { query: { enabled: !!token } });

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Transfer History</h1>
          <p className="text-muted-foreground text-sm mt-1">All your outgoing payments</p>
        </div>

        {!transfers?.items?.length ? (
          <div className="text-center py-16 text-muted-foreground border border-dashed rounded-lg">
            <ArrowUpRight className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No transfers yet</p>
            <p className="text-sm mt-1">Your sent payments will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transfers.items.map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-3 px-4 rounded-lg border border-border/60">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
                    <ArrowUpRight className="w-4 h-4 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {CURRENCY_SYMBOLS[payment.sourceCurrency ?? payment.currency]}{Number(payment.amount).toFixed(2)} {payment.sourceCurrency ?? payment.currency}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {payment.reference ?? "Transfer"} · {new Date(payment.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {payment.destinationCurrency && payment.destinationCurrency !== payment.sourceCurrency && (
                    <p className="text-sm text-muted-foreground">
                      {CURRENCY_SYMBOLS[payment.destinationCurrency]}{Number(payment.destinationAmount).toFixed(2)} {payment.destinationCurrency}
                    </p>
                  )}
                  <Badge variant={STATUS_COLORS[payment.status] as "default" | "secondary" | "destructive" | "outline"} className="text-xs">
                    {payment.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
