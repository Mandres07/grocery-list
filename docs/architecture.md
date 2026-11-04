# Architecture

## Application

One Next.js App Router repository contains the frontend and backend. React and Tailwind provide the mobile-first Spanish interface; server-side services and API routes will enforce access and inventory rules. Vercel hosts the app; MongoDB Atlas stores data; Resend sends transactional email. Do not introduce an independently deployed API without a demonstrated need.

The initial versions match the installed Scorecast stack: Next.js 16.2.9, React 19.2.4, Tailwind 4.3.1, and strict TypeScript. Webpack matches Scorecast and avoids introducing a bundler difference at setup. Reassess supported versions before public deployment.

## Current checkpoint boundaries

The root page is a Server Component. Only `InventoryPreview` requires client state. Sample quantities stay in memory; no local storage, authentication, or real mutations are wired into the UI. The UI explicitly discloses that the example resets and is not shared.

Milestone 2 adds Mongoose models, a lazy cached database connection, current-membership/owner guards, household-scoped product/category reference checks, a category ancestry guard, and isolated local verification tests. The app opens no database connection at module import time. Docker Compose configures a loopback-only single-node replica set at port 27018, separate from Scorecast. Native MongoDB can use the same connection settings; see `local-database.md`.

Household ownership has a single source of truth: `Household.ownerId`. Every member, including the owner, has a Membership; the role is derived rather than accepted from a client-provided field. Future session-authenticated routes must invoke access guards. Cross-document writes must call reference guards in their transaction; schemas alone do not act as foreign-key or authorization enforcement.

The integration verification suite always uses the fixed local endpoint and a generated disposable database, ignoring application database credentials. Production connection setup requires an explicit URI and database name. Production index provisioning will call the provided `initializeDatabase` helper during deployment/maintenance, not on every request.

## Planned ownership model

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
