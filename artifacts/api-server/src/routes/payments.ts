import { Router } from "express";
import { db } from "@workspace/db";
import { beneficiariesTable, paymentsTable, accountsTable, transactionsTable, otpCodesTable } from "@workspace/db";
import { eq, and, desc, gt } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import {
  CreateBeneficiaryBody,
  GetFxQuoteQueryParams,
  InitiateTransferBody,
  ConfirmTransferBody,
} from "@workspace/api-zod";

const router = Router();

const DEMO_MODE = process.env.DEMO_MODE === "true";
const OTP_REQUIRED_THRESHOLD = 500;

const FX_RATES: Record<string, Record<string, number>> = {
  USD: { USD: 1, EUR: 0.925, GBP: 0.787, SGD: 1.35, AED: 3.67 },
  EUR: { USD: 1.08, EUR: 1, GBP: 0.851, SGD: 1.46, AED: 3.97 },
  GBP: { USD: 1.27, EUR: 1.175, GBP: 1, SGD: 1.71, AED: 4.67 },
  SGD: { USD: 0.74, EUR: 0.685, GBP: 0.584, SGD: 1, AED: 2.72 },
  AED: { USD: 0.272, EUR: 0.252, GBP: 0.214, SGD: 0.368, AED: 1 },
};

function formatBeneficiary(b: typeof beneficiariesTable.$inferSelect) {
  return {
    id: b.id,
    name: b.name,
    accountNumber: b.accountNumber,
    sortCode: b.sortCode,
    iban: b.iban,
    swiftBic: b.swiftBic,
    bankName: b.bankName,
    country: b.country,
    currency: b.currency,
    createdAt: b.createdAt,
  };
}

const pendingTransfers = new Map<string, {
  fromAccountId: string;
  beneficiaryId: string;
  amount: number;
  currency: string;
  destinationCurrency: string;
  exchangeRate: number;
  destinationAmount: number;
  fee: number;
  reference?: string;
  userId: string;
  requiresOtp: boolean;
  expiresAt: Date;
}>();

// Periodically evict expired pending transfers (every 5 min)
setInterval(() => {
  const now = Date.now();
  for (const [id, transfer] of pendingTransfers.entries()) {
    if (transfer.expiresAt.getTime() < now) pendingTransfers.delete(id);
  }
}, 5 * 60 * 1000);

// GET /api/payments/beneficiaries
router.get("/payments/beneficiaries", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const beneficiaries = await db.select().from(beneficiariesTable)
    .where(eq(beneficiariesTable.userId, req.userId!))
    .orderBy(desc(beneficiariesTable.createdAt));

  res.json(beneficiaries.map(formatBeneficiary));
});

// POST /api/payments/beneficiaries
router.post("/payments/beneficiaries", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateBeneficiaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const [beneficiary] = await db.insert(beneficiariesTable).values({
    userId: req.userId!,
    ...parsed.data,
  }).returning();

  res.status(201).json(formatBeneficiary(beneficiary));
});

// GET /api/payments/fx/quote
router.get("/payments/fx/quote", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = GetFxQuoteQueryParams.safeParse({
    from: req.query.from,
    to: req.query.to,
    amount: req.query.amount ? Number(req.query.amount) : undefined,
  });

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }

  const { from, to, amount } = parsed.data;
  const rate = FX_RATES[from]?.[to] ?? 1;
  const fee = amount * 0.005;
  const convertedAmount = (amount - fee) * rate;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  res.json({
    from,
    to,
    rate,
    amount,
    convertedAmount: Math.round(convertedAmount * 100) / 100,
    fee: Math.round(fee * 100) / 100,
    quoteId: `quote_${Date.now()}`,
    expiresAt,
  });
});

