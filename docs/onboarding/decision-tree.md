# Onboarding Decision Tree — Nexvault

## Overview

The onboarding engine is configurable and branching. Each step can lead to different next steps based on the user's answers. The engine loads its configuration from JSON files in `config/onboarding/`.

---

## Individual Customer Flow

### Step Flow Diagram

```
START
  │
  ▼
[account_type] — "What type of account?"
  ├── "individual" → [personal_info]
  └── "business"  → [business_info] (see Business Flow)

[personal_info] — "Tell us about yourself"
  Fields: first_name, last_name, date_of_birth, nationality
  → [country_of_residence]

[country_of_residence] — "Where do you live?"
  Fields: country_code, city, postcode, address_line_1, address_line_2?
  ├── country in [US, CA] → [tax_info_fatca]
  └── other              → [tax_info_general]

[tax_info_fatca] — "FATCA declaration (US/CA residents)"
  Fields: tax_id_number, us_person_confirmation
  → [document_type]

[tax_info_general] — "Tax residency"
  Fields: tax_country, tax_id_number?
  → [document_type]

[document_type] — "What ID document will you use?"
  ├── "passport"         → [document_upload_passport]
  ├── "national_id"      → [document_upload_national_id]
  └── "driving_licence"  → [document_upload_dl]

[document_upload_passport] — "Upload your passport"
  Fields: front_page_image
  → [proof_of_address]

[document_upload_national_id] — "Upload your national ID"
  Fields: front_image, back_image
  → [proof_of_address]

[document_upload_dl] — "Upload your driving licence"
  Fields: front_image, back_image
  → [proof_of_address]

[proof_of_address] — "Upload proof of address"
  Fields: document_type (utility_bill|bank_statement|government_letter), document_image
  Note: Document must be less than 3 months old
  → [selfie_check]

[selfie_check] — "Take a selfie"
  Fields: selfie_image (or IDV SDK redirect)
  → [funding_source]

[funding_source] — "Source of funds declaration"
  Fields: source (employment|business|investment|savings|other), monthly_income_range
  → [terms_acceptance]

[terms_acceptance] — "Review and accept terms"
  Fields: terms_accepted, privacy_accepted, marketing_consent?
  → [KYC_SUBMITTED]

[KYC_SUBMITTED] — Async KYC processing
  ├── approved  → [ACCOUNT_CREATED]
  ├── manual    → [MANUAL_REVIEW_PENDING]
  └── rejected  → [REJECTED]

[ACCOUNT_CREATED] — Account provisioned ✓
```

---

## Business Customer Flow

### Step Flow Diagram

```
START → [account_type: "business"]
  │
  ▼
[business_info] — "Tell us about your business"
  Fields: company_name, company_type, registration_number, country_of_incorporation
  industry_code, description_of_business
  → [business_address]

[business_address] — "Business address"
  Fields: address_line_1, address_line_2?, city, postcode, country_code
  → [business_director]

[business_director] — "Director / Beneficial Owner information"
  Fields: first_name, last_name, date_of_birth, nationality, ownership_percentage
  + personal address
  → [business_directors_additional]

[business_directors_additional] — "Are there additional directors / UBOs?"
  ├── "yes" → [business_director] (repeat for each UBO ≥ 25%)
  └── "no"  → [business_documents]

[business_documents] — "Upload business documents"
  Fields:
    - certificate_of_incorporation
    - memorandum_of_association
    - proof_of_business_address
    ├── company_type == "listed"   → no shareholder register required
    └── company_type != "listed"  → shareholder_register required
  → [authorized_signatory]

[authorized_signatory] — "Authorized signatory details"
  Fields: (if not director) name, role, authorization_document
  → [funding_source_business]

[funding_source_business] — "Source of business funds"
  Fields: source, expected_monthly_volume, currencies_needed, jurisdictions_operated
  → [business_terms]

[business_terms] — "Review and accept terms"
  Fields: terms_accepted, privacy_accepted, aml_policy_accepted
  → [KYC_SUBMITTED]

[KYC_SUBMITTED] → same as individual flow above
```

---

## Country-Based Configuration

| Country | Allowed Doc Types | Additional Steps | Notes |
|---------|------------------|-----------------|-------|
| United Kingdom | passport, national_id, driving_licence | - | Full support |
| Germany | personalausweis (national_id), passport | - | Full support |
| France | passport, national_id, driving_licence | - | Full support |
| United States | passport, driving_licence | fatca_declaration | FATCA required |
| Canada | passport, driving_licence | fatca_declaration | FATCA required |
| Singapore | passport, national_id | - | Full support |
| UAE | passport | - | Full support |
| India | passport | - | No national_id |

---

## Required Docs per Document Type

| Doc Type | Required Images | Accepted Formats | Max Size |
|----------|----------------|-----------------|---------|
| passport | front (bio page) | jpg, png, pdf | 10MB |
| national_id | front + back | jpg, png | 10MB |
| driving_licence | front + back | jpg, png | 10MB |
| proof_of_address | single page | jpg, png, pdf | 10MB |
| certificate_of_incorporation | full doc | pdf | 20MB |
| memorandum_of_association | full doc | pdf | 20MB |
| shareholder_register | full doc | pdf | 20MB |
| selfie | live image | jpg | 5MB |

---

## Supported Languages Config

| Language | Code | Status |
|---------|------|--------|
| English | en | Active |
| German | de | Planned |
| French | fr | Planned |
| Spanish | es | Planned |
| Arabic | ar | Planned |
| Chinese (Simplified) | zh-CN | Planned |

---

## Branch Logic Summary

| Condition | Branch |
|-----------|--------|
| country_code IN ('US', 'CA') | Include FATCA step |
| document_type == 'passport' | Single image upload |
| document_type IN ('national_id', 'driving_licence') | Front + back upload |
| account_type == 'business' | Use business flow |
| business has additional UBOs | Repeat director step |
| company_type == 'listed' | Skip shareholder register |
| KYC result == 'manual' | Route to manual review |
