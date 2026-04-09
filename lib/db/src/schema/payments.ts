import { pgTable, uuid, varchar, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { accountsTable } from "./accounts";

export const paymentStatusEnum = pgEnum("payment_status", ["pending", "processing", "completed", "failed", "cancelled"]);

export const beneficiariesTable = pgTable("beneficiaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  name: varchar("name", { length: 255 }).notNull(),
  accountNumber: varchar("account_number", { length: 50 }),
  sortCode: varchar("sort_code", { length: 10 }),
  iban: varchar("iban", { length: 50 }),
  swiftBic: varchar("swift_bic", { length: 20 }),
  bankName: varchar("bank_name", { length: 255 }),
  country: varchar("country", { length: 2 }),
  currency: varchar("currency", { length: 3 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const paymentsTable = pgTable("payments", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  fromAccountId: uuid("from_account_id").notNull().references(() => accountsTable.id),
  beneficiaryId: uuid("beneficiary_id").references(() => beneficiariesTable.id),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  sourceCurrency: varchar("source_currency", { length: 3 }).notNull(),
  destinationCurrency: varchar("destination_currency", { length: 3 }).notNull(),
  exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }).default("1"),
  destinationAmount: numeric("destination_amount", { precision: 18, scale: 2 }),
  fee: numeric("fee", { precision: 18, scale: 2 }).default("0"),
  reference: varchar("reference", { length: 100 }),
  status: paymentStatusEnum("status").notNull().default("pending"),
  providerReference: varchar("provider_reference", { length: 100 }),
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBeneficiarySchema = createInsertSchema(beneficiariesTable).omit({ id: true, createdAt: true });
export type InsertBeneficiary = z.infer<typeof insertBeneficiarySchema>;
export type Beneficiary = typeof beneficiariesTable.$inferSelect;

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
