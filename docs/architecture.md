# Architecture

## Application and current deployment

One Next.js App Router repository contains the Spanish frontend and backend. Server Components fetch authorized data; Server Actions perform mutations. Small client components own forms, session interactions, stock controls, dialogs/navigation, and refresh behavior. No independently deployed API is required. The NextAuth endpoint lives at `app/api/auth/[...nextauth]/route.ts`.

The current stack is Next.js 16.4.5, React 19.2.4, TypeScript 5.9.3, Tailwind 4.3.4, Mongoose 9.12.0, and NextAuth 4.24.15. Node 22 is pinned and builds use Webpack. These versions include the deployment security updates; `package.json` and the lockfile are authoritative. Production runs on Vercel Hobby in iad1, near the separate Atlas Free/M0 cluster in AWS us-east-1. Resend sends verification, recovery, and invitation emails. See [deployment](deployment.md).

Milestones 1–8 are complete. Production started with fresh accounts by user choice; local household data was not migrated. Protected hosted preview deployment is explicitly deferred. See the [implementation plan](implementation-plan.md) for current scope and [history](history/implementation-notes.md) for superseded checkpoints.

## Routing and identity

`/` and `/sign-in` share the server-rendered authentication layout with welcome content and separate form components. Signed-in users opening either route redirect to `/inventory`. Registration authenticates immediately; server guards send accounts needing verification or household setup to `/household`. Personal `/account` settings and sign-out are available before verification. A pending invitation survives registration/sign-in and resumes through explicit acceptance, without creating another household.

NextAuth uses credentials, encrypted JWT session cookies, Node scrypt password hashes, and app-specific cookie names. Current user/session version and verification are read from MongoDB for protected access. Password reset increments the session version, invalidating old sessions. Verification/recovery tokens are hashed, expire explicitly, and are consumed only by form submissions. MongoDB-backed rate limits are shared across workers. Google OAuth is not enabled. See [accounts](accounts.md).

Household ownership comes from `Household.ownerId`; every member, including the owner, has a Membership. Roles are derived server-side, never trusted from a form or JWT. Every shared query and write checks verified identity and current membership. Removing a member revokes subsequent access while preserving their account and historical activity. Cross-document writes also validate household-scoped references inside the transaction; model schemas are not foreign-key or permission enforcement.

Verified members manage inventory and shopping. Only the owner manages invitations, removes members, and renames the household. Renaming uses the existing transactional access guard to verify the current session, verified account, ownership, and membership before saving the shared name. Household deletion, member-initiated leaving, ownership transfer, and account deletion are not implemented; owner departure must not be added without an ownership resolution. A user belongs to one household in the current UI/workflow. See [family sharing](family-sharing.md).

## Persistence and integrity

The ten Mongoose models are:

- User: identity, password/token hashes, verified email, session and household revisions.
- Household and Membership: ownership and current household access.
- Invitation: email-bound, hashed single-use token, expiry, delivery/state.
- Category: household and optional same-household parent, without cycles.
- Product: household, case-insensitive unique name (including archived products), category, unit, nonnegative integer quantity, warning threshold, revision, archive state.
- StockMovement: author, before/after quantities, delta, reason, request ID, optional undo reference.
- ShoppingItem: optional product link, snapshot name/unit, quantity, purchased/received state, revision, receipt batch ID/time/movement, and received-item expiration.
- AuthRateLimit: shared request budgets with TTL cleanup.
- InventoryRequest: durable mutation fingerprint and result for retry deduplication.

A lazy cached connection opens only when needed. Production requires an explicit URI/database and disables automatic index creation. Maintenance commands call `initializeDatabase` from the actual model definitions; index creation is not repeated on every request.

Transactional authorization locks user/household revisions to serialize creation, invitation acceptance, membership removal, and shared writes. Product revisions reject stale metadata edits and absolute counted corrections. Conditional atomic deltas enforce nonnegative safe integers. Stock and activity commit together. Undo appends one compensating movement against current stock, preserving later changes. `InventoryRequest` retains fingerprints/results for six months, including no-op requests. Versioned commands expire after 24 hours; retries recheck freshness and current permission. Legacy IDs can only return an existing matching result. See [data retention](data-retention.md).

