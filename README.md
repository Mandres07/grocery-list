# GroceryList

A mobile-first application for shared household inventory and grocery shopping. Built with Next.js, React, TypeScript, and Tailwind CSS, following the sibling Scorecast application structure.

## Current checkpoint

Milestone 1: application foundation and design preview. The home page includes three clearly labeled sample products with working quantity controls. Sample changes exist only in memory and reset on reload. Accounts, invitations, shared data, shopping lists, and external hosting are future milestones.

## Run locally

Use Node.js 20.9 or newer and npm. A current Node.js LTS release is recommended.

```bash
npm ci
npm run dev
```

Open http://localhost:3001. Port 3001 is intentional so Scorecast can run on port 3000 at the same time. To use a different port: `npx next dev --webpack -p 3002`.

No environment variables, database, or external accounts are required for this checkpoint. `.env.example` lists reserved placeholders for subsequent work. Real values belong in ignored `.env.local` and hosting settings.

## Review this milestone

1. Open the home page at phone width (approximately 390px) and at desktop width.
2. Use “Explorar el ejemplo” to jump to the inventory preview.
3. Adjust each sample with + and −. Quantity cannot go below zero; low-stock labels and the summary update.
4. Try keyboard navigation and check the visible focus indicator.
5. Select “Restablecer ejemplo”, then change a quantity and reload. Both restore the original samples.
6. Review the Spanish copy, sage/cream colors, readability, and touch target sizes.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

Or run all three with `npm run check`. Functional tests will be added with persistent account and inventory behavior. System fonts are used so builds do not require a font download.

## Create the private GitHub repository

If no local Git repository exists yet:

```bash
git init -b main
git add .
git commit -m "Initialize GroceryList foundation and design preview"
```

On GitHub, create an empty private repository named `grocery-list` under your account. Do not initialize it with a README, license, or .gitignore, because those already live here. Then run:

```bash
git remote add origin https://github.com/Mandres07/grocery-list.git
git push -u origin main
```

Authenticate through your normal Git credential manager when prompted. Do not paste access tokens into chat or commit them. GitHub CLI is optional; the browser workflow works without it.

## Organization and roadmap

- `app/`: pages, layouts, and future API routes
- `components/ui/`: shared UI primitives
- `components/inventory/`: inventory preview and future inventory features
- `styles/tokens.css`: theme tokens
- `docs/implementation-plan.md`: milestones, scope, and review checkpoints
- `docs/architecture.md`: architecture and household access rules

Production targets are GitHub → Vercel, MongoDB Atlas, and Resend. Provisioning happens at the corresponding milestones after local behavior is reviewed.
