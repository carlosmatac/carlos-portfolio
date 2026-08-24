## Carlos Mata — Portfolio

Personal portfolio of **Carlos Mata**, a software engineer moving into data
architecture (C++, Python, data platforms), based in Madrid.

The site is a **single page** on a black canvas: the name at brutal scale over a
dot field that reacts to the cursor, and exactly two destinations — **About** and
**Work** — reached by smooth scroll. No cards, no thumbnails, no case-study
pages: every project row links straight to its repository.

### Stack

- **Framework**: Next.js 16 (App Router, `src/app`)
- **Libraries**: React 19
- **Styling**: Tailwind CSS 4 (CSS-first, tokens in `src/app/globals.css`)
- **Typeface**: Geist, self-hosted via the `geist` package (no runtime font fetch)
- **Language**: TypeScript
- **Tests**: Vitest + Testing Library

### Design system

Defined as CSS variables in `src/app/globals.css`:

| Token      | Value                      |
| ---------- | -------------------------- |
| `--bg`     | `#08080A` (near-black)     |
| `--fg`     | `#EDEDE8` (off-white)      |
| `--accent` | `#D9FF00` (acid lime)      |

One theme only — there is no light mode. Pills are the only rounded shape; no
shadows, no card backgrounds.

### Structure

- `src/app/layout.tsx` — root layout, Geist wiring, metadata.
- `src/app/(site)/layout.tsx` — mounts `BackgroundField` and `Header` around the page.
- `src/app/(site)/page.tsx` — the whole site: `Hero`, `AboutSection`, `WorkSection`.
- `src/components/BackgroundField.tsx` — the reactive background. A fixed
  `<canvas>` holding a lattice of dots that are pushed away from the pointer
  within a radius and ease back; dots inside the radius light up in the accent.
  With no pointer the focus follows a slow orbit. Honours
  `prefers-reduced-motion` by painting a single static frame and registering no
  listeners.
- `src/components/Header.tsx` — fixed header. Absent over the hero; slides in
  past the first viewport and marks the active section in accent.
- `src/components/Hero.tsx` — name, tagline and the two buttons.
- `src/components/AboutSection.tsx` — bio, "now" card, links, timeline, certifications.
- `src/components/WorkSection.tsx` — typographic index of projects. Hovering (or
  focusing) a row opens its one-liner, stack and repo buttons; on touch devices
  the detail is always open.
- `src/hooks/useActiveSection.ts` / `useSmoothScroll.ts` — section tracking and
  scrolling for the single-page navigation.
- `src/content/` — the data: `projects.ts`, `timeline.ts`, `certifications.ts`, `site.ts`.

The old `/about`, `/work`, `/work/[slug]` and `/contact` routes are kept as
redirects into the corresponding section, so existing links do not 404.

### Local usage

```bash
npm install
npm run dev     # http://localhost:3000
```

### Scripts

- **`npm run dev`** — development server.
- **`npm run build`** — production build.
- **`npm run start`** — serve the production build.
- **`npm run lint`** — ESLint with the Next.js config.
- **`npm test`** — Vitest.

### Deployment

Any Next.js-compatible platform (currently Vercel): `npm run build`, then
`npm run start`.

### Ideas for evolution

- Per-project screenshots as an optional right-hand column in the Work index.
- Per-section Open Graph images.
- Revisit the dot field's cost on low-end mobile devices.
