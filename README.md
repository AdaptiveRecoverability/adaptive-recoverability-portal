# ARG Client Portal

Private portal repo, separate from the public marketing site (GitHub Pages)
and the API repo. This is the piece that sits between them: authenticated
clients log in here, and the portal calls the API on their behalf.

## Why this is a separate repo from the API

GitHub Pages can't run the API's Python engine, and the portal itself needs
its own build/deploy step (Vite → static bundle) that's independent of the
API's deploy cycle. Keeping them separate means the API-side model can ship
engine changes without touching this repo, and vice versa — the only shared
surface is the confirmed response contract already documented in
`dashboard-api-integration-report.md` from the main integration work.

## Design system — matched to the public site, not reinvented

`src/theme.js` is the single source of truth, extracted directly from
adaptiverecoverability.com's CSS: same navy/gold/silver palette, same
Fraunces + Inter + JetBrains Mono pairing, same near-square corner radius.
Every portal page imports colors and fonts from there rather than
hardcoding values, so the two surfaces can't quietly drift apart as either
gets iterated on separately.

**Missing asset:** the actual shield/brand mark image used in the site's
header and hero isn't available in this scaffold — `AppShell.jsx` and
`Login.jsx` currently use a gold gradient square as a placeholder. Drop the
real asset into `public/` and swap the placeholder `<div>` for an `<img>`
once you have the file.

## Structure

```
src/
  theme.js                    — design tokens (colors, fonts, type scale)
  App.jsx                     — auth state + routing between Login and the dashboard
  main.jsx                    — Vite entry point, loads the shared font stack
  pages/
    Login.jsx                 — client sign-in
  components/
    AppShell.jsx               — authenticated header/shell, wraps every signed-in page
  ARGCommercialAssessment.jsx  — the existing dashboard (evidence intake →
                                  live API call → results), copied in as-is
```

## What's real vs. what's a placeholder

**Real and working:** the design system, the dashboard component itself
(already calling the live API per the confirmed Banking V1 contract), the
overall page structure and visual matching to the public site.

**Placeholder, needs a decision before this runs end-to-end:**

1. **Auth backend.** `App.jsx`'s `handleLogin` currently just throws —
   there's no real authentication wired up yet. This needs one of:
   - A custom login endpoint on the same API host (simplest given you
     already have a Python backend on Railway — a `/auth/login` route
     issuing a JWT is a small, well-understood addition)
   - A managed provider (Auth0, Clerk) if you'd rather not build/maintain
     session handling yourself

   Whichever is chosen, only `App.jsx`'s `handleLogin` function needs to
   change — nothing else in the portal depends on how auth is implemented.

2. **Session persistence.** Right now `session` lives in React state only,
   so refreshing the page signs the client out. Once auth is real, this
   needs a token stored somewhere that survives a refresh — likely an
   httpOnly cookie set by the auth endpoint, which is safer than
   `localStorage` for anything bank-adjacent.

3. **CORS.** Once both the API and portal are deployed on Railway (likely
   as two separate services under one project, or two separate Railway
   apps), the API needs to allow the portal's deployed origin.

4. **Snapshot storage hookup.** The opt-in "save this assessment" feature
   discussed earlier isn't wired up yet — it depends on the auth decision
   above, since snapshots need to be tied to a real client identity.

## Suggested next step

Given the "test one piece at a time" approach that's worked well on the
engine side: get this running locally first (`npm install && npm run dev`)
against the local API on `127.0.0.1:8000`, with a temporary hardcoded
`handleLogin` that just accepts anything (clearly marked as temporary) so
the portal → dashboard → API path can be exercised end-to-end before real
auth is built. That isolates "does the portal correctly call the API and
render results" from "does auth work," which are genuinely separate things
to get right and easier to debug one at a time.
