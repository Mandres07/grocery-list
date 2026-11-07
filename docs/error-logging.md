# Application error logging

Server failures use `lib/error-logging.ts`. The logger writes one JSON line through `console.error`, so local terminals and Vercel Runtime Logs capture the same application format. No external logger, paid service, log database, or background worker is required.

Example (illustrative values):

```json
{"event":"application.error","level":"error","timestamp":"2026-11-07T01:00:00.000Z","operation":"shopping.submit","errorId":"opaque-uuid","error":{"name":"StrictModeError","path":"retentionExpiresAt"},"action":"receive-batch"}
```

## Coverage and references

- Inventory and shopping actions identify the submitted action using a fixed allowlist. Product lookup has its own operation.
- Account registration, verification, recovery, name changes, and household creation have distinct operations.
- Family invitation, resend, revoke, removal, acceptance, household rename, sign-in, and header account lookup are identified separately.
- Email delivery identifies verification, password reset, or invitation purpose, with provider HTTP status when available. Fetch/network failures are also logged.
- Next.js `instrumentation.ts` captures unhandled server render/route/action failures, including the framework route-file pattern and safe numeric digest when available. Request URLs, query strings, headers, and bodies are not passed into the logger.

Unexpected action failures append `Referencia: <errorId>` to the existing Spanish feedback. The same error object retains its reference when it passes through several application boundaries. Separate failures and retry attempts may receive new references. References identify a diagnostic failure; they are independent of mutation request IDs used to prevent duplicate stock changes. Normal domain validation, incorrect credentials, and permission messages do not become error logs. An operational email failure that is already logged retains its reference when surfaced as an AccountError.

Unhandled rendering failures are logged by the server hook; the existing error screens are unchanged. Browser-only JavaScript exceptions do not automatically reach Vercel server logs through this feature. Next.js and third-party packages may also emit their own logs outside this application format.

## Data excluded

The logger builds an allowlisted record rather than serializing errors. It omits raw messages, stack traces, causes, credential values, cookies, tokens, email addresses, household/product names, account/household/product IDs, request payloads, database URLs, and provider response bodies. Allowed details are known error type names, numeric/known network codes, schema field names, numeric Next.js digests, validated HTTP status, recognized actions, and framework route patterns. Network causes contribute only known error codes. Never pass `request.path` or a URL as the route context.

## Investigating production

Open the Vercel project's Logs, select Production and Error, and search for a reported reference, `application.error`, or an operation such as `shopping.submit`. Search by the logged action to distinguish purchase checks from receipt confirmation. A failed Server Action may still have HTTP 200; the application error entry is the failure signal.

Vercel Runtime Log retention is controlled by the hosting plan; this change does not extend retention or enable alerts. Consult [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime) for current limits. Deployment is required for the new application logs to appear in production. A full local restart is needed to register the new instrumentation hook. Saved inventory and retention policies are unaffected.
