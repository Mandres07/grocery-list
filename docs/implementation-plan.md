# Lista de Compras implementation plan

## Review agreement

Stop after every milestone. Present what changed, verification results, remaining limitations, and concrete review steps. Wait for the user's review before starting the next milestone. Account or provider steps that require the user's credentials are guided steps, not silently skipped work.

## Milestone 1 — Foundation and private repository

Status: foundation implemented; the user authorized proceeding to milestone 2. Local Git history and origin/main are now synchronized after merging the remote license commit.

Verification limits: lint, types, and production build passed. The execution environment rejected local server binds on port 3001, so HTTP/browser interaction and visual verification were left to the user. The user completed repository setup from their terminal. No external database or hosting resources were created.

- Next.js, React, TypeScript, Tailwind, ESLint, and reproducible lockfile.
- Warm cream/sage design tokens, Spanish home page, and clearly labeled interactive inventory sample.
- Local port 3001, ignored environment files, example configuration, and project documentation.
- Validate lint, types, production build, HTTP response, and browser layout if available.
- Initialize local Git and create/push the private GitHub repository where tools and authentication permit.

Review: open localhost:3001, try sample controls and reset, inspect phone/desktop layout and visual direction. No persistent data yet.

## Milestone 2 — Local database and household data foundation

Status: complete and approved for commit. Lint, TypeScript, 36 unit tests, and production build pass. The user ran the local replica-set verification from their terminal and confirmed all seven integration checks passed. This execution environment cannot connect to local MongoDB, so the live integration result is user-confirmed. Docker Compose is provided but its startup path remains unverified on this machine because Docker Desktop is missing. No real application data was seeded or modified.

- Configure MongoDB/Mongoose and a separate Docker replica set, port, and volume.
- Add User, Household, Membership, Invitation, Category, Product, StockMovement, and ShoppingItem models with validation and indexes.
- Define owner/member permissions and household scoping; validate database connection and meaningful model invariants.

Review: completed local database startup and development-only verification of isolation, indexes, transactions, and permissions. Registration and persistent inventory UI remain for subsequent milestones. Stop here until the user authorizes milestone 3.

## Milestone 3 — Registration and household creation

Status: implemented; the user confirmed actual email delivery and authorized milestone 4. Uses NextAuth credentials/JWT sessions (the same approach as Scorecast), a unique Lista de Compras secret and cookie names, and the user-approved `updates.finalscore.win` sending domain with a dedicated API key. See `docs/accounts.md` for setup and review.

Verification: `npm run check` passes (lint, TypeScript, 46 unit tests, production build). `npm run db:check` passes 18 local integration checks, using only a disposable database and mocked email delivery. Browser review covered the mobile registration and desktop sign-in layouts, unauthenticated household redirect, and malformed verification links. A full browser account flow with real email and phone review remains for the user after Resend configuration. NextAuth 4.24.15 avoids the audit findings in the older Scorecast patch; the audit still reports 30 findings in the existing dependency tree (including Next.js). Resolve those before public deployment; no broad dependency upgrade was included in this milestone.

- Email/password registration, verification, sign-in, sign-out, password reset, and recovery states.
- Set up Resend sending credentials, verified sender domain, and DNS before testing actual email delivery.
- Add optional Google sign-in if requested; configure its local callback for port 3001.
- After registration, choose create household or accept invitation; establish the creator as owner.
- Test authentication and household authorization behavior.

Review: create and verify an account, sign in, create a household, sign out, and reset a password. Review on a phone.

## Milestone 4 — Family invitations and access management

Status: implemented and approved by the user for local commit. Review with a second real account and the new email design in recipient mail clients remains a manual follow-up. Includes owner-only family management, seven-day invitations for new/existing verified accounts, resend cooldown and token replacement, revocation, member removal, current membership enforcement, and transactional concurrency controls. Registration/sign-in preserve invitation context in an HttpOnly cookie without automatically creating a household. No additional provider setup is required beyond milestone 3.

Also applied the requested Spanish branding: reusable brand header with basket, shared action-email template with inline PNG basket, and a single theme token source for CSS, email, and icon generation. Session, cookie, database, and repository identifiers retain their internal names to preserve sessions and saved data.

Verification: lint, TypeScript, 50 unit tests, production build, and 31 disposable local database integration checks pass. Browser checks use a separate disposable database with outbound email disabled and cover invitation → sign-in → acceptance → shared household, member denial at family management, and owner management. Branded email preview inspected locally at mobile size; actual rendering in recipient mail clients and delivery of the new invitation email remain for user review. See `docs/family-sharing.md`. Stop here before milestone 5.

- Owner-only Family management screen, invitations, resend/revoke, and member removal.
- Expiring single-use hashed tokens bound to a verified recipient email.
- Seamless acceptance for new and existing accounts, duplicate prevention, and clear invitation states.
- Enforce current membership server-side; prevent removed members from accessing shared data.
- Test expired/reused/revoked invitations, mismatched recipients, non-owner actions, and removed sessions.

Review: invite the spouse using a second account; accept the invitation; verify shared household access and owner-only management; remove and reinvite safely.

## Milestone 5 — Shared inventory

- Product creation/editing/archiving, categories and optional subcategories, search, and filters.
- Whole-unit stock adjustment, absolute correction, low-stock thresholds, activity, and safe undo.
- Atomic nonnegative quantities, idempotent requests, transactional activity, and conflict handling.
- Refresh on focus and periodically; clear loading, empty, error, offline, and success states.

Review: manage real development products from two accounts/devices; test concurrent updates and low-stock behavior.

## Milestone 6 — Shared grocery list

- Product-linked and custom shopping items, quantities, and purchased state.
- Add low-stock products to shopping list.
- Explicit confirmed stock receipt, deduplicated independently from purchase checkboxes.

Review: coordinate a sample shopping trip with both accounts and record received quantities once.

## Milestone 7 — Hosted database

- Create a dedicated Atlas project/cluster and isolated production/preview databases.
- Restricted database users, network access, server-only connection settings, and indexes.
- Choose a region near hosting and establish a tested export/restore process; verify actual tier backup options.

Review: confirm hosted development/test connectivity and recover a disposable backup without touching real household data.

## Milestone 8 — Hosting and production email

- Import GitHub repository into Vercel and configure separate preview/production environments.
- Set database, session, email, and optional OAuth credentials; use unique secrets.
- Set stable application URL, configure email links and OAuth callbacks, and redeploy.
- Validate remote registration, invitation acceptance, email delivery, access restrictions, and data persistence.

Review: open HTTPS URL on both phones and repeat the complete sharing flow with production accounts.

## Milestone 9 — Release and everyday use

- Run lint, types, tests for real behavior, and production build.
- Verify mobile/desktop accessibility, retries, concurrency, membership removal, and household isolation.
- Add app icons/Home Screen setup and document deployment/recovery.
- Enter a small real product set and collect the primary user's feedback.

Review: the spouse runs the everyday inventory/shopping workflow and requests refinements before broader scope.

## Later scope

Barcode scanning, photos, expiration dates, fractional measurements, offline writes, and advanced reporting remain deferred. Ownership transfer and multiple-household navigation require explicit product decisions before implementation.
