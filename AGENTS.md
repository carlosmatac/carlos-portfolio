# Carlos Mata portfolio

Next.js 16 (App Router, Turbopack) + React 19 + three.js. Content lives in `src/content/` (e.g. `places.ts` drives the journey's cities, header stations and the `/next-station` board).

## Verification
- Tests: `npx vitest run`
- Types: `npx tsc --noEmit`
- Lint: `npx eslint src` (there are pre-existing errors in legacy components such as `ThemeProvider.tsx`; don't add new ones)
- Build: `npx next build`

## Gotchas
- Don't run `next build` (or `git stash`) while `next dev` is running: Turbopack's dev cache can latch onto a stale `globals.css` and keep serving it after a restart. A real content edit to the file forces it to recompile.
- Tests that call `vi.unstubAllGlobals()` must re-stub `IntersectionObserver` when rendering `next/link`.
