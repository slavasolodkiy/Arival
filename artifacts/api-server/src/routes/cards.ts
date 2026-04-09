import { Router } from "express";
import { db } from "@workspace/db";
import { cardsTable, accountsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";
import { CreateCardBody } from "@workspace/api-zod";

const router = Router();

function formatCard(card: typeof cardsTable.$inferSelect) {
  return {
    id: card.id,
    accountId: card.accountId,
    cardType: card.cardType,
    lastFour: card.lastFour,
    expiryMonth: card.expiryMonth,
    expiryYear: card.expiryYear,
    status: card.status,
    spendLimitDaily: card.spendLimitDaily ? Number(card.spendLimitDaily) : 5000,
    spendLimitMonthly: card.spendLimitMonthly ? Number(card.spendLimitMonthly) : 20000,
    createdAt: card.createdAt,
  };
}

// GET /api/cards
router.get("/cards", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const cards = await db.select().from(cardsTable)
    .where(eq(cardsTable.userId, req.userId!))
    .orderBy(desc(cardsTable.createdAt));

  res.json(cards.map(formatCard));
});

// POST /api/cards
router.post("/cards", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const parsed = CreateCardBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed" });
    return;
  }

  const { accountId, cardType } = parsed.data;

  const [account] = await db.select().from(accountsTable)
    .where(and(
      eq(accountsTable.id, accountId),
      eq(accountsTable.userId, req.userId!)
    )).limit(1);

  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }

  const lastFour = Math.floor(1000 + Math.random() * 9000).toString();
  const now = new Date();
  const expiryYear = now.getFullYear() + 3;

  const [card] = await db.insert(cardsTable).values({
    userId: req.userId!,
    accountId,
    cardType: cardType as "virtual" | "physical",
    lastFour,
    expiryMonth: now.getMonth() + 1,
    expiryYear,
    status: "active",
    spendLimitDaily: "5000",
    spendLimitMonthly: "20000",
  }).returning();

  res.status(201).json(formatCard(card));
});

// GET /api/cards/:id
router.get("/cards/:id", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [card] = await db.select().from(cardsTable)
    .where(and(
      eq(cardsTable.id, req.params.id),
      eq(cardsTable.userId, req.userId!)
    )).limit(1);

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(formatCard(card));
});

// PUT /api/cards/:id/freeze
router.put("/cards/:id/freeze", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [card] = await db.update(cardsTable)
    .set({ status: "frozen", updatedAt: new Date() })
    .where(and(
      eq(cardsTable.id, req.params.id),
      eq(cardsTable.userId, req.userId!)
    ))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(formatCard(card));
});

// PUT /api/cards/:id/unfreeze
router.put("/cards/:id/unfreeze", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const [card] = await db.update(cardsTable)
    .set({ status: "active", updatedAt: new Date() })
    .where(and(
      eq(cardsTable.id, req.params.id),
      eq(cardsTable.userId, req.userId!)
    ))
    .returning();

  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(formatCard(card));
});

export default router;
