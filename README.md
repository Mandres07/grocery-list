<div align="center">

# 🧺 Lista de Compras

### A little less guessing. A little more home.

A mobile-first space for household inventory and grocery shopping.<br />
Know what you have, see what you need, and take care of home together.

![Next.js](https://img.shields.io/badge/Next.js-16-253d32?style=flat-square&logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-375e46?style=flat-square&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-375e46?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-375e46?style=flat-square&logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/Status-In_development-885126?style=flat-square)

[The idea](#-a-home-for-your-household-essentials) · [Get started](#-get-started) · [Roadmap](#-whats-next) · [Documentation](#-documentation)

</div>

---

## 🌿 A home for your household essentials

“Do we still have rice?” “How many bottles are left?” “Did someone already buy soap?”

Lista de Compras is being built to make those everyday questions easier. From pantry staples to cleaning supplies, the goal is one shared place to track what is at home and what needs to go on the shopping list.

| 🥫 Know your stock | 🛒 Shop together | 🏡 Share a household |
| --- | --- | --- |
| Organize products and adjust quantities with a tap. | Share shopping needs and record what arrives home. | Use individual accounts with owner-managed invitations. |

> 🚧 **Work in progress.** Accounts, household creation, and owner-managed family invitations are implemented. Account email delivery was confirmed by the user. Family sharing needs user review; saved inventory screens and shared shopping are upcoming milestones.

## ✨ Try the design preview

- **Warm, mobile-first styling** — cream backgrounds, sage accents, readable typography.
- **Spanish interface** — friendly copy for everyday household use.
- **Tap to adjust** — working **+ / −** controls on three sample products.
- **Low-stock feedback** — labels and summary counts respond to quantity changes.
- **Accessible foundations** — semantic HTML, visible keyboard focus, and generous touch targets.

Sample changes stay in memory, reset on reload, and are not shared. The preview runs without a database or account.

## 🚀 Get started

**Requirements:** Node.js **20.19+** and npm. A current Node.js LTS release is recommended.

```bash
git clone https://github.com/Mandres07/grocery-list.git
cd grocery-list
npm ci
npm run dev
```

Open **[localhost:3001](http://localhost:3001)**. Already have the repository? Run the last two commands from your project folder.

Port **3001** allows Scorecast to keep using port 3000. For another port, use `npx next dev --webpack -p 3002`.

### 🍃 Set up the local database

With Docker Desktop installed and running:

```bash
npm run db:up
npm run db:check
```

The database uses its own volume and port **27018**. The verification command creates a temporary local test database, exercises indexes, household boundaries, and transactions, then removes only that temporary database.

**No Docker?** The [local database guide](docs/local-database.md) includes instructions for the MongoDB installation already present on your Mac.

### 👤 Set up accounts and email

Follow the [account setup guide](docs/accounts.md) to configure a unique session secret and a dedicated Resend API key. Lista de Compras currently uses the existing `updates.finalscore.win` sending domain, with its own sender name and credentials. No Google, Atlas, or Vercel setup is needed for this local milestone.

Open `/register` to create an account, verify your email, then sign in and create a household at `/household`. Registration does not automatically create a household. The inventory preview remains sample data.

[`.env.example`](.env.example) documents the local defaults. The preview and local database checks need no provider credentials; account email requires your own Resend key and session secret in ignored `.env.local`. Production credentials belong in hosting settings.

## 🛠️ Built with

| Layer | Technology | Progress |
| --- | --- | --- |
| Application | Next.js App Router · React · TypeScript | ✅ Configured |
| Styling | Tailwind CSS · shared theme tokens | ✅ Configured |
| Data foundation | MongoDB · Mongoose · eight domain models | ✅ Locally verified |
| Validation | ESLint · TypeScript · Vitest · production build | ✅ Configured |
| Authentication | NextAuth · verified accounts · household creation | ✅ Implemented; continuation authorized |
| Email | Resend verification, recovery, and invitations | ✅ Account delivery confirmed; new design/invitations need manual review |
| Hosting | Vercel · MongoDB Atlas | 📋 Upcoming |

Frontend and backend live in **one repository**, following the sibling Scorecast project's architecture. The current preview is deliberately separate from persistent inventory workflows.

## 🧭 What's next

We stop after each milestone for testing and review.

| Milestone | Focus | Progress |
| --- | --- | --- |
| **01 · Foundation** | Project setup, visual direction, sample inventory | ✅ Implemented |
| **02 · Data foundation** | Local database, models, access helpers, and verification | ✅ Completed and reviewed |
| **03 · Accounts** | Registration, verification, sign-in, recovery, household creation | ✅ Email confirmed; continuation authorized |
| **04 · Family sharing** | Invitations and owner-only member management | ✅ Implemented; approved for commit |
| **05 · Inventory** | Products, categories, stock, activity, and undo | 📋 Planned |
| **06 · Grocery list** | Shared shopping and confirmed stock receipt | 📋 Planned |
| **07 · Hosted database** | Atlas, environment isolation, and recovery | 📋 Planned |
| **08 · Deployment** | Vercel and production email | 📋 Planned |
| **09 · Everyday use** | End-to-end review and Home Screen setup | 📋 Planned |

### 👨‍👩‍👧‍👦 Sharing, with clear boundaries

Each family member will have their **own account**, sharing one household inventory and grocery list.

- **Everyone in the household:** manage products, categories, stock, and shopping items.
- **Household owner only:** invite family members, revoke invitations, and remove members.
- **After removal:** access ends while shared products and activity remain.

Barcode scanning, photos, expiration dates, fractional quantities, and offline updates are reserved for later consideration.

## ✅ Development commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the app on port 3001 |
| `npm run check` | Run lint, types, unit tests, and production build |
| `npm test` | Run database-independent behavioral tests |
| `npm run test:watch` | Watch unit tests during development |
| `npm run db:up` | Start the local Docker replica set and wait for readiness |
| `npm run db:check` | Verify a running local database with integration tests |
| `npm run db:down` | Stop Docker services while retaining local data |
| `npm run start` | Serve a completed production build |

Unit tests run without MongoDB. Integration tests require the local replica set; see the [database guide](docs/local-database.md).

## 📚 Documentation

| Location | What you'll find |
| --- | --- |
| [`app/`](app/) | Pages, layouts, and future API routes |
| [`components/`](components/) | Shared interface and inventory preview |
| [`models/`](models/) | Household, identity, inventory, and shopping schemas |
| [`lib/`](lib/) | Database connection and household/reference guards |
| [`styles/theme.json`](styles/theme.json) | Shared editable colors, fonts, and sizes for web and email |
| [`styles/tokens.css`](styles/tokens.css) | Tailwind mapping for the generated theme variables |
| [Implementation plan](docs/implementation-plan.md) | Milestones and review checkpoints |
| [Architecture](docs/architecture.md) | Application design and access rules |
| [Local database](docs/local-database.md) | Startup, verification, and troubleshooting |
| [Accounts and email](docs/accounts.md) | Resend configuration and account review steps |
| [Family sharing](docs/family-sharing.md) | Invitations, member management, and review steps |

## 📄 License

[MIT](LICENSE) · Mario Andrés Morales

---

<div align="center">

**Un hogar. Un equipo.** 🌿<br />
Made for the little things that keep a home running.

</div>
