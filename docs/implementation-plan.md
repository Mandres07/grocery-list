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

Status: implemented and approved by the user for local commit. Real-email/device review remains a manual follow-up. Includes saved products/categories/subcategories, search and filters, atomic stock changes, optimistic corrections/edits, archive/restore, activity, compensating undo, retained request deduplication, and refresh/offline states. Stops here before milestone 6.

Also implements the user's onboarding update: immediate sign-in after registration, signed-in access before verification with shared features restricted, root/login redirects, a shared account menu and personal account page, and invitation continuation after verification without another sign-in. The original left welcome column remains; the right column contains registration. The sample inventory panel was removed.

Verification: `npm run check` passes lint, TypeScript, 57 unit tests and production build; `npm run db:check` passes 48 local integration checks. Review steps are in `docs/inventory.md`. Unit checks cover authentication boundaries, landing content/redirects, POST credential forms, input validation and category navigation. Disposable database checks cover concurrent stock/undo, deduplication including zero-change requests, rollback, revision conflicts, archive, isolation and removed members. Browser checks use a separate temporary database and no real email delivery: signup signs in before verification, root redirects, direct inventory is restricted, verification returns to the invitation, acceptance joins the existing household, products persist and share across accounts, and offline retry applies once. Real email/device review remains for the user. No new provider setup is needed.

- Product creation/editing/archiving, categories and optional subcategories, search, and filters.
- Whole-unit stock adjustment, absolute correction, low-stock thresholds, activity, and safe undo.
- Atomic nonnegative quantities, idempotent requests, transactional activity, and conflict handling.
- Refresh on focus and periodically; clear loading, empty, error, offline, and success states.

Review: manage real development products from two accounts/devices; test concurrent updates and low-stock behavior.

## Post-milestone 5 — UI and navigation refinement

Status: complete and authorized for local commit. Keeps milestone 6 pending.

- Compact shared controls, gently squared surfaces, divided inventory/member rows, and secondary sections in disclosures.
- One persistent green header with inline desktop links, a dismissible mobile menu, and page content aligned to the same width and gutters.
- Shared two-column registration/sign-in route layout with native URLs and browser history, reusable password visibility controls, and supporting benefits below mobile forms.
- Green primary actions and major elements, restrained terracotta details, shared web/email tokens, and readable status labels.
- Confirmed stock quantities include server revisions so stale responses and retries cannot overwrite newer counts; a header account lookup failure leaves page error screens renderable without weakening page authorization.

Verification: `npm run check` passes lint, TypeScript, 82 unit tests, and the production build. `npm run db:check` passes all 48 integration checks against an isolated temporary local replica set. Browser review covered mobile/desktop layouts, shared welcome/header persistence, Back/Forward, direct auth URLs, sign-in success/failure, account redirects, header/page alignment, mobile menu dismissal, touch targets, and green action/hover colors. Final stock checks confirmed a concurrent change from 3 to 10 followed by +1 displays 11, and a saved adjustment with a lost response retries once and remains at 12 after reload. All browser household data was disposable and outbound email was disabled. Real-device and recipient email-client review remain manual follow-ups.

## Inventory workspace refinement

Status: implemented for user review; milestone 6 remains pending.

Inventory now has separate Products, Categories, and Activity URLs with shared section navigation. Product creation uses a compact native modal and supports inline category/subcategory creation in the same transaction as the product. Category management matches Products with a header create action, shared search/filter card, compact rows, and create/edit/delete dialogs. Standalone account and inventory data-entry forms share a card surface; forms embedded in existing cards or dialogs reuse that surface. Eight basic categories are added atomically to new households and initialized once for existing households, preserving equivalent category IDs and later renames/deletions. Confirmed inventory form writes reload the current server view and filters; stock +/- keeps its direct confirmed-state updates.

Verification: `npm run check` passes lint, TypeScript, 91 unit tests, and production build. All 57 disposable-database integration checks pass, including category defaults, concurrent initialization/creation, permissions, retry deduplication, rollback, and edit revision conflicts. Browser checks cover modal focus/Escape, validation draft retention, inline subcategories, lost-response retry protection, one product/stock movement per request, category create/edit/delete, category search/parent filters, consistent form card styling, section navigation/history, low-stock filters, and modal bounds/no overflow at 320, 393, and 1440 px. Browser and database checks used disposable data; outbound email was disabled. Real phone/browser keyboard review remains a manual follow-up.

