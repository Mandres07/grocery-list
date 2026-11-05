<div align="center">

# 🧺 Lista de Compras

### Un hogar. Un equipo.

A mobile-first app for shared household inventory and grocery shopping.<br />
Know what you have, see what you need, and record what arrives home.

![Next.js](https://img.shields.io/badge/Next.js-16-253d32?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-375e46?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-375e46?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-375e46?style=flat-square&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-Deployed-375e46?style=flat-square)

[Open the app](https://lista-de-compras-beta-eight.vercel.app) · [Get started](#-get-started) · [Roadmap](#-roadmap) · [Documentation](#-documentation)

</div>

---

## 🌿 Organize your household

- **Individual accounts:** registration signs you in immediately; email verification unlocks shared features. Password recovery invalidates old sessions.
- **A shared home:** owner-managed invitations and membership checks protect household data.
- **Inventory first:** `/inventory` is the signed-in landing page, with products, categories/subcategories, search, and filters in shared dialogs.
- **Buying priorities:** empty products appear first, followed by those at their warning threshold. Quantities and badges update immediately; rows wait 1.5 seconds after adjustments settle before reordering or leaving a filtered list.
- **Traceable stock:** whole-unit adjustments, counted corrections, activity filters, safe undo, and archive/restore.
- **Shared shopping:** `/shopping` has Pendientes, Comprados, and Recibidos. Edit quantities inline and check items as purchased; one receipt confirmation updates linked stock atomically. Purchase checks alone never change inventory.
- **Consistent Spanish UI:** locally bundled Manrope, green primary actions, restrained terracotta accents, compact rows, and shared web/email branding.

Real inventory stays household-scoped; no sample products are added to accounts. Updates refresh on focus and periodically while visible, pausing for dirty/pending/uncertain forms. Offline writes are not queued.

Production runs on **Vercel Hobby** with **MongoDB Atlas Free/M0 in AWS us-east-1** and **Resend**. Registration, verification email/link, household creation, shared use, and password recovery were confirmed live. Production started with fresh accounts; existing local data was not migrated. Hosted preview deployment is deferred by user choice. Manual backup/recovery is tested; automatic backups are not configured.

## 🚀 Get started

**Requirements:** Node.js **22.x**, npm, and a MongoDB replica set. Database integration/recovery checks also require MongoDB Database Tools (`mongodump` and `mongorestore`) on the host. Docker Desktop is optional if native MongoDB is available.

```bash
git clone https://github.com/Mandres07/grocery-list.git
cd grocery-list
npm ci
cp -n .env.example .env.local
```

The copy command preserves an existing `.env.local`. For an existing checkout, keep its credentials and saved database directory.

### 🍃 Start the local database

Use **one** of the [local database guide](docs/local-database.md)'s options. With Docker Desktop running and no native database already using port 27018:

```bash
npm run db:up
```

For this workstation's existing native database, start `mongod` using its saved `.local/mongo` directory as documented in that guide. Do not replace it with an empty test database or run Docker on the same port. The app database is `grocery_list`, replica set `grocery-rs`, port **27018**.

### 👤 Configure accounts and email

Edit the ignored `.env.local` using [Accounts and email](docs/accounts.md): generate a unique `NEXTAUTH_SECRET` and set this app's Resend Sending key. The approved sender is `Lista de Compras <no-reply@updates.finalscore.win>`. Never copy Scorecast credentials. Local development requires no Atlas or Vercel credentials.

```bash
npm run dev
```

Open **[localhost:3001](http://localhost:3001)**. Port 3001 keeps this app separate from Scorecast on port 3000. If testing another port, change `NEXTAUTH_URL` to match; email links and browser origin must agree.

Register at `/`; `/register` is a compatibility redirect. Signed-in `/` and `/sign-in` visits lead to inventory. Accounts awaiting verification or household setup are redirected to `/household`; an invitation continues into its existing household. Personal account settings and sign-out remain available before verification.

### ☁️ Hosted operations

See [Hosted database](docs/hosted-database.md) and [Deployment](docs/deployment.md). Private maintenance settings use `.env.atlas.local`; generated Vercel imports use `.env.vercel.production.local` and, only if preview is enabled later, `.env.vercel.preview.local`. These files are ignored and separate from `.env.local`. Keep production credentials scoped to Production only.

## 🛠️ Built with

| Layer | Current implementation |
| --- | --- |
| Application | Next.js 16.4.5 App Router · React 19.2.4 · TypeScript 5.9.3 · Webpack |
| Styling | Tailwind CSS 4.3.4 · shared theme tokens · local Manrope font |
| Persistence | Mongoose 9.12.0 · MongoDB transactions · household-scoped models |
| Authentication | NextAuth 4.24.15 · credentials/JWT sessions · verified accounts |
| Email | Resend verification, recovery, and invitations · shared branded template |
| Hosting | Vercel Hobby · Node 22 · iad1 · isolated Atlas production/preview database users |
| Validation | ESLint · TypeScript · Vitest 4.1.12 · production build · disposable database tests |

Frontend and backend share one repository. Current membership, transaction guards, product revisions, and retained request IDs protect persistent changes. Versions above reflect the deployment preparation on 2026-11-04; [package.json](package.json) and the lockfile are authoritative.

## 🧭 Roadmap

We stop after each milestone for testing and review. The [implementation plan](docs/implementation-plan.md) tracks current status; [historical notes](docs/history/implementation-notes.md) preserve earlier checkpoints and their test counts.

| Milestone | Focus | Status |
| --- | --- | --- |
| **01–02** | Foundation, models, local replica set, access helpers | Complete |
| **03–04** | Accounts, email, household creation, family invitations | Complete |
| **05** | Shared inventory, categories, stock, activity, responsive UI | Complete |
| **06** | Shared shopping and atomic batch receipt | Complete |
| **07** | Atlas isolation, index preparation, export/recovery | Complete |
| **08** | Vercel and production email | Complete; preview deployment deferred |
| **09** | Release checks and Home Screen setup | Not started |

Each member has their own account. Verified household members manage inventory and shopping; the owner additionally manages invitations and membership. Household renaming/deletion, member-initiated leaving, ownership transfer, and multiple-household navigation are not implemented. Barcode scanning, photos, expiry dates, fractional quantities, and offline writes are also deferred.

## ✅ Development and maintenance commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development on port 3001 |
| `npm run check` | Lint, type checking, unit tests, and production build |
| `npm test` / `npm run test:watch` | Database-independent tests / watch mode |
| `npm run db:up` / `npm run db:down` | Start/stop the Docker replica set, retaining its data |
| `npm run db:check` | Local disposable integration tests, including export/recovery |
| `npm run db:prepare` / `npm run db:inspect` | Explicit maintenance target: prepare indexes / inspect indexes and transactions |
| `npm run db:backup -- --writes-paused` | Export the configured database after pausing its writers |
| `npm run db:restore-test -- <archive>` | Restore into a separate empty recovery database and verify checksums/indexes |
| `npm run db:verify-access` | Check preview/production app-user isolation; removes its diagnostic collections |
| `npm run tokens` | Regenerate CSS/icon/email branding from theme sources |
| `npm run start` | Serve a completed production build on port 3001 |

`db:check` always uses generated disposable databases on the local replica, not Atlas or real application data. Maintenance commands load `.env.atlas.local` explicitly. The latest completed application verification on 2026-11-04 passed **208 unit tests**, **87 integration tests**, lint, types, and build, with **zero npm audit findings**. These are recorded results, not a substitute for rerunning checks after code or dependency changes.

## 📚 Documentation

| Location | Contents |
| --- | --- |
| [Implementation plan](docs/implementation-plan.md) | Current milestones, scope decisions, and next review |
| [Architecture](docs/architecture.md) | Implemented boundaries, authorization, persistence, environments |
| [Local database](docs/local-database.md) | Startup, saved data, tools, verification, troubleshooting |
| [Accounts and email](docs/accounts.md) | Local credentials, verification/recovery, hosted URLs |
| [Family sharing](docs/family-sharing.md) | Invitations, membership, and two-account review |
| [Inventory](docs/inventory.md) | Products, priority ordering, stock integrity, and activity |
| [Shopping](docs/shopping.md) | Purchase checks, inline quantities, atomic receipt, history |
| [Hosted database](docs/hosted-database.md) | Atlas users, indexes, backup/recovery, hosted verification |
| [Deployment](docs/deployment.md) | Vercel configuration, assigned domain, production verification |
| [UI standards](docs/ui-standards.md) | Reusable components, tokens, typography, compact controls |
| [Historical implementation notes](docs/history/implementation-notes.md) | Earlier milestone snapshots and superseded decisions |
| [app/](app/) · [components/](components/) · [lib/](lib/) · [models/](models/) | Routes, shared UI, services, and schemas |
| [styles/theme.json](styles/theme.json) · [styles/tokens.css](styles/tokens.css) | Editable design tokens and Tailwind mapping |

## 📄 License

[MIT](LICENSE) · Mario Andrés Morales
