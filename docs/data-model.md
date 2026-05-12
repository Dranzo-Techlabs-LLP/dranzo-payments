# Data Model — v1

> Authoritative ER diagram for the platform. Slice 1 implements the bold tables.

## Entities

- **Organization** (operator tenant root)
- **User** (operator's staff)
- **Invitation** (pending team invite)
- **RefreshToken** (rotated, hashed)
- **AuditLog** (who/what/when, before+after JSON)
- Client, Contact, Tag — Slice 2
- Product, Plan, PricingTier — Slice 3
- Subscription, SubscriptionEvent, Coupon — Slice 4
- Reminder, Task, ComplianceTemplate, ComplianceItem — Slices 5/8
- Invoice, InvoiceLineItem, InvoiceSequence, Payment, Currency — Slices 6/7

## Conventions

| Concern | Rule |
|---|---|
| Tenancy | every business row has `organization_id` (indexed, FK, not null) |
| Money | `BIGINT` minor units (paise/cents) + `CHAR(3)` ISO currency |
| Time | UTC in DB (`DATETIME(6)`), rendered in user TZ |
| Soft delete | `deleted_at DATETIME(6) NULL` + global query filter |
| Audit | `created_at`, `created_by`, `updated_at`, `updated_by` on every row |
| IDs | UUID v4 (`CHAR(36)`) |
| Idempotency | `idempotency_key` column on scheduler-produced rows; unique index |

## ER (Slice 1 scope)

```mermaid
erDiagram
    Organization ||--o{ User : "employs"
    Organization ||--o{ Invitation : "issues"
    Organization ||--o{ AuditLog : "records"
    User ||--o{ RefreshToken : "owns"
    User ||--o{ AuditLog : "actor"
    Organization {
        char36 id PK
        string legal_name
        string display_name
        string country
        char3  default_currency
        string tax_id "GSTIN/VAT"
        string invoice_prefix
        string logo_url
        json   address
        json   bank_details
        string signing_authority
        text   invoice_footer
        datetime created_at
    }
    User {
        char36 id PK
        char36 organization_id FK
        string email
        string name
        string password_hash
        enum   role "ADMIN|FINANCE|ACCOUNT_MANAGER|VIEWER"
        bool   is_active
        datetime created_at
    }
    Invitation {
        char36 id PK
        char36 organization_id FK
        string email
        enum   role
        char64 token_hash
        datetime expires_at
        char36 invited_by FK
        datetime accepted_at
    }
    RefreshToken {
        char36 id PK
        char36 user_id FK
        char64 token_hash
        datetime expires_at
        datetime revoked_at
    }
    AuditLog {
        char36 id PK
        char36 organization_id FK
        char36 actor_id FK
        string action
        string entity
        char36 entity_id
        json   before
        json   after
        string ip
        datetime created_at
    }
```
