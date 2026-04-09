import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { authMiddleware, AuthenticatedRequest } from "../middlewares/auth";

const router = Router();

function formatNotification(n: typeof notificationsTable.$inferSelect) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    read: n.read,
    metadata: n.metadata,
    createdAt: n.createdAt,
  };
}

// GET /api/notifications
router.get("/notifications", authMiddleware, async (req: AuthenticatedRequest, res) => {
  const unreadOnly = req.query.unread_only === "true";

  const whereCondition = unreadOnly
    ? and(eq(notificationsTable.userId, req.userId!), eq(notificationsTable.read, false))
    : eq(notificationsTable.userId, req.userId!);

  const notifications = await db.select().from(notificationsTable)
    .where(whereCondition)
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(formatNotification));
});

// PUT /api/notifications/read-all
router.put("/notifications/read-all", authMiddleware, async (req: AuthenticatedRequest, res) => {
  await db.update(notificationsTable)
    .set({ read: true })
    .where(eq(notificationsTable.userId, req.userId!));

  res.json({ message: "All notifications marked as read" });
});

export default router;