Default categories initialize transactionally once per household, preserving existing equivalents and later user edits/deletions, within the 25-category household cap. Inline category creation and product creation share the transaction.

## Inventory and shopping boundaries

Inventory server queries prioritize zero stock, then warning-threshold stock, then available stock before the 25-product page offset and limit. Archived browsing stays alphabetical. The client reconciles quantities by revision and updates labels immediately, while keeping row membership/order fixed during adjustments and for 1.5 seconds after all requests settle. Another press resets the timer; changing filters creates a fresh list. Product details and global inventory sections use URL-backed tabs. Activity filters and six-month retention apply before the 50-movement limit. Purchase receipts are labeled individually. Bulk product creation skips existing/archived names and repeated rows, storing added/omitted counts for consistent retry feedback.

Shopping has Pending, Purchased, and Received views without item pagination. Pending and Purchased retain all matching items; Received selects only the latest unexpired confirmed purchase before applying search. Inline quantities save atomically with the purchase check, without changing stock. Explicit batch receipt pins reviewed IDs/revisions/quantities and updates linked stock, activity, and receipt history in one transaction; one conflict rolls everything back. Custom entries become received without creating inventory products. Deterministic per-item movement IDs and retained request results prevent duplicate receipts. A received shopping record remains historical if its stock movement is later undone. See [inventory](inventory.md) and [shopping](shopping.md).

Clients preserve request IDs/data for uncertain outcomes, disable conflicting controls, and expose retry/error states. Focus/online/30-second refresh runs only while visible/online and pauses for dirty, pending, or uncertain forms. The app does not implement offline writes or instant push synchronization.

Server errors use a shared allowlisted JSON logger with operation names, safe technical fields, and opaque references in unexpected action feedback. The Next.js instrumentation hook captures unhandled server failures. See [error logging](error-logging.md) for coverage and data exclusions; browser-only exceptions need separate reporting.

## Environments and operations

- Local: `.env.local`, `grocery_list`, replica `grocery-rs`, port 27018, existing native `.local/mongo` data or the separate Docker volume. Never replace the running saved instance with an empty test database.
- Tests: unit tests need no database; integration tests hard-code the local replica and create/drop only generated disposable names, ignoring Atlas/app target credentials. Browser fixtures use a separate process on port 27019 with disposable data and email disabled.
- Atlas maintenance: ignored `.env.atlas.local` with explicit target configuration; restricted maintenance credentials differ from app credentials. Preparation/inspection verify required indexes and transactions. Backup/recovery checks archive/document digests and refuses source/nonempty recovery targets. See [hosted database](hosted-database.md).
- Hosted app: Production-only private environment settings use `lista-production`/`grocery_list_production`, a unique hosted session secret, and the canonical HTTPS URL. Preview database/user isolation is prepared but hosted previews are deferred. No Scorecast secrets/data are reused.

Email URLs use the configured `NEXTAUTH_URL`, never an incoming Host header. The production origin is `https://lista-de-compras-beta-eight.vercel.app`. Local email links remain local; a phone's localhost is not the development Mac. Atlas network access permits Vercel Hobby's dynamic egress using the user-configured project IP entry, with database-specific authentication still enforced. Paid backups are disabled; the tested manual backup process is not scheduled automatically.

## Shared branding and UI

`lib/brand.ts` owns the visible app name/tagline. `Brand`, `AppHeader`, and `AppFooter` are shared across routes. `styles/theme.json` and `styles/basket.json` generate CSS variables, favicon, and the inline email PNG; do not edit generated assets directly. Manrope is bundled locally through `next/font/local`, without a Google font request. Tailwind and descriptive shared classes define compact responsive surfaces, controls, status text, and reduced-motion-aware overlays.

The single branded transactional-email template provides escaped HTML and plain text, green actions, and an attached CID basket. Email uses its own compatible font stack instead of unresolved web variables. See [UI standards](ui-standards.md) and [font license/source](../app/fonts/README.md).
