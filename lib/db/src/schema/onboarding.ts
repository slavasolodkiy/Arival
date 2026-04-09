import { pgTable, uuid, varchar, jsonb, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const onboardingStatusEnum = pgEnum("onboarding_status", ["in_progress", "kyc_pending", "approved", "rejected", "manual_review"]);
export const onboardingFlowTypeEnum = pgEnum("onboarding_flow_type", ["individual", "business"]);
export const kycDocumentStatusEnum = pgEnum("kyc_document_status", ["uploaded", "submitted", "verified", "rejected"]);
export const kycDocumentTypeEnum = pgEnum("kyc_document_type", [
  "passport",
  "national_id",
  "driving_licence",
  "proof_of_address",
  "certificate_of_incorporation",
  "memorandum_of_association",
  "shareholder_register"
]);

export const onboardingApplicationsTable = pgTable("onboarding_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => usersTable.id),
  flowType: onboardingFlowTypeEnum("flow_type").notNull(),
  countryCode: varchar("country_code", { length: 2 }).notNull(),
  currentStep: varchar("current_step", { length: 50 }).notNull().default("personal_info"),
  stepData: jsonb("step_data").default({}),
  completedSteps: jsonb("completed_steps").default([]),
  status: onboardingStatusEnum("status").notNull().default("in_progress"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const kycDocumentsTable = pgTable("kyc_documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  applicationId: uuid("application_id").notNull().references(() => onboardingApplicationsTable.id),
  documentType: kycDocumentTypeEnum("document_type").notNull(),
  providerReference: varchar("provider_reference", { length: 100 }),
  status: kycDocumentStatusEnum("status").notNull().default("uploaded"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertOnboardingApplicationSchema = createInsertSchema(onboardingApplicationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOnboardingApplication = z.infer<typeof insertOnboardingApplicationSchema>;
export type OnboardingApplication = typeof onboardingApplicationsTable.$inferSelect;
