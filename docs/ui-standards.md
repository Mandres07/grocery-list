# Shared UI conventions

Keep the warm background, green brand foundation, terracotta accents, and serif welcome heading. Application forms and lists use compact spacing, clear sans-serif headings, and gently squared controls.

- Define shared colors, spacing, dimensions, and radii in `styles/theme.json`. Run `npm run tokens` to regenerate web and email assets; do not edit generated outputs directly.
- Name shared classes by appearance, purpose, or behavior rather than a page or element location: `surface-outlined`, `stack`, `record-row`, `measure-narrow`, `action-primary`, and `disclosure`.
- Reuse `FormField`, `PasswordField`, `ActionForm`, and `RecordRow` before duplicating field markup or list structure. Keep password visibility controls separate from submit actions.
- Preserve touch targets of at least the shared `touch` size (44px), visible focus, native labels, and live feedback. Empty feedback must not reserve visible space.
- Use divided rows for repeated records and separators for related sections. Reserve outlined or raised surfaces for content that needs a distinct boundary.
- On narrow screens, show the welcome introduction, registration form, then supporting benefits. Keep both welcome and registration columns on desktop.
- Keep primary search and stock actions visible. Put advanced filters, category management, and recent activity in native disclosures; open advanced filters when a filter is active.

Validate desktop and mobile layouts and run `npm run check` after application changes.

The shared header spans the viewport and stays at the top with native CSS sticky positioning. Use `surface-inverse` and `action-inverse` for cream text, contrasting controls, and visible focus against brand green. Popovers restore the normal light-surface colors and scroll within short viewports. Render `AppHeader` only in the root layout. The header and page shells share one `layout-wide` maximum width and `layout-gutter` horizontal padding rule. Keep narrower forms inside this aligned outer shell; do not give individual pages different outer widths. Keep the viewport scrollbar gutter stable to prevent horizontal shifts between short and long pages. Use borderless `action-quiet` controls in the bar and `DisclosureMenu` for keyboard-accessible menus that close on Escape, outside interaction, and link selection.

At the existing `lg` breakpoint, show account links and sign out inline in the header. Below it, show the same shared links inside `DisclosureMenu`. Close disclosures on route changes, viewport resize, Escape, outside pointer interaction, and popup clicks. Keep the toggle itself responsible for native open/close behavior.

Keep `brand`/`brand-hover` green for primary actions, navigation, large headline emphasis, branding, and success. Restrict terracotta `accent` to small decorative icons and badges, with `accent-soft` for restrained peach highlights. Do not use terracotta for primary buttons, large headings, or large surfaces. Use `warning`/`warning-soft` with explicit status text for stock warnings and verification notices; never rely on color alone to convey state. Shared email actions use the same green brand token as web primary actions. Maintain at least 4.5:1 contrast for normal-size text across these pairings.

Registration (`/`) and sign-in (`/sign-in`) share the server-rendered `(auth)` route layout: identical welcome copy, supporting benefits, shell, and footer. Routes supply only their form panels; use ordinary Next links to switch forms so URLs and browser history remain native. Keep the shared welcome heading as the single h1 and form titles as h2. Keep supporting benefits below the form on mobile.

Stock controls show confirmed server quantities and revisions. Reconcile action responses and refreshed page data by revision so delayed responses cannot replace newer stock, and retain the same request ID for uncertain retries. The persistent header may fall back to guest navigation if account lookup fails; page authorization must still fail closed and render its error screen. Preserve Next.js control-flow exceptions when handling that lookup failure.
