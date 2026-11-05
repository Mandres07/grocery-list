# Vercel deployment — milestone 8

Status: preparation in progress. The user is importing `Mandres07/grocery-list` into a Hobby project named `lista-de-compras`. Production/preview Atlas users and databases were verified in milestone 7. Hosting, actual assigned domains, hosted authentication/email, protected preview configuration, and two-account sharing still need verification before this milestone is complete. The local household database stays on port 27018; no household data is migrated automatically.

## Deployment preparation

The project uses Next.js App Router, Node.js 22, `npm run build` (Webpack), and Vercel functions pinned to `iad1` in `vercel.json`, near Atlas AWS us-east-1. Vercel's Next.js preset and root directory `./` are appropriate. Use the committed lockfile; do not override the install/build commands or switch to static export. Node 22 is pinned in package.json to match the tested runtime.

Before public deployment, security updates advance Next.js/eslint-config-next to 16.4.5, Mongoose to 9.12.0, Tailwind/PostCSS to 4.3.4, and Vitest to 4.1.12. Nonbreaking transitive fixes are locked. The typescript-estree dependency has a scoped minimatch 11.0.1 override for GHSA-g3hv-75wg-m249, since its upstream range still selects affected minimatch 10. Remove that override when upstream permits the patched version normally. No audit finding is ignored or suppressed. Vitest configs use explicit `.mts` modules for the newer runner; their options/coverage are unchanged and TypeScript still includes them. Authentication success uses router replacement and refresh, retaining immediate sign-in and fresh account state.

Primary security references: [Next.js advisory](https://github.com/advisories/GHSA-673q-mjm6-r5xr), [Mongoose advisory](https://github.com/advisories/GHSA-664h-wqgq-64gw), [minimatch advisory](https://github.com/advisories/GHSA-g3hv-75wg-m249).

## Private environment files

Generate a production import file with the **actual canonical production origin**:

```sh
node --env-file=.env.local --env-file=.env.atlas.local scripts/prepare-vercel-env.mjs production https://YOUR-PRODUCTION-DOMAIN
```

The script writes owner-readable, Git-ignored `.env.vercel.production.local`. It derives only the restricted production app connection from the Atlas host and saved production password, sets `grocery_list_production`, generates a unique session secret, and copies this app's existing Resend sender/key/reply setting. It never exports maintenance/admin credentials. Re-running preserves the generated session secret. Imported values contain secrets: open/copy locally, never paste into chat or a screenshot. `.env.local` and the running local app are unchanged.

Import this file into **Production only**. Variables are `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optional `RESEND_REPLY_TO_EMAIL`. Do not prefix any with `NEXT_PUBLIC_`. Mark sensitive values as sensitive in Vercel where offered. Never use the maintenance account for hosting. Keep the approved verified sender domain `updates.finalscore.win`; app branding/display names remain Spanish. Google OAuth is not enabled and needs no configuration.

`https://lista-de-compras.vercel.app` is the requested initial origin, not a verified assigned domain until Vercel confirms it. If the project receives a different domain, regenerate with that origin, update `NEXTAUTH_URL`, and redeploy before using registration, password recovery, or invitations. The auth URL also generates email links, so it must point to the same canonical HTTPS deployment. Do not derive email destinations from incoming Host headers.

For Preview, use a dedicated trusted branch with a stable Vercel branch domain. Generate `.env.vercel.preview.local` with the same command, replacing `production` with `preview` and supplying that branch's actual HTTPS domain. Import into **Preview scoped to that branch only**. The preview file uses `lista-preview`, `grocery_list_preview`, and its own generated session secret. Keep Vercel Authentication deployment protection on for preview. Do not expose these secrets to untrusted PRs/forks, all branches, or Development. Protected preview email links require signing into Vercel first; production family members must not need a Vercel login.

## Atlas network access for Hobby

Vercel Hobby functions have dynamic outbound addresses. This deployment needs an Atlas `0.0.0.0/0` IP access entry, labeled `Vercel Hobby`, in the **Lista de Compras** project only. It allows network connections from anywhere; strong database authentication and the verified database-specific roles still apply. The user confirmed the Atlas network configuration is complete. Do not treat a workstation-only allowlist as sufficient for deployment. Keep the workstation entry for maintenance.

Fixed outbound IPs are a Pro/Enterprise feature and are not enabled or purchased in this milestone. Do not install the Atlas Native Integration to create another cluster/account or replace restricted credentials: the already prepared Atlas project/cluster are used directly. See [MongoDB's Vercel networking guidance](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/) and [Vercel Static IPs](https://vercel.com/docs/networking/static-ips).

## Deploy and verify

1. Verify the security-updated source is available on GitHub and select the intended commit. Import the repository with Next.js settings and Production-only variables. Confirm the Atlas network entry is Active, then deploy.
2. Confirm Node 22 and region iad1 in the build/function configuration; inspect build/runtime errors without copying secret values. Confirm the actual canonical domain matches `NEXTAUTH_URL`; redeploy after correcting environment settings.
3. Open `/`, `/sign-in`, `/inventory`, `/shopping`, and `/account` while signed out. Protected routes must redirect rather than expose data. Auth/session endpoints must not cache user-specific responses publicly.
4. Register a real owner account through the HTTPS app, verify immediate signed-in access with shared features restricted, then verify the real email link and create a household. Production currently starts empty; existing local accounts/products remain local until a deliberate migration is requested.
5. Invite a second real account at the user's direction, verify the actual recipient/link/acceptance, and check shared inventory/shopping persistence from both accounts/devices. Test a stock adjustment and a purchase/receipt once; verify it survives a reload. Confirm another household cannot access it. Do not send unrequested invitations to real recipients.
6. Test password recovery and sign-out/sign-in over HTTPS. Check the branded email uses the correct app origin and verified sender. Monitor Resend delivery in its dashboard if mail is delayed; do not share API keys or tokenized links.
7. Configure the branch-scoped protected preview with its isolated credentials/secret/domain and verify it cannot read production. Keep production protection settings suitable for family use, and keep preview protected.
8. Record concrete verification results, assigned production/preview domains, source commit, and remaining manual/device checks. Stop at milestone 8; home-screen/release polishing remains milestone 9.

Use Vercel redeploy after environment changes; existing deployments retain the values they were built/deployed with. For a bad code release, roll back to a previously verified deployment that matches the database schema; do not delete Atlas data. Changing a session secret signs out sessions in that environment. Recovery uses the tested isolated procedure in `hosted-database.md`; paid backups remain disabled and manual exports are not scheduled automatically.

## Preparation verification

On 2026-11-04, the updated dependency tree reports zero npm audit vulnerabilities. Lint, TypeScript, 203 unit tests, 86 disposable-database integration tests, and the Next.js 16.4.5 production build pass. An isolated browser app with email disabled verified sign-in, an inventory stock change surviving reload, sign-out, and registration immediately opening the signed-in unverified household screen. Fixtures were removed and the separate test MongoDB was stopped; the saved local application database stayed running. A private Production-only environment file was generated with a unique preserved session secret and this app’s existing verified sender settings. The user confirmed the free Vercel project name and completed Atlas network setup. GitHub publication of the preparation changes, Vercel deployment, canonical URLs, branch-scoped preview configuration, and actual hosted email/account/sharing checks remain pending.
