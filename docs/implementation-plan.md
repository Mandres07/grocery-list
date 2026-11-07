# Lista de Compras implementation plan

## Current checkpoint

Milestones **1–8 are complete**, with the user's explicit decision to keep **production only** and defer hosted preview deployment. Milestone **9 has not started**. The production app is [Lista de Compras](https://lista-de-compras-beta-eight.vercel.app); it uses fresh accounts, not a migration of the saved local household data.

The latest application checks completed on 2026-11-04 passed lint, TypeScript, **208 unit tests**, **87 disposable local database integration tests**, and production build; npm audit reported zero vulnerabilities. Live browser checks covered signed-out route boundaries and mobile registration. The user confirmed real production registration, verification email/link, household creation, sharing, and password recovery. This is the recorded application verification, not a claim that every later documentation edit reruns those checks.

Earlier incremental notes and test counts are preserved in [historical implementation notes](history/implementation-notes.md). Those snapshots are not current setup instructions.

## Review agreement

Work one milestone at a time. After each milestone, report changes, actual verification, limitations, and concrete review steps, then wait for the user to authorize continuation. Guide account/provider setup that needs the user's credentials. Do not copy Scorecast secrets/data, replace the saved local database with a test instance, or migrate production data without explicit authorization.

## Completed milestones

| Milestone | Delivered scope | Verification / guide |
| --- | --- | --- |
| **1 — Foundation** | Private repository, Next.js/React/TypeScript/Tailwind, Spanish branding, local port 3001 | [README](../README.md), [architecture](architecture.md) |
| **2 — Data foundation** | Mongoose models, indexes, household guards, local replica set on port 27018, disposable verification | [Local database](local-database.md) |
| **3 — Accounts** | Credentials/JWT sessions, immediate sign-in after registration, verification/recovery email, household creation | [Accounts](accounts.md) |
| **4 — Family sharing** | Owner-only invitations, acceptance, resend/revoke, member removal, current-access enforcement | [Family sharing](family-sharing.md) |
| **5 — Inventory** | Saved products/categories/subcategories, atomic stock, counted corrections, revisions, archive/restore, activity/undo, filtering | [Inventory](inventory.md) |
| **6 — Shopping** | Linked/custom items, inline quantity/check purchase, low-stock additions, atomic deduplicated batch receipt/history | [Shopping](shopping.md) |
| **7 — Hosted database** | Separate Atlas project, Free/M0 in AWS us-east-1, database-specific users, index/transaction/access checks, verified export/recovery | [Hosted database](hosted-database.md) |
| **8 — Deployment** | Vercel Hobby production, Node 22/iad1, Production-only credentials, correct HTTPS auth/email origin, verified live onboarding/sharing/recovery | [Deployment](deployment.md) |

### Final behavior carried forward from inventory/UI refinement

- `/` and `/sign-in` share a two-column welcome/form layout; authenticated visits lead to inventory, with verification/household/invitation setup handled by server guards.
- A shared sticky green header has inline desktop navigation and a dismissible mobile menu. Content and footer use the same outer gutters.
- Locally bundled Manrope, theme-generated colors/sizes/motion, green primary actions, and small terracotta details apply across shared components and branded emails.
- Inventory uses a desktop table and compact mobile rows. Creation and filters use reusable dialogs; product details use URL-based tabs.
- Zero stock sorts first, then warning-threshold stock. Confirmed quantities/badges change immediately. Row order and low-stock filter removal wait for 1.5 seconds after adjustments finish, resetting on further interaction.
- Categories, activity, and shopping states share compact surfaces, row padding, borders, secondary text, and quiet row actions. Reduced-motion settings are honored.
- Eight default categories initialize transactionally once per household; inline category creation and product creation commit together.

### Hosted scope and remaining operational limits

- Production: `https://lista-de-compras-beta-eight.vercel.app`, source deployment preparation commit `7883d22`.
- Hosted production uses `grocery_list_production` and its restricted user. Preview/recovery databases and roles were prepared/tested, but the user deferred the protected preview branch/deployment; no preview branch or hosted preview credentials were published.
- Atlas offers optional paid backups, currently disabled. Manual export/isolated recovery is verified; no automatic backup schedule is configured. Keep an encrypted off-device backup before migrating real data.
- Local accounts/inventory remain in their original local database; production started fresh by user choice. Offline writes and push subscriptions are not implemented.

## Milestone 9 — Release and everyday use (not started)

Proceed only when the user asks to continue.

- Run lint, type checking, unit/integration tests, dependency audit, and production build for release changes.
- Review mobile/desktop accessibility and real-device usability, retries, concurrency, member removal, and household isolation.
- Add app icons/Home Screen setup and document actual browser/device support; do not promise offline operation.
- Review deployment/recovery instructions, backup ownership, and a verified off-device backup plan for real production data.
- Let the primary household use a small real product/shopping set and collect feedback before broader feature scope.

Review: both household members complete the normal inventory/shopping workflow on their phones. Record any remaining device-specific checks accurately. This milestone does not silently enable paid services or revive the deferred preview deployment.

## Deferred scope

Household rename was authorized as a focused follow-up on 2026-11-05: the verified owner can edit the shared name from **Mi hogar**, with server-side ownership/membership checks and the existing 1–100 character limit. This does not start milestone 9.

Protected hosted previews require renewed user authorization and branch-scoped credentials/domain configuration. Google sign-in is optional and not enabled. Household deletion, member-initiated leaving, ownership transfer, account deletion, and multiple-household navigation require explicit design/authorization before implementation. Barcode scanning, photos, expiration dates, fractional quantities, offline writes, advanced reporting, and push notifications remain later scope.

## List behavior follow-up (2026-11-06)

Authorized independently of milestone 9: inventory uses 25-item database pages with mobile/desktop navigation; households are capped at 25 categories including subcategories; activity retains the latest-50 notice and labels individual purchase receipts; every shopping tab displays all matching items, with Recibidos scoped to the latest confirmed purchase. Prior receipt records remain saved. See inventory/shopping guides for legacy receipt limitations and verification.

Six-month retention follow-up authorized on 2026-11-06: TTL cleanup for movements, received shopping items, invitations, and duplicate-request records; 24-hour versioned command expiration prevents replay after deduplication cleanup. Pending/purchased items and saved inventory remain. Existing saved databases require the documented [retention rollout/backfill](data-retention.md); test runs do not perform that maintenance. This does not start milestone 9.

Product-name uniqueness authorized in the same follow-up: household-scoped, case-insensitive names across active and archived products; protected creation/edit/bulk commands plus a database unique index. Existing duplicates require review before installing the index; the read-only maintenance report does not alter products or stock.

Bulk duplicate handling refined on 2026-11-06: accept unique new rows, omit existing/archived names and repeated rows, and show added/omitted counts after success. All-duplicate submissions succeed without stock changes; replayed requests retain their original counts. The user also requested 61 clearly labeled pagination products in the saved local household; production was not seeded.