// POST /api/payments/transfer/initiate
router.post("/payments/transfer/initiate", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = InitiateTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { fromAccountId, beneficiaryId, amount, currency, reference } = parsed.data;

  const [account] = await db.select().from(accountsTable)
    .where(and(
      eq(accountsTable.id, fromAccountId),
      eq(accountsTable.userId, req.userId!)
    )).limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  if (Number(account.balance) < amount) {
    res.status(400).json({ error: "Insufficient funds" });
    return;
  }

  const [beneficiary] = await db.select().from(beneficiariesTable)
    .where(and(
      eq(beneficiariesTable.id, beneficiaryId),
      eq(beneficiariesTable.userId, req.userId!)
    )).limit(1);

  if (!beneficiary) {
    res.status(404).json({ error: "Beneficiary not found" });
    return;
  }

  const rate = FX_RATES[currency]?.[beneficiary.currency] ?? 1;
  const fee = amount * 0.005;
  const destinationAmount = (amount - fee) * rate;
  const requiresOtp = amount >= OTP_REQUIRED_THRESHOLD;

  const transferId = `txfr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  pendingTransfers.set(transferId, {
    fromAccountId,
    beneficiaryId,
    amount,
    currency,
    destinationCurrency: beneficiary.currency,
    exchangeRate: rate,
    destinationAmount: Math.round(destinationAmount * 100) / 100,
    fee: Math.round(fee * 100) / 100,
    reference,
    userId: req.userId!,
    requiresOtp,
    expiresAt,
  });

  if (requiresOtp) {
    const code = DEMO_MODE ? "123456" : Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await db.insert(otpCodesTable).values({
      userId: req.userId!,
      code,
      purpose: "payment_confirm",
      expiresAt: otpExpiresAt,
      used: false,
    });
  }

  res.json({
    transferId,
    requiresOtp,
    fee: Math.round(fee * 100) / 100,
    estimatedArrival: "1-2 business days",
    ...(requiresOtp && DEMO_MODE ? { devOtp: "123456" } : {}),
  });
});

// POST /api/payments/transfer/confirm
router.post("/payments/transfer/confirm", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = ConfirmTransferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { transferId, otpCode } = parsed.data;
  const pending = pendingTransfers.get(transferId);

  if (!pending || pending.userId !== req.userId) {
    res.status(404).json({ error: "Transfer not found or expired" });
    return;
  }

  if (pending.expiresAt < new Date()) {
    pendingTransfers.delete(transferId);
    res.status(410).json({ error: "Transfer expired, please initiate again" });
    return;
  }

  if (pending.requiresOtp) {
    const [otpRecord] = await db.select().from(otpCodesTable)
      .where(and(
        eq(otpCodesTable.userId, req.userId!),
        eq(otpCodesTable.code, otpCode),
        eq(otpCodesTable.purpose, "payment_confirm"),
        eq(otpCodesTable.used, false),
        gt(otpCodesTable.expiresAt, new Date())
      ))
      .limit(1);

    if (!otpRecord) {
      res.status(400).json({ error: "Invalid or expired OTP" });
      return;
    }

    await db.update(otpCodesTable).set({ used: true }).where(eq(otpCodesTable.id, otpRecord.id));
  }

  pendingTransfers.delete(transferId);

  const [account] = await db.select().from(accountsTable)
    .where(eq(accountsTable.id, pending.fromAccountId)).limit(1);

  const newBalance = Number(account.balance) - pending.amount;
  await db.update(accountsTable)
    .set({
      balance: newBalance.toFixed(2),
      availableBalance: newBalance.toFixed(2),
      updatedAt: new Date(),
    })
    .where(eq(accountsTable.id, pending.fromAccountId));

  await db.insert(transactionsTable).values({
    accountId: pending.fromAccountId,
    type: "debit",
    category: pending.currency !== pending.destinationCurrency ? "fx" : "transfer",
    amount: pending.amount.toFixed(2),
    currency: pending.currency,
    description: `Transfer to beneficiary`,
    reference: pending.reference,
    status: "completed",
  });

  const [payment] = await db.insert(paymentsTable).values({
    userId: req.userId!,
    fromAccountId: pending.fromAccountId,
    beneficiaryId: pending.beneficiaryId,
    amount: pending.amount.toFixed(2),
    sourceCurrency: pending.currency,
    destinationCurrency: pending.destinationCurrency,
    exchangeRate: pending.exchangeRate.toFixed(6),
    destinationAmount: pending.destinationAmount.toFixed(2),
    fee: pending.fee.toFixed(2),
    reference: pending.reference,
    status: "completed",
    completedAt: new Date(),
  }).returning();

  res.json({
    id: payment.id,
    fromAccountId: payment.fromAccountId,
    beneficiaryId: payment.beneficiaryId,
    amount: Number(payment.amount),
    currency: payment.sourceCurrency,
    sourceCurrency: payment.sourceCurrency,
    destinationCurrency: payment.destinationCurrency,
    exchangeRate: Number(payment.exchangeRate),
    destinationAmount: Number(payment.destinationAmount),
    fee: Number(payment.fee),
    reference: payment.reference,
    status: payment.status,
    initiatedAt: payment.initiatedAt,
    completedAt: payment.completedAt,
    createdAt: payment.createdAt,
  });
});

// GET /api/payments/transfers
router.get("/payments/transfers", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100);
  const offset = Math.max(Number(req.query.offset) || 0, 0);

  const payments = await db.select().from(paymentsTable)
    .where(eq(paymentsTable.userId, req.userId!))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    items: payments.map(p => ({
      id: p.id,
      fromAccountId: p.fromAccountId,
      beneficiaryId: p.beneficiaryId,
      amount: Number(p.amount),
      currency: p.sourceCurrency,
      sourceCurrency: p.sourceCurrency,
      destinationCurrency: p.destinationCurrency,
      exchangeRate: Number(p.exchangeRate),
      destinationAmount: Number(p.destinationAmount),
      fee: Number(p.fee),
      reference: p.reference,
      status: p.status,
      initiatedAt: p.initiatedAt,
      completedAt: p.completedAt,
      createdAt: p.createdAt,
    })),
    total: payments.length,
  });
});

export default router;
