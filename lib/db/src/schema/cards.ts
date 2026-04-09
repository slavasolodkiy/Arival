import { pgTable, uuid, varchar, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";

export const cardTypeEnum = pgEnum("card_type", ["virtual", "physical"]);
export const cardStatusEnum = pgEnum("card_status", ["active", "frozen", "cancelled", "expired"]);

export const cardsTable = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  accountId: uuid("account_id").notNull().references(() => accountsTable.id),
  cardType: cardTypeEnum("card_type").notNull(),
  lastFour: varchar("last_four", { length: 4 }).notNull(),
  expiryMonth: integer("expiry_month").notNull(),
  expiryYear: integer("expiry_year").notNull(),
  status: cardStatusEnum("status").notNull().default("active"),
  spendLimitDaily: numeric("spend_limit_daily", { precision: 18, scale: 2 }).default("5000"),
  spendLimitMonthly: numeric("spend_limit_monthly", { precision: 18, scale: 2 }).default("20000"),
  providerCardId: varchar("provider_card_id", { length: 100 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardSchema = createInsertSchema(cardsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cardsTable.$inferSelect;
