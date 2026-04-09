import { useGetBeneficiaries, useGetAccounts, useGetFxQuote, useInitiateTransfer, useConfirmTransfer, useCreateBeneficiary } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Send, ArrowRight, User } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "AED "
};

export default function Payments() {
  const { token } = useAuth();
  const { data: beneficiaries, refetch: refetchBeneficiaries } = useGetBeneficiaries({ query: { enabled: !!token } });
  const { data: accounts } = useGetAccounts({ query: { enabled: !!token } });
  const { mutate: initiateTransfer, isPending: isInitiating } = useInitiateTransfer();
  const { mutate: confirmTransfer, isPending: isConfirming } = useConfirmTransfer();
  const { mutate: createBeneficiary, isPending: isCreatingBeneficiary } = useCreateBeneficiary();

  const [step, setStep] = useState<"select" | "amount" | "confirm" | "done">("select");
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [reference, setReference] = useState<string>("");
  const [transferId, setTransferId] = useState<string>("");
  const [otpCode, setOtpCode] = useState<string>("");
  const [showNewBeneficiary, setShowNewBeneficiary] = useState(false);
  const [newBeneficiary, setNewBeneficiary] = useState({
    name: "", iban: "", bankName: "", currency: "EUR", country: ""
  });

  const fromAccount = accounts?.find(a => a.id === selectedAccount) ?? accounts?.[0];
  const beneficiary = beneficiaries?.find(b => b.id === selectedBeneficiary);

  const { data: fxQuote } = useGetFxQuote(
    { from: fromAccount?.currency ?? "USD", to: beneficiary?.currency ?? "EUR", amount: Number(amount) },
    { query: { enabled: !!fromAccount && !!beneficiary && !!amount && Number(amount) > 0 && fromAccount.currency !== beneficiary.currency } }
  );

  const handleInitiate = () => {
    if (!selectedBeneficiary || !fromAccount || !amount) return;
    initiateTransfer({
      data: {
        fromAccountId: fromAccount.id,
        beneficiaryId: selectedBeneficiary,
        amount: Number(amount),
        currency: fromAccount.currency,
        reference,
      }
    }, {
      onSuccess: (data) => {
        setTransferId(data.transferId);
        setStep("confirm");
      }
    });
  };

  const handleConfirm = () => {
    confirmTransfer({
      data: { transferId, otpCode: otpCode || "123456" }
    }, {
      onSuccess: () => setStep("done")
    });
  };

  const handleCreateBeneficiary = () => {
    createBeneficiary({
      data: {
        name: newBeneficiary.name,
        iban: newBeneficiary.iban,
        bankName: newBeneficiary.bankName,
        currency: newBeneficiary.currency,
        country: newBeneficiary.country,
      }
    }, {
      onSuccess: () => {
        refetchBeneficiaries();
        setShowNewBeneficiary(false);
        setNewBeneficiary({ name: "", iban: "", bankName: "", currency: "EUR", country: "" });
      }
    });
  };

  return (
    <AppShell>
      <div className="p-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Send Money</h1>
          <p className="text-muted-foreground text-sm mt-1">Transfer to any of your saved beneficiaries</p>
        </div>

        {step === "done" ? (
          <Card className="text-center py-8">
            <CardContent>
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Send className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold mb-2">Transfer sent</h2>
              <p className="text-muted-foreground text-sm mb-6">Your transfer is being processed</p>
              <Button onClick={() => { setStep("select"); setAmount(""); setReference(""); setSelectedBeneficiary(null); }}>
                New transfer
              </Button>
            </CardContent>
          </Card>
        ) : step === "confirm" ? (
          <Card>
            <CardHeader><CardTitle>Confirm transfer</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">To</span><span className="font-medium">{beneficiary?.name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Amount</span><span className="font-medium">{CURRENCY_SYMBOLS[fromAccount?.currency ?? "USD"]}{Number(amount).toFixed(2)} {fromAccount?.currency}</span></div>
                {fxQuote && <div className="flex justify-between"><span className="text-muted-foreground">Receives</span><span className="font-medium text-emerald-600">{CURRENCY_SYMBOLS[beneficiary?.currency ?? "EUR"]}{fxQuote.convertedAmount.toFixed(2)} {beneficiary?.currency}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span className="font-medium">{reference || "—"}</span></div>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">OTP Code <span className="text-muted-foreground">(dev: use 123456)</span></label>
                <Input value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" maxLength={6} />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("amount")}>Back</Button>
                <Button onClick={handleConfirm} disabled={isConfirming} className="flex-1">
                  {isConfirming ? "Processing..." : "Confirm transfer"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : step === "amount" ? (
          <Card>
            <CardHeader><CardTitle>Enter amount</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">From account</label>
                <Select value={selectedAccount || fromAccount?.id} onValueChange={setSelectedAccount}>
                  <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts?.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.currency} — {CURRENCY_SYMBOLS[acc.currency]}{Number(acc.balance).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Amount ({fromAccount?.currency})</label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
              </div>
              {fxQuote && fromAccount?.currency !== beneficiary?.currency && (
                <div className="text-sm p-3 bg-muted/40 rounded-lg">
                  <span className="text-muted-foreground">Rate: </span>
                  <span>1 {fromAccount?.currency} = {fxQuote.rate.toFixed(4)} {beneficiary?.currency}</span>
                  <br />
                  <span className="text-muted-foreground">Recipient gets: </span>
                  <span className="text-emerald-600 font-medium">{CURRENCY_SYMBOLS[beneficiary?.currency ?? "EUR"]}{fxQuote.convertedAmount.toFixed(2)}</span>
                  <span className="text-muted-foreground"> (fee: {CURRENCY_SYMBOLS[fromAccount?.currency ?? "USD"]}{fxQuote.fee.toFixed(2)})</span>
                </div>
              )}
              <div>
                <label className="text-sm font-medium block mb-1">Reference (optional)</label>
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Invoice #, description..." />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("select")}>Back</Button>
                <Button onClick={handleInitiate} disabled={!amount || Number(amount) <= 0 || isInitiating} className="flex-1">
                  {isInitiating ? "Processing..." : "Continue"} <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Beneficiaries</h2>
              <Button variant="outline" size="sm" onClick={() => setShowNewBeneficiary(!showNewBeneficiary)} className="gap-1">
                <Plus className="w-4 h-4" /> Add beneficiary
              </Button>
            </div>

            {showNewBeneficiary && (
              <Card className="mb-4">
                <CardHeader><CardTitle className="text-base">New beneficiary</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="Full name" value={newBeneficiary.name} onChange={e => setNewBeneficiary(p => ({...p, name: e.target.value}))} />
                  <Input placeholder="IBAN" value={newBeneficiary.iban} onChange={e => setNewBeneficiary(p => ({...p, iban: e.target.value}))} />
                  <Input placeholder="Bank name" value={newBeneficiary.bankName} onChange={e => setNewBeneficiary(p => ({...p, bankName: e.target.value}))} />
                  <div className="flex gap-2">
                    <Select value={newBeneficiary.currency} onValueChange={v => setNewBeneficiary(p => ({...p, currency: v}))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["USD", "EUR", "GBP", "SGD", "AED"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Country code (e.g. DE)" value={newBeneficiary.country} onChange={e => setNewBeneficiary(p => ({...p, country: e.target.value}))} className="w-40" />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setShowNewBeneficiary(false)}>Cancel</Button>
                    <Button onClick={handleCreateBeneficiary} disabled={!newBeneficiary.name || isCreatingBeneficiary}>Save</Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!beneficiaries || beneficiaries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground border border-dashed rounded-lg">
                <User className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No beneficiaries yet. Add one to send money.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {beneficiaries.map(b => (
                  <div
                    key={b.id}
                    onClick={() => { setSelectedBeneficiary(b.id); setStep("amount"); }}
                    className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5 ${selectedBeneficiary === b.id ? "border-primary bg-primary/5" : "border-border/60"}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {b.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{b.name}</p>
                        <p className="text-xs text-muted-foreground">{b.bankName || b.iban || "—"}</p>
                      </div>
                    </div>
                    <Badge variant="outline">{b.currency}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