Review: restart the Next.js dev server once after the household schema update. Open `/inventory`, create a product and an inline category, inspect Categories and Activity, and try filters at phone and desktop widths. No new provider or hosting setup is required. The development MongoDB instance is running on its original data directory and port; separate test processes use another port.

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

## Inventory landing and mobile add action

Status: implemented for review; milestone 6 remains pending.

Inventory is now the signed-in entry point, including login, active-session auth URLs, household creation, invitation acceptance, and successful verification. Existing verification and household setup requirements remain enforced. The product creation trigger floats on compact screens and stays labeled in the header on wider screens, reusing the shared dialog and token-based styles. Search and filters remain above the list.

Verification: `npm run check` passes lint, TypeScript, 87 unit tests, and production build. Browser checks with isolated fixtures confirm successful login and active-session redirects to inventory, a single responsive add trigger, modal opening/Escape, and no horizontal overflow at 320, 393, and 1280 px. No persistence logic changed in this refinement.

## Compact inventory and modal filtering

Status: implemented for user review; milestone 6 remains pending.

Inventory keeps the desktop table and uses compact divided mobile rows with combined category/unit metadata. Products and Categories now share a ListFilters modal opened by a header icon, with an active-filter indicator, URL-backed search/filtering, clearing, and cancellation. Routine stock feedback remains in a screen-reader live region without consuming row space; errors and retry actions remain visible. Shared tokens and 44px touch targets are preserved.

Verification: `npm run check` passes lint, TypeScript, 92 unit tests, and production build. Browser checks cover search submission, active-filter defaults, cancelled drafts, clearing, low-stock filters, row sizing and stock-update stability at 320/393/1440 px. Fixtures use a separate temporary MongoDB instance and disabled email delivery.

## Account and household UI refinement

Status: implemented for user review; milestone 6 remains pending.

Mi hogar and Mi cuenta now share SectionPanel, responsive panel-grid layout, accent icon styling, and compact semantic detail rows. Household details and family actions are grouped with owner/member visibility retained; new-account creation and invitation guidance remain available. Account settings group profile, email verification status, and password recovery; the editable name is prefilled and forms reuse their containing card via embedded mode. Removed implementation-stage copy from the household screen.

Verification: `npm run check` passes lint, TypeScript, 97 unit tests, and production build. Focused tests cover prefilled name, single form surface, verification actions, owner/member family action visibility, and household setup guidance. Browser checks cover 320/393/1440 px layouts with no horizontal overflow, plus saving and reloading a changed profile name on an isolated test account.

## Unified visual design refresh

Status: implemented for review; milestone 6 remains pending.

The shared visual system now uses a system UI font stack, a soft neutral canvas, white collection surfaces, stronger title hierarchy, restrained elevation, and green primary actions with small terracotta accents. Palette, sizes, font stacks, and shadow values live in theme.json and flow into generated CSS and email branding. Route-aware navigation retains a small client boundary and exposes active state on desktop/mobile; inventory subnavigation uses compact segmented tabs. Inventory remains a table with a single bounded quantity stepper; mobile names retain full accessible text while showing at most two lines and prioritize units in metadata. Category actions are labeled icons, and activity rows group movement amounts, actor, date, and a quieter undo action. Settings keep comfortable field widths, and dialogs share the refreshed tokens. Email font values are HTML-escaped to preserve quoted family names in style attributes.

Verification: `npm run check` passes lint, TypeScript, 104 unit tests, and production build. Browser checks cover all five main screens at 320/393/1440 px, no horizontal overflow, stock touch targets and stable updates, modal search/clear, mobile navigation dismissal, category create/edit/delete, and stock undo. Test data used only a separate temporary MongoDB instance with email disabled. Physical-device and email-client rendering remain manual review items.

## Shared overlay motion

Status: implemented for user review; milestone 6 remains pending.

Dialogs/backdrops use a 220ms fade and gentle rise; disclosure menus use a 160ms fade and slide. Shared theme motion tokens drive native CSS entry/exit transitions without new JavaScript state or timers. Reduced-motion preferences disable animation, and unsupported browsers retain native instant visibility.

Verification: npm run check passes lint, TypeScript, 104 unit tests, and production build. Browser checks inspect dialog/backdrop entry and exit keyframes, sample menu opacity through opening/closing, and confirm Escape, outside dismissal, focus restoration, reduced-motion instant visibility, and rapid desktop reopen/close. Fixtures use a separate temporary database with email disabled.

## Animated menu and add-action icons

Status: implemented for user review; milestone 6 remains pending.

