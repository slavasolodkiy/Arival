/**
 * Catalog API integration tests.
 *
 * Tests the onboarding catalog and preview endpoints for:
 * - Both flow types (individual + business)
 * - At least 3 countries with different document sets
 * - Language fallback behavior
 * - Branch divergence when answers differ
 * - FATCA routing for US/CA vs others
 * - Document restriction by country
 *
 * These tests are deterministic and use no database.
 */
import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

let app: Express;

beforeAll(async () => {
  const mod = await import("../app");
  app = mod.default;
});

// ─── GET /api/onboarding/catalog ─────────────────────────────────────────

describe("GET /api/onboarding/catalog — query validation", () => {
  it("returns 200 with defaults (individual, GB, en)", async () => {
    const res = await request(app).get("/api/onboarding/catalog");
    expect(res.status).toBe(200);
    expect(res.body.flowType).toBe("individual");
    expect(res.body.country).toBe("GB");
    expect(res.body.language).toBe("en");
  });

  it("returns 200 for business flow", async () => {
    const res = await request(app).get("/api/onboarding/catalog?flowType=business&country=GB");
    expect(res.status).toBe(200);
    expect(res.body.flowType).toBe("business");
    expect(Array.isArray(res.body.steps)).toBe(true);
    expect(res.body.steps.length).toBeGreaterThan(0);
  });

  it("returns 400 for invalid flowType", async () => {
    const res = await request(app).get("/api/onboarding/catalog?flowType=invalid");
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown country", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=XX");
    expect(res.status).toBe(404);
  });

  it("returns 422 for unavailable country (NG — high risk)", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=NG");
    expect(res.status).toBe(422);
  });
});

describe("GET /api/onboarding/catalog — country-specific document sets", () => {
  it("GB includes national_id and residence_permit", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=GB");
    expect(res.status).toBe(200);
    const docs: string[] = res.body.availableDocuments;
    expect(docs).toContain("passport");
    expect(docs).toContain("national_id");
    expect(docs).toContain("residence_permit");
  });

  it("IN is passport-only", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=IN");
    expect(res.status).toBe(200);
    const docs: string[] = res.body.availableDocuments;
    expect(docs).toEqual(["passport"]);
    expect(docs).not.toContain("national_id");
    expect(docs).not.toContain("driving_licence");
  });

  it("US allows passport and driving_licence but NOT national_id", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=US");
    expect(res.status).toBe(200);
    const docs: string[] = res.body.availableDocuments;
    expect(docs).toContain("passport");
    expect(docs).toContain("driving_licence");
    expect(docs).not.toContain("national_id");
  });

  it("AE is passport-only", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=AE");
    expect(res.status).toBe(200);
    const docs: string[] = res.body.availableDocuments;
    expect(docs).toEqual(["passport"]);
  });

  it("DE includes passport, national_id, residence_permit", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=DE");
    expect(res.status).toBe(200);
    const docs: string[] = res.body.availableDocuments;
    expect(docs).toContain("national_id");
    expect(docs).toContain("residence_permit");
    expect(docs).not.toContain("driving_licence");
  });
});

describe("GET /api/onboarding/catalog — language fallback", () => {
  it("returns 'en' for GB when requesting 'en'", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=GB&language=en");
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
    expect(res.body.languageFallback).toBe(false);
  });

  it("falls back to 'en' when requesting 'de' for GB (only 'en' supported)", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=GB&language=de");
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
    expect(res.body.languageFallback).toBe(true);
  });

  it("returns 'de' for DE when requesting 'de'", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=DE&language=de");
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("de");
    expect(res.body.languageFallback).toBe(false);
  });

  it("falls back to 'en' for DE when requesting 'es' (not supported in DE)", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=DE&language=es");
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("en");
    expect(res.body.languageFallback).toBe(true);
  });

  it("'fr' is supported in FR", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=FR&language=fr");
    expect(res.status).toBe(200);
    expect(res.body.language).toBe("fr");
    expect(res.body.languageFallback).toBe(false);
  });
});

