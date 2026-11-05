# Architecture

## Application

One Next.js App Router repository contains the frontend and backend. React and Tailwind provide the mobile-first Spanish interface; server-side services and API routes will enforce access and inventory rules. Vercel hosts the app; MongoDB Atlas stores data; Resend sends transactional email. Do not introduce an independently deployed API without a demonstrated need.

The initial versions match the installed Scorecast stack: Next.js 16.2.9, React 19.2.4, Tailwind 4.3.1, and strict TypeScript. Webpack matches Scorecast and avoids introducing a bundler difference at setup. Reassess supported versions before public deployment.

## Current checkpoint boundaries

The root page is a Server Component with the original welcome column beside a registration form. Signed-in users redirect to their household. Registration authenticates through NextAuth immediately; unverified users can use personal account pages but cannot access household or inventory features. The shared header includes a native disclosure menu with account navigation and sign-out. Sample inventory has been removed. See `accounts.md` and `inventory.md`.

Milestone 2 adds Mongoose models, a lazy cached database connection, current-membership/owner guards, household-scoped product/category reference checks, a category ancestry guard, and isolated local verification tests. The app opens no database connection at module import time. Docker Compose configures a loopback-only single-node replica set at port 27018, separate from Scorecast. Native MongoDB can use the same connection settings; see `local-database.md`.

Household ownership has a single source of truth: `Household.ownerId`. Every member, including the owner, has a Membership; the role is derived rather than accepted from a client-provided field. Future session-authenticated routes must invoke access guards. Cross-document writes must call reference guards in their transaction; schemas alone do not act as foreign-key or authorization enforcement.

The integration verification suite always uses the fixed local endpoint and a generated disposable database, ignoring application database credentials. Production connection setup requires an explicit URI and database name. Production index provisioning will call the provided `initializeDatabase` helper during deployment/maintenance, not on every request.

## Planned ownership model

Milestone 3 implements verified email/password accounts using NextAuth JWT sessions and Node scrypt, following Scorecast's approach. Password resets invalidate previous sessions through a database session version checked on every protected request. Verification/recovery tokens are hashed fields on User and are atomically consumed with explicit expiry. MongoDB-backed attempt budgets are shared between workers. Email delivery uses Resend's REST API with server-side settings and the agreed sending domain; no Scorecast secrets are reused. See `accounts.md`.

Registration does not create a household. Authenticated household creation locks the current user document in a transaction and writes the household and owner membership together. The household page reads current membership and calls the existing access guard. Server Actions perform mutations; form status, NextAuth browser interactions, stock controls, and refresh behavior use small client components. Saved inventory is implemented in milestone 5.

Users have individual accounts. A household owns its inventory and shopping list, and has one owner plus members. Registration leads to creating a household or accepting an invitation, without silently creating an extra household for an invitee.

Both owner and members can manage products, categories, quantities, and shopping items. Only the owner can invite, revoke invitations, remove members, rename, or delete the household. A member can leave. Owner departure or account deletion must not orphan the household: require an explicit ownership resolution first.

Every query and mutation must be authorized using the signed-in user's current membership, never a client-provided role or household ID alone. Removal revokes access on subsequent requests even if the login session is still valid. Preserve shared inventory and historical activity after member removal.

## Planned data

- User: individual identity and verified email.
- Household: household name and owner.
- Membership: unique household/user access relationship.
- Invitation: household, normalized recipient email, hashed single-use token, expiration, and state.
- Category: household and optional parent; validate same-household parents and disallow cycles.
- Product: household, name, unit, category, nonnegative integer quantity, threshold, and archive state.
- Stock movement: household, product, actor, delta, time, and unique request identifier.
- Shopping item: household, optional product, custom description, quantity, and purchase state.

## Planned inventory integrity

Use atomic deltas for +/−, conditional guards against negative quantities, request deduplication, and transactions to save quantity changes and activity together. Use concurrency checks for absolute corrections. Undo is a compensating movement, not restoration of an old quantity. Use a separate local Docker replica set and port so transactional tests can run alongside Scorecast.

Initially refresh data on focus and periodically while visible; communicate offline failures. Do not promise offline stock writes or instantaneous live synchronization. Shopping completion and stock receipt are separate actions; stock receipt must not apply twice.

## Environments

Separate local, preview, and production data and credentials. Never reuse Scorecast application secrets or production data. Privileged database and email credentials stay server-side. Email links use a configured application URL, not an untrusted incoming Host header. Production onboarding must not require hand-editing database records.

## Family sharing and branding

Milestone 4 implements seven-day email-bound invitations with hashed single-use tokens, owner-only management, resend/revoke, and member removal. Server Actions obtain current identity; transactions recheck session version, verification, ownership and membership. Household revisions serialize permission changes; user revisions serialize household creation and invitation acceptance, preventing simultaneous membership in multiple households. Removal preserves accounts, inventory, and activity. An HttpOnly context cookie carries invitations through signup/sign-in. See `family-sharing.md`.

`lib/brand.ts` defines the Spanish app name; `Brand` shares the basket and name between headers. `styles/theme.json` provides color, font and size tokens to web and email. `npm run tokens` generates CSS variables, favicon and the inline email PNG from shared basket geometry, using sharp already supplied by Next.js. Dev/build regenerate these artifacts automatically. One action-email template creates HTML and plain text for verification, recovery, and invitations, escaping dynamic content.

## Saved inventory

Milestone 5 uses shared transactional authorization for family and inventory writes. User and household revisions serialize permission changes; product revisions reject stale metadata edits and absolute corrections. Conditional increments enforce nonnegative safe integers, and stock/activity commit together. Undo appends a single compensating movement. `InventoryRequest` stores a request fingerprint and result for durable deduplication, including zero-change operations. Archived products and historic actors remain traceable.

Server pages scope every read to a verified account's current household. Small client boundaries submit forms, adjust units, display offline/retry states and refresh on focus or every 30 visible seconds, pausing while a form is dirty. Mutation retries retain their request identifier and data; no offline writes are queued. See `inventory.md` for review steps and current UI limits.

## Hosted database operations

Milestone 7 adds explicitly configured maintenance commands using the application Mongoose models, isolated Atlas production/preview users and databases, and logical backup/recovery checks. Private maintenance settings live in ignored `.env.atlas.local`, separately from the local app. Preparation creates required indexes without removing existing data; inspection checks indexes and transactions. Recovery refuses source/nonempty targets and verifies checksums in a dedicated restore database. See `hosted-database.md` for setup instructions and the completed hosted verification record.
