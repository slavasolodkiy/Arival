import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const currencyEnum = pgEnum("currency", ["USD", "EUR", "GBP", "SGD", "AED"]);
export const accountStatusEnum = pgEnum("account_status", ["active", "frozen", "closed"]);
export const transactionTypeEnum = pgEnum("transaction_type", ["credit", "debit"]);
export const transactionCategoryEnum = pgEnum("transaction_category", ["transfer", "card", "fee", "fx", "interest"]);
export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed", "reversed"]);

export const accountsTable = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  currency: currencyEnum("currency").notNull(),
  iban: varchar("iban", { length: 50 }).unique(),
  accountNumber: varchar("account_number", { length: 30 }),
  sortCode: varchar("sort_code", { length: 10 }),
  balance: numeric("balance", { precision: 18, scale: 2 }).notNull().default("0"),
  availableBalance: numeric("available_balance", { precision: 18, scale: 2 }).notNull().default("0"),
  status: accountStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  accountId: uuid("account_id").notNull().references(() => accountsTable.id),
  type: transactionTypeEnum("type").notNull(),
  category: transactionCategoryEnum("category").notNull().default("transfer"),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).notNull(),
  description: varchar("description", { length: 255 }).notNull(),
  reference: varchar("reference", { length: 100 }),
  counterpartyName: varchar("counterparty_name", { length: 255 }),
  counterpartyAccount: varchar("counterparty_account", { length: 50 }),
  counterpartyBank: varchar("counterparty_bank", { length: 255 }),
  status: transactionStatusEnum("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accountsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accountsTable.$inferSelect;

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
