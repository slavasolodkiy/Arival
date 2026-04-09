import { useGetCards, useGetAccounts, useCreateCard, useFreezeCard, useUnfreezeCard } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Snowflake, Sun, Plus, CreditCard } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

export default function Cards() {
  const { token } = useAuth();
  const { data: cards, refetch } = useGetCards({ query: { enabled: !!token } });
  const { data: accounts } = useGetAccounts({ query: { enabled: !!token } });
  const { mutate: createCard, isPending: isCreating } = useCreateCard();
  const { mutate: freezeCard } = useFreezeCard();
  const { mutate: unfreezeCard } = useUnfreezeCard();
  const [showNewCard, setShowNewCard] = useState(false);

  const primaryAccount = accounts?.[0];

  const handleCreate = (cardType: "virtual" | "physical") => {
    if (!primaryAccount) return;
    createCard(
      { data: { accountId: primaryAccount.id, cardType } },
      { onSuccess: () => { refetch(); setShowNewCard(false); } }
    );
  };

  const handleFreeze = (id: string, frozen: boolean) => {
    if (frozen) {
      unfreezeCard({ id }, { onSuccess: () => refetch() });
    } else {
      freezeCard({ id }, { onSuccess: () => refetch() });
    }
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold">Cards</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage your virtual and physical cards</p>
          </div>
          <Button onClick={() => setShowNewCard(!showNewCard)} className="gap-2">
            <Plus className="w-4 h-4" />
            New card
          </Button>
        </div>

        {showNewCard && (
          <div className="mb-6 p-4 border rounded-lg bg-muted/20">
            <p className="text-sm font-medium mb-3">Select card type</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => handleCreate("virtual")} disabled={isCreating}>
                Virtual card
              </Button>
              <Button variant="outline" onClick={() => handleCreate("physical")} disabled={isCreating}>
                Physical card
              </Button>
              <Button variant="ghost" onClick={() => setShowNewCard(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {!cards || cards.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No cards yet</p>
            <p className="text-sm mt-1">Issue a virtual card instantly or order a physical one</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {cards.map(card => (
              <div key={card.id} className="relative">
                {/* Card visual */}
                <div className={`rounded-2xl p-6 text-white relative overflow-hidden ${card.status === "frozen" ? "bg-slate-600" : "bg-gradient-to-br from-slate-800 to-slate-900"}`}
                  style={{ minHeight: "180px" }}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full border-2 border-white" />
                    <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full border-2 border-white" />
                  </div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-xs font-medium uppercase tracking-widest opacity-70">
                      {card.cardType === "virtual" ? "Virtual" : "Physical"} Card
                    </span>
                    <div className="flex gap-1">
                      <div className="w-6 h-6 rounded-full bg-red-500 opacity-80" />
                      <div className="w-6 h-6 rounded-full bg-yellow-500 opacity-80 -ml-2" />
                    </div>
                  </div>
                  <p className="font-mono text-lg tracking-widest mb-4">
                    •••• •••• •••• {card.lastFour}
                  </p>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-xs opacity-60 uppercase">Expires</p>
                      <p className="text-sm font-medium">
                        {String(card.expiryMonth).padStart(2, "0")}/{String(card.expiryYear).slice(-2)}
                      </p>
                    </div>
                    <span className="text-xs font-bold tracking-widest uppercase">NEXVAULT</span>
                  </div>
                </div>

                {/* Card controls */}
                <div className="mt-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={card.status === "active" ? "default" : card.status === "frozen" ? "secondary" : "outline"}>
                      {card.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Daily limit: ${Number(card.spendLimitDaily ?? 5000).toLocaleString()}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFreeze(card.id, card.status === "frozen")}
                    className="gap-2 text-xs"
                  >
                    {card.status === "frozen" ? (
                      <><Sun className="w-3 h-3" /> Unfreeze</>
                    ) : (
                      <><Snowflake className="w-3 h-3" /> Freeze</>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
