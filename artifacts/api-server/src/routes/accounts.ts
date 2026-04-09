import { Router } from "express";
import { db } from "@workspace/db";
import { accountsTable, transactionsTable } from "@workspace/db";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { CreateAccountBody, GetAccountTransactionsQueryParams } from "@workspace/api-zod";

const router = Router();

function formatAccount(acc: typeof accountsTable.$inferSelect) {
  return {
    id: acc.id,
    currency: acc.currency,
    iban: acc.iban,
    accountNumber: acc.accountNumber,
    sortCode: acc.sortCode,
    balance: Number(acc.balance),
    availableBalance: Number(acc.availableBalance),
    status: acc.status,
    createdAt: acc.createdAt,
  };
}

function formatTransaction(tx: typeof transactionsTable.$inferSelect) {
  return {
    id: tx.id,
    accountId: tx.accountId,
    type: tx.type,
    category: tx.category,
    amount: Number(tx.amount),
    currency: tx.currency,
    description: tx.description,
    reference: tx.reference,
    counterparty: tx.counterpartyName ? {
      name: tx.counterpartyName,
      accountNumber: tx.counterpartyAccount,
      bankName: tx.counterpartyBank,
    } : undefined,
    status: tx.status,
    createdAt: tx.createdAt,
  };
}

// GET /api/accounts
router.get("/accounts", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accounts = await db.select().from(accountsTable)
    .where(eq(accountsTable.userId, req.userId!))
    .orderBy(desc(accountsTable.createdAt));

  res.json(accounts.map(formatAccount));
});

// POST /api/accounts
router.post("/accounts", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateAccountBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { currency } = parsed.data;

  const ibanSuffix = Math.random().toString(36).substring(2, 18).toUpperCase();
  const iban = `GB${Math.floor(10 + Math.random() * 90)}NEXV0001${ibanSuffix}`;

  const [account] = await db.insert(accountsTable).values({
    userId: req.userId!,
    currency: currency as "USD" | "EUR" | "GBP" | "SGD" | "AED",
    iban,
    accountNumber: Math.floor(10000000 + Math.random() * 90000000).toString(),
    sortCode: "04-00-04",
    balance: "0",
    availableBalance: "0",
    status: "active",
  }).returning();

  res.status(201).json(formatAccount(account));
});

// GET /api/accounts/summary
router.get("/accounts/summary", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const accounts = await db.select().from(accountsTable)
    .where(eq(accountsTable.userId, req.userId!));

  const accountIds = accounts.map(a => a.id);
  let recentTransactions: ReturnType<typeof formatTransaction>[] = [];

  if (accountIds.length > 0) {
    const txs = await db.select().from(transactionsTable)
      .where(inArray(transactionsTable.accountId, accountIds))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);
    recentTransactions = txs.map(formatTransaction);
  }

  const fxRates: Record<string, number> = { USD: 1, EUR: 1.08, GBP: 1.27, SGD: 0.74, AED: 0.27 };
  const totalBalanceUsd = accounts.reduce((sum, acc) => {
    return sum + Number(acc.balance) * (fxRates[acc.currency] ?? 1);
  }, 0);

  res.json({
    totalBalanceUsd,
    accounts: accounts.map(formatAccount),
    recentTransactions,
    monthlySpend: 2340.50,
    monthlyIncome: 8500.00,
    pendingTransactions: 0,
  });
});

// GET /api/accounts/:id
router.get("/accounts/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params["id"]);

  const [account] = await db.select().from(accountsTable)
    .where(and(
      eq(accountsTable.id, id),
      eq(accountsTable.userId, req.userId!)
    )).limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  res.json(formatAccount(account));
});

// GET /api/accounts/:id/transactions
router.get("/accounts/:id/transactions", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const id = String(req.params["id"]);

  const queryParsed = GetAccountTransactionsQueryParams.safeParse({
    limit: req.query.limit ? Number(req.query.limit) : undefined,
    offset: req.query.offset ? Number(req.query.offset) : undefined,
    type: req.query.type,
  });

  const limit = Math.min(queryParsed.success ? (queryParsed.data.limit ?? 50) : 50, 200);
  const offset = Math.max(queryParsed.success ? (queryParsed.data.offset ?? 0) : 0, 0);

  const [account] = await db.select().from(accountsTable)
    .where(and(
      eq(accountsTable.id, id),
      eq(accountsTable.userId, req.userId!)
    )).limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const txs = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.accountId, id))
    .orderBy(desc(transactionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` })
    .from(transactionsTable)
    .where(eq(transactionsTable.accountId, id));

  res.json({
    items: txs.map(formatTransaction),
    total: Number(count),
  });
});

export default router;
