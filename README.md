# Carlos Mata — A few places that made me

A minimal monitor entrance, a scroll-driven descent through the stars, then an
interactive 3D Earth tracing Carlos's education and work:

**St. Louis → Granada → Brno → Munich → Madrid.**

Each stop has a reading interval. Continuing to scroll pulls back into orbit,
rotates to the next city and approaches the surface again. The whole journey is
reversible, and the five location links also jump to individual chapters.

## Run locally

```sh
npm install
npm run dev
```

Open http://localhost:3000. This does not publish the site.

## Implementation

Next.js 16, React 19, TypeScript and Three.js. System typography with locally
served Geist. No new dependencies are needed for the Earth sequence.

- `src/content/places.ts`: chapter copy and city-centre coordinates, based on the
  existing professional timeline. The route follows the education/work story;
  graduation and work dates can overlap.
- `src/components/descent/DescentExperience.tsx`: scroll, HTML chapters,
  accessibility and rendering lifecycle.
- `src/components/descent/journey.ts`: entrance sequence.
- `src/components/descent/earth-journey.ts`: departure, orbital transfer, landing
  and reading intervals.
- `src/components/descent/create-descent.ts`: monitor, star tunnel and camera.
- `src/components/descent/create-earth.ts`: globe, day/night shading, moving
  clouds, atmosphere, geographic markers and flight arcs.
- `src/app/globals.css`: dark theme and mobile layouts.

Earth maps are stored locally under `public/textures/earth/` (about 1.6 MB total).
They are by [Solar System Scope / INOVE](https://www.solarsystemscope.com/textures/),
used under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), with credit
in the experience and `ATTRIBUTION.md`. This is a globe-level journey, not a street
map or terrain simulation.

The scene loads separately, pixel ratio is capped, and rendering pauses when
hidden. Reduced-motion visitors get static city views without the flight.
If WebGL is unavailable, a CSS globe and the same chapters remain accessible.
Visitors without JavaScript get a readable list of all five chapters.
The previous machine code remains in `src/components/machine`, unloaded.

## Checks and builds

```sh
npm test -- --run
npx tsc --noEmit
npx eslint src/components/descent src/content/places.ts
npm run build
```

`npm start` serves a production build. The previous Sites configuration is
preserved; `SITES_EXPORT=1 npm run build` produces the optional static export.