describe("GET /api/onboarding/catalog — FATCA flag", () => {
  it("US has requiresFatca=true", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=US");
    expect(res.status).toBe(200);
    expect(res.body.countryInfo.requiresFatca).toBe(true);
  });

  it("CA has requiresFatca=true", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=CA");
    expect(res.status).toBe(200);
    expect(res.body.countryInfo.requiresFatca).toBe(true);
  });

  it("GB has requiresFatca=false", async () => {
    const res = await request(app).get("/api/onboarding/catalog?country=GB");
    expect(res.status).toBe(200);
    expect(res.body.countryInfo.requiresFatca).toBe(false);
  });
});

// ─── POST /api/onboarding/preview ─────────────────────────────────────────

describe("POST /api/onboarding/preview — validation", () => {
  it("returns 400 for missing flowType", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ country: "GB" });
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid country code (too long)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "GBR" });
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown country", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "ZZ" });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/onboarding/preview — branch divergence (individual flow)", () => {
  it("no answers → next step is account_type", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "GB", answersSoFar: {} });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("account_type");
    expect(res.body.completedSteps).toHaveLength(0);
  });

  it("account_type=individual → next step is personal_info", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "GB",
        answersSoFar: {
          account_type: { account_type: "individual" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("personal_info");
    expect(res.body.completedSteps).toContain("account_type");
    expect(res.body.branchReason).toMatch(/personal account/i);
  });

  it("account_type=business → nextStepId is REDIRECT_BUSINESS_FLOW", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "GB",
        answersSoFar: {
          account_type: { account_type: "business" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("REDIRECT_BUSINESS_FLOW");
    expect(res.body.isComplete).toBe(true);
  });

  it("GB resident → tax_info_general (not FATCA)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "GB",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "Jane", last_name: "Doe", date_of_birth: "1990-01-01", nationality: "GB" },
          country_of_residence: { country_code: "GB", address_line_1: "1 High St", city: "London", postcode: "EC1A 1BB" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("tax_info_general");
    expect(res.body.branchReason).toMatch(/Non-US\/CA/i);
    expect(res.body.completedSteps).toContain("country_of_residence");
  });

  it("US resident → tax_info_fatca (FATCA branch)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "US",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "John", last_name: "Smith", date_of_birth: "1985-06-15", nationality: "US" },
          country_of_residence: { country_code: "US", address_line_1: "100 Main St", city: "New York", postcode: "10001" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("tax_info_fatca");
    expect(res.body.branchReason).toMatch(/FATCA/i);
  });

  it("CA resident → tax_info_fatca (FATCA branch)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "CA",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "Marie", last_name: "Dupont", date_of_birth: "1992-03-20", nationality: "CA" },
          country_of_residence: { country_code: "CA", address_line_1: "50 Maple Ave", city: "Toronto", postcode: "M5H 2N2" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("tax_info_fatca");
  });

  it("DE resident → tax_info_general (not FATCA)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "DE",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "Hans", last_name: "Müller", date_of_birth: "1988-07-14", nationality: "DE" },
          country_of_residence: { country_code: "DE", address_line_1: "Hauptstraße 1", city: "Berlin", postcode: "10115" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("tax_info_general");
  });

  it("document_type passport → next step is document_upload_passport", async () => {
    const baseAnswers = {
      account_type: { account_type: "individual" },
      personal_info: { first_name: "Jane", last_name: "Doe", date_of_birth: "1990-01-01", nationality: "GB" },
      country_of_residence: { country_code: "GB", address_line_1: "1 High St", city: "London", postcode: "EC1A 1BB" },
      tax_info_general: { tax_country: "GB" },
      document_type: { document_type: "passport" },
    };
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "GB", answersSoFar: baseAnswers });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("document_upload_passport");
  });

  it("document_type national_id → next step is document_upload_national_id", async () => {
    const baseAnswers = {
      account_type: { account_type: "individual" },
      personal_info: { first_name: "Jane", last_name: "Doe", date_of_birth: "1990-01-01", nationality: "GB" },
      country_of_residence: { country_code: "GB", address_line_1: "1 High St", city: "London", postcode: "EC1A 1BB" },
      tax_info_general: { tax_country: "GB" },
      document_type: { document_type: "national_id" },
    };
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "GB", answersSoFar: baseAnswers });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("document_upload_national_id");
  });

  it("allowedAnswers for document_type are restricted to IN's available documents", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "IN",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "Priya", last_name: "Sharma", date_of_birth: "1991-02-28", nationality: "IN" },
          country_of_residence: { country_code: "IN", address_line_1: "42 MG Road", city: "Mumbai", postcode: "400001" },
          tax_info_general: { tax_country: "IN" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("document_type");
    const allowedDocs: string[] = res.body.allowedAnswers.document_type ?? [];
    expect(allowedDocs).toEqual(["passport"]);
    expect(allowedDocs).not.toContain("national_id");
  });

  it("flow reaches SUBMIT_KYC when all steps answered (passport path)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "individual",
        country: "GB",
        answersSoFar: {
          account_type: { account_type: "individual" },
          personal_info: { first_name: "Jane", last_name: "Doe", date_of_birth: "1990-01-01", nationality: "GB" },
          country_of_residence: { country_code: "GB", address_line_1: "1 High St", city: "London", postcode: "EC1A 1BB" },
          tax_info_general: { tax_country: "GB" },
          document_type: { document_type: "passport" },
          document_upload_passport: { front_image: "data:image/jpeg;base64,..." },
          proof_of_address: { poa_document_type: "utility_bill", poa_image: "data:image/jpeg;base64,..." },
          selfie_check: { selfie_image: "data:image/jpeg;base64,..." },
          funding_source: { source: "employment", monthly_income_range: "1000_5000" },
          terms_acceptance: { terms_accepted: "true", privacy_accepted: "true" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("SUBMIT_KYC");
    expect(res.body.isComplete).toBe(true);
  });
});

