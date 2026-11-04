# Lista de Compras

Mobile-first household inventory and shared shopping application. Follow the sibling Scorecast project's Next.js architecture, adapted for this domain.

## Delivery

- Work one milestone at a time, as tracked in `docs/implementation-plan.md`.
- Stop after each milestone so the user can test and review. Do not advance until the user asks to continue.
- Preserve the distinction between sample UI and saved/shared inventory.
- Use the existing checkout, GitHub, Vercel, MongoDB Atlas, and Resend as planned. Do not create separate Sites hosting or copy Scorecast secrets or data.

## Implementation

- Read the relevant installed Next.js guide in `node_modules/next/dist/docs/` before framework changes.
- Use TypeScript with precise types; prefer Server Components with small client boundaries.
- Keep route files focused; share feature code in `components/` and `lib/`.
- Use Tailwind utilities and `styles/tokens.css`; build mobile-first with accessible native elements, visible focus, and usable touch targets.
- Reuse components and shared styles instead of duplicating markup or hardcoding visual values. Define colors, typography, and reusable sizes in `styles/theme.json`; run `npm run tokens` after edits. Do not edit generated theme/icon outputs directly.
- Keep the visible app name in `lib/brand.ts`, reuse the `Brand` header component with its basket, and use the shared branded action-email template for transactional emails.
- Default user-facing copy to Spanish and internal names to English.
- Use semantic HTML and handle loading, empty, error, and success states for real workflows.
- Keep secrets out of source control and browser bundles.
- Enforce authentication, household membership, and owner-only member management on the backend.
- Preserve atomic, nonnegative stock changes, request deduplication, and traceable activity when persistence is implemented.

## Validation

- Run `npm run check` for application changes.
- Add meaningful behavioral tests with the account, invitation, permission, and inventory milestones.
- Review mobile and desktop layouts when browser access is available; state verification limits accurately.
