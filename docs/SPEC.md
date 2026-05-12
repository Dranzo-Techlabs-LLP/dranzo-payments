# Dranzo Payments — Master Spec (Slices 2–8)

> Refined business prompt + executable scope. Read this before adding features.

## Role

You are a **Senior SaaS Business Architect + Full-Stack Engineer** maintaining
a multi-tenant subscription, billing, reminder and compliance platform for an
IT services / SaaS provider that resells or owns recurring-revenue products.

## North-star loop

The product earns its keep when this loop is bulletproof:

```
Client signed → Subscription created
        ↓
Daily scheduler scans subscriptions + compliance
        ↓
Reminder date hit → Task card auto-created in "To-Do" column
        ↓
Due date hit → card moves to "In-Progress" + invoice generated
        ↓
Operator records payment → invoice marked Paid, card moves to "Done"
        ↓
Next cycle's renewal date + reminder scheduled (idempotent)
```

Idempotency keys prevent duplicate cards / invoices when the cron retries.

## Use cases (must work)

1. **Add a client** with legal name, GSTIN/VAT, POC + extra contacts (billing/technical),
   country, currency, account-manager assignment, tags.
2. **Set a subscription** with one of these rate models:
   - Flat per client / month
   - Flat per client / year
   - Per user / month
   - Per user / year
   - Tiered per user (slabs)
   - Volume / step pricing
   - One-time setup fee (added once)
3. **Auto-reminders** — N days before due date (default 7; configurable per
   subscription) → Task card in "To-Do" assigned to the client's account
   manager (fallback admin).
4. **On due date** → invoice generated with sequential per-org-per-FY number,
   tax line (CGST/SGST or IGST), and HTML preview (PDF render hook ready).
5. **Mark paid** with method (Bank/UPI/Card/Cheque/Other), reference number,
   date received → invoice closes, task closes, next cycle scheduled.
6. **Compliance calendar** — recurring items (GST monthly, GSTR-3B, TDS,
   contract review, KYC, license expiry) generate task cards on the same
   reminder→due flow.
7. **Org settings** — logo, GSTIN, invoice prefix, signing authority, bank
   details, T&C, default reminder lead time.

## Out of scope (this round)

- Email delivery (in-app + return-link only; SMTP wiring later)
- Coupons / stacked discounts
- Multi-currency conversion (subscription currency is locked at creation)
- Hangfire-style retry queue (replaced by `@nestjs/schedule` + idempotency keys)
- Slack/Teams/Calendar integration
- Reports (MRR/ARR/aging) — Slice 9
- True PDF render (HTML invoice + browser-print; pdfkit hook in `invoices/pdf.ts`)

## Pricing models (engine contract)

`PricingTier.modelType ∈ { FLAT_MONTH, FLAT_YEAR, PER_USER_MONTH,
PER_USER_YEAR, TIERED_PER_USER, VOLUME_STEP, ONE_TIME }`

Each model implements:

```ts
interface PricingStrategy {
  modelType: PricingModelType;
  calculate(tier: PricingTier, units: number, period: BillingPeriod): LineItem[];
}
```

`PricingEngine.preview(subscription, period)` → `InvoicePreview { lineItems, subtotal, tax, total }`

Add a new model = drop one file in `pricing/strategies/`, register in `engine.ts`.

## Tax (v1, India-first)

Per-org `homeStateCode` + per-client `placeOfSupply`:
- Same state → CGST + SGST (each = tax_rate / 2)
- Different state → IGST
- No GSTIN on client → no tax (export / unregistered)

`pricing_tiers.tax_rate` is the slab (0, 5, 12, 18, 28). Tax applied at
invoice generation, not stored on the tier-line.

## Invoice numbering

`{org.invoicePrefix}-{FY}-{seq:04d}` (e.g., `DRZ-2627-0042`). FY = Indian
Apr→Mar. Strictly gap-free per (org, fy) via a `SELECT … FOR UPDATE` lock
on `invoice_sequences`.

## Task board states

`BACKLOG → TODO → IN_PROGRESS → WAITING_ON_CLIENT → OVERDUE → DONE`

- Auto-created in `TODO` on reminder date.
- Auto-moved to `IN_PROGRESS` on due date.
- Auto-moved to `OVERDUE` if unpaid N days past due.
- Manual moves allowed; auto-create never duplicates (unique
  `(linked_entity_type, linked_entity_id, cycle_key)`).

## Compliance items

`type ∈ { TAX_FILING, CONTRACT_REVIEW, KYC, LICENSE, SLA, AUDIT }`
`frequency ∈ { MONTHLY, QUARTERLY, HALFYEARLY, YEARLY, ONE_OFF }`

Same scheduler scans them daily, same task auto-create flow.

## Acceptance checklist (per slice merge)

- Migration runs cleanly on a fresh `dp` DB.
- Seed loads a demo client + subscription + compliance item.
- Smoke test: scheduler triggered manually creates exactly one task per due item.
- Smoke test: mark-paid flow closes the task and the next cycle's renewal date
  + reminder is scheduled correctly.
- API + Web both built without TypeScript errors.

## Non-functional

- Strict tenant isolation: every controller pulls `organizationId` from
  `req.user`, every query filters by it. Cross-tenant access is a server
  error, not a 404.
- Audit log on every state-changing endpoint (interceptor + service already
  in place).
- Money: `BIGINT` minor units + `CHAR(3)` ISO; never `decimal` at storage.
- Times: store UTC, render in user TZ; reminders fire in operator TZ.
- Soft delete everywhere except join tables.
