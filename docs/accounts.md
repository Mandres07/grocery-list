# Local accounts and email

Milestone 3 follows Scorecast's architecture: NextAuth credentials and JWT sessions, Node scrypt password hashing, MongoDB, and Resend transactional email. Google login remains optional and is not enabled. Atlas and Vercel setup belong to later milestones.

## Configure locally

1. Keep the local MongoDB replica set running on port 27018. See [local database](local-database.md).
2. Use an ignored `.env.local` in the repository root. This session prepared it with a new Lista de Compras-only `NEXTAUTH_SECRET`, the local URL, and the agreed sender. Never copy Scorecast secrets. For a fresh checkout, copy `.env.example` and generate a secret with `openssl rand -base64 48`.
3. In the existing [Resend account](https://resend.com/domains), confirm `updates.finalscore.win` shows as verified. The user chose this sending domain for now. A verified sending domain does not have to match the application's local address or future hosting domain.
4. In [Resend API Keys](https://resend.com/api-keys), create `Lista de Compras local` with **Sending access**, restricted to that sending domain. Paste the key into `RESEND_API_KEY` in `.env.local`, not into chat or a committed file.
5. Keep these settings in `.env.local`:

```dotenv
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-unique-generated-secret
RESEND_API_KEY=your-new-grocerylist-only-key
RESEND_FROM_EMAIL=Lista de Compras <no-reply@updates.finalscore.win>
RESEND_REPLY_TO_EMAIL=
```

`RESEND_REPLY_TO_EMAIL` is optional; set it only to a real monitored inbox. Do not replace an existing generated session secret with the example text. The key and session secret stay server-side. Restart `npm run dev` after editing environment settings. Keep open/click tracking disabled for account emails so action links are not rewritten.

The sender domain is configuration, not embedded in the email code. To change it later, verify the new domain in Resend, update the sender and key permissions, and restart/redeploy. For a new domain, add the sending DNS records that Resend provides; do not replace the root domain's existing email-receiving MX records. See [Resend verified domains](https://resend.com/docs/dashboard/domains/introduction).

## Review the milestone

Use [localhost:3001](http://localhost:3001), with your real inbox after configuring Resend:

1. Open **Crear mi cuenta**, enter a name, email, and password of 12–128 characters. Registration sends a verification link but does not sign you in or create a household.
2. Try signing in before verification; access should be denied. Open the verification email, press **Confirmar mi correo**, then sign in. Confirming a link requires a form submission, so an email scanner visiting the URL does not consume it.
3. Create a named household. Reload and sign in again to confirm the name persists and you remain its owner. The page explicitly distinguishes this saved household from the sample products on the home page.
4. Sign out and confirm `/household` redirects to sign-in.
5. Request password recovery. Open the email, enter a new password, and sign in. The old password and existing authenticated sessions must lose access to protected household pages and actions.
6. Reuse a verification or recovery link; it must fail. Verification expires after 24 hours, recovery after 1 hour. Resending replaces the previous token. Check spam and Resend's delivery logs if an email does not arrive.
7. Check the pages on a phone and desktop. For this local milestone, email links point to the Mac's localhost:3001; open them on that Mac. A phone's localhost points to the phone. Hosted phone review comes after hosting; a LAN test requires a reachable application URL and consistent browser/form origin.

Invitation acceptance is available in milestone 4. A user expecting an invitation can open the invitation email without creating a separate household. See [family sharing](family-sharing.md).

## Security and failure behavior

- NextAuth handles the encrypted session cookie, sign-in/sign-out and CSRF checks. Lista de Compras cookies have separate names to avoid collisions with Scorecast on localhost. Server Actions enforce their normal same-origin checks.
- Every protected page/action loads the current user and checks email verification and session version in MongoDB. Password reset atomically increments the version. Household access still checks current membership; no role is trusted from a form or JWT.
- Tokens are random 32-byte values, stored only as hashes on the user. Redemption checks expiration explicitly and atomically clears the hash. Tokens are consumed only on form submission, never on GET. Account pages suppress referrers.
- Sign-in, registration and email requests use MongoDB-backed fixed-window rate limits, shared across workers: five attempts per normalized email/operation per 15 minutes plus 100 requests per operation per minute globally. Successful sign-ins also count. Wait for the next window if you exhaust a budget. This is an initial household-scale safeguard; public deployment should review appropriate edge-level abuse controls as well.
- Email requests have a one-minute cooldown. Unknown, verified, and unverified accounts receive generic eligibility messages. A failed email send invalidates its new token and permits retry. Duplicate registration never overwrites existing credentials.
- If MongoDB is unavailable, authorization fails closed; the UI offers retry. Missing email configuration prevents registration before user insertion. An account created before a provider failure can request another verification email.
- Creating a household serializes on the current user within a transaction, then inserts both household and owner membership. Concurrent/repeated requests cannot create extra households or leave an owner without membership. Registering alone writes no household.

## Verification

`npm run check` runs lint, types, unit tests, and build. `npm run db:check` exercises the local replica set in a generated disposable database, including account flows, token expiry/reuse, transaction rollback, concurrency, and rate limits. Integration email delivery is mocked: these checks never contact Resend or send messages.

Before hosted deployment, run `initializeDatabase` from `models/index.ts` against the intended database as documented in the architecture; production disables automatic index creation. Use separate production secrets, an HTTPS `NEXTAUTH_URL`, and a verified sender. Review outstanding dependency audit findings before exposing the app publicly.