describe("POST /api/onboarding/preview — business flow", () => {
  it("no answers → next step is business_info", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "business", country: "GB", answersSoFar: {} });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("business_info");
  });

  it("has_additional_directors=yes → loops back to business_director", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "business",
        country: "GB",
        answersSoFar: {
          business_info: { company_name: "Acme Ltd", company_type: "ltd", registration_number: "12345678", country_of_incorporation: "GB", industry_code: "technology", description_of_business: "Software" },
          business_address: { address_line_1: "1 Silicon Way", city: "London", postcode: "EC2A 4XX", country_code: "GB" },
          business_director: { director_first_name: "Alice", director_last_name: "Smith", director_dob: "1980-05-10", director_nationality: "GB", ownership_percentage: "51", director_address_line_1: "10 Home St", director_city: "London", director_country: "GB" },
          business_directors_additional: { has_additional_directors: "yes" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("business_director");
    expect(res.body.branchReason).toMatch(/Additional directors/i);
  });

  it("has_additional_directors=no → proceeds to business_documents", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({
        flowType: "business",
        country: "GB",
        answersSoFar: {
          business_info: { company_name: "Acme Ltd", company_type: "ltd", registration_number: "12345678", country_of_incorporation: "GB", industry_code: "technology", description_of_business: "Software" },
          business_address: { address_line_1: "1 Silicon Way", city: "London", postcode: "EC2A 4XX", country_code: "GB" },
          business_director: { director_first_name: "Alice", director_last_name: "Smith", director_dob: "1980-05-10", director_nationality: "GB", ownership_percentage: "51", director_address_line_1: "10 Home St", director_city: "London", director_country: "GB" },
          business_directors_additional: { has_additional_directors: "no" },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body.nextStepId).toBe("business_documents");
    expect(res.body.branchReason).toMatch(/All directors/i);
  });
});

describe("POST /api/onboarding/preview — unavailable country parity", () => {
  it("rejects an unavailable country with 422 + risk context (SA — Saudi Arabia)", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "SA", answersSoFar: {} });
    expect(res.status).toBe(422);
    expect(res.body).toMatchObject({
      error: expect.stringContaining("not currently available"),
      riskTier: "medium",
    });
  });

  it("rejects BR (Brazil, high-risk) with 422 + riskTier=high", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "BR", answersSoFar: {} });
    expect(res.status).toBe(422);
    expect(res.body.riskTier).toBe("high");
  });

  it("rejects NG (Nigeria) for business flow with 422", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "business", country: "NG", answersSoFar: {} });
    expect(res.status).toBe(422);
    expect(res.body.error).toMatch(/not currently available/);
  });

  it("allows available country (GB) through preview — returns 200", async () => {
    const res = await request(app)
      .post("/api/onboarding/preview")
      .send({ flowType: "individual", country: "GB", answersSoFar: {} });
    expect(res.status).toBe(200);
    expect(res.body.isComplete).toBe(false);
  });
});