The hamburger now morphs its three strokes into an X and reverses on closure. Shared add-action plus glyphs rotate into an X with dialog state; on mobile the rotated action is a usable close button inside the native dialog layer at the same viewport position. It honors pending/uncertain-write dismissal guards. Motion reuses shared durations/easing and the cross-angle token, including reduced-motion support. Modal content carries the entrance translation so fixed controls remain viewport-anchored.

Verification: npm run check passes lint, TypeScript, 106 unit tests, and production build. Browser checks inspect stroke/rotation keyframes and reverse states, verify clickable floating X controls at 320/393 px for Products/Categories, desktop rotation/close behavior, reduced-motion instant states, and a pending category save that cannot be dismissed before completion. Data is disposable on the isolated test MongoDB instance.

## Product detail sections

Status: implemented for user review; milestone 6 remains pending.

The single-product route now shares SectionNavigation with inventory. Detalles, Existencias, Actividad, and Opciones render one focused section at a time beneath the persistent product name/quantity. Normal query-based links support bookmarks, direct URLs, and browser history. The shared small client navigation boundary keeps the active tab visible when overflowing or resizing, without moving page scroll/focus. Data fetching and panels stay server-side and load category/activity data only for the selected section. Existing household/product/revision fields and write guards remain in place; archived details/stock are read-only with restoration links.

Verification: npm run check passes lint, TypeScript, 115 unit tests, and production build. Browser checks cover independent panels, selected-tab visibility and no overflow at 320/393/1440 px, Back/Forward, profile-independent product edits, quantity correction, scoped activity, archive/read-only/restoration flows, and preserving the active tab after saves. Data uses the separate disposable test database.

## Activity search and filtering

Status: implemented for review; milestone 6 remains pending.

Global Activity now uses the shared header filter modal with optional product name, responsible-person name, and inclusive Panama-time date range. URL-backed filters combine and are applied before the 50-row query limit. Names are literal/case-insensitive, household access remains enforced, archived products/former actors remain searchable, and undo status accounts for movements outside the filtered window. Invalid dates/ranges show validation feedback; filtered empty states are explicit.

Verification: npm run check passes lint, TypeScript, 128 unit tests, and production build. All 63 disposable-database integration checks pass, including pre-limit filtering, local date boundaries, literal regex text, household permissions, archived/former-member history, and undo eligibility. Browser checks cover combined searches, matching people/date values, retained values, clearing, Back navigation, invalid ranges, empty results, and modal sizing at 320/393/1440 px using a separate test database.

### Inventory buying priority refinement

Inventory opens with zero-stock products followed by those at or below their warning threshold, with visible “Sin existencias” / “Por reponer” badges and token-based accent markers. Database ordering precedes the 100-product limit. The low-stock filter includes zero quantities without thresholds, including legacy records. Archived views stay alphabetical. Confirmed stock changes update priority, badges, filtered membership, and counts immediately using revision reconciliation.

Verification: npm run check passes lint, TypeScript, 136 unit tests, and production build. All 67 disposable-database integration checks pass, including household isolation, ordering before the limit, replenishment/consumption, archived exclusion, and missing thresholds.

Browser verification with isolated fixtures passes at 320, 393, and 1440 px: initial priority, zero-to-low/available transitions, threshold equality, consumption to zero, and immediate filtered removal/count updates after replenishment.

### Manrope typography refinement

The app now bundles the official Manrope variable font and its SIL OFL license through next/font/local. Shared sans/display theme tokens reference the root font variable, with 700 headings/product names, 600 controls, and regular body text. Transactional email uses a plain compatible family stack with system fallbacks instead of unresolved web CSS variables. No external font service is contacted during build or browsing.

Verification: npm run check passes lint, TypeScript, 140 tests, and production build. Chrome confirms the bundled Manrope glyphs render and no Google font requests occur. Public registration/login layouts fit at 320, 412, and 1440 px, with Spanish text reviewed. Authenticated inventory was not re-tested in this typography-only pass.

### Milestone check-in review

Reviewed the accumulated inventory/UI refinement on 2026-11-04. Restored the existing onboarding, password concealment/POST, shared header, verification-menu, and authentication-layout regression coverage while adapting redirects to inventory and mocking the local font loader. The final suite contains 147 unit tests and 67 disposable-database integration checks. Lint, TypeScript, and production build pass. Earlier browser checks cover isolated inventory/category/activity workflows; final typography and header refinements were checked on public routes and static responsive previews. Real email delivery and household multi-device use remain user review activities. Milestone 6 (shopping lists) has not been started.
