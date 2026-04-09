import { Router } from "express";
import { db } from "@workspace/db";
import { transactionsTable, paymentsTable, cardsTable, accountsTable } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

// GET /api/users/me
router.get("/users/me", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const user = req.user!;
  res.json({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    accountType: user.accountType,
    kycStatus: user.kycStatus,
    emailVerified: user.emailVerified,
    phoneVerified: user.phoneVerified,
    createdAt: user.createdAt,
  });
});

// GET /api/users/me/activity
router.get("/users/me/activity", authMiddleware, async (req: AuthenticatedRequest, res) => {
  // Get user's accounts
  const accounts = await db.select().from(accountsTable)
    .where(eq(accountsTable.userId, req.userId!));

  const accountIds = accounts.map(a => a.id);

  let txActivity: Array<{
    id: string;
    type: "transaction";
    title: string;
    description?: string;
    amount?: number;
    currency?: string;
    timestamp: Date;
  }> = [];

  if (accountIds.length > 0) {
    const txs = await db.select().from(transactionsTable)
      .where(inArray(transactionsTable.accountId, accountIds))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(10);

    txActivity = txs.map(tx => ({
      id: tx.id,
      type: "transaction" as const,
      title: tx.type === "credit" ? `Received ${tx.currency} ${Number(tx.amount).toFixed(2)}` : `Sent ${tx.currency} ${Number(tx.amount).toFixed(2)}`,
      description: tx.description,
      amount: Number(tx.amount),
      currency: tx.currency,
      timestamp: tx.createdAt,
    }));
  }

  // Cards activity
  const cards = await db.select().from(cardsTable)
    .where(eq(cardsTable.userId, req.userId!))
    .orderBy(desc(cardsTable.createdAt))
    .limit(5);

  const cardActivity = cards.map(card => ({
    id: `card_${card.id}`,
    type: "card" as const,
    title: `${card.cardType === "virtual" ? "Virtual" : "Physical"} card ending ${card.lastFour} ${card.status === "frozen" ? "frozen" : "issued"}`,
    timestamp: card.createdAt,
  }));

  const allActivity = [...txActivity, ...cardActivity]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, 15);

  res.json(allActivity);
});

export default router;
