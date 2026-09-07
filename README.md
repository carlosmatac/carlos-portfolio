# Por favor, toca — Carlos Mata

A playful portfolio built around a real-time 3D marble machine. The first screen
is the experience: visitors can release marbles, change the destination, float
them, rewind time, and take the assembly apart. Projects and professional
information live in accessible dialogs alongside direct GitHub, LinkedIn, and
email links.

## Run

```sh
npm install
npm run dev
npm run build
npm start
```

Next.js 16, React 19, TypeScript, Three.js. Geist is served locally. The machine
uses generated 3D geometry and an in-memory studio environment: there are no
external model, texture, music, or font requests.

## Controls

- **Suelta una canica** or **Space** when no other control is focused: release a
  marble (up to 14 at once).
- **Campana / Vuelo**: select the destination of the next marble. One rings a
  bell and lights a lamp; the other launches a paper plane.
- **El tiempo**: scrub the machine's route and Carlos's timeline. Return to the
  present to continue playing.
- **Gravedad**: float the marbles and return them to the rails.
- **Desmontar**: separate the physical assemblies. Click the rails, flywheel,
  bell, or plane to inspect the associated project. The project index offers
  the same information without interacting with the 3D surface.
- Drag to rotate; the three camera buttons also work with a keyboard.
- Pause freezes the machine. Sound is synthesized locally and off by default.

The run follows a deterministic, reversible track. It is a designed kinetic toy,
not a general-purpose rigid-body physics sandbox. Existing marbles retain their
selected destination when the switch changes.

## Structure

- `src/components/machine/MachineExperience.tsx`: accessible interface, dialogs,
  audio, controls, loading/failure states, and legacy hash navigation.
- `src/components/machine/create-machine.ts`: geometry, lighting, camera,
  interaction, animation, and GPU-resource cleanup.
- `src/lib/machine-physics.ts`: shared rail/marble coordinates and event crossings.
- `src/content/`: existing profile, repositories, timeline, and certifications.
- `src/app/globals.css`: the studio theme and responsive layouts.

The WebGL module loads separately. Rendering stops when idle, hidden, or outside
the viewport. Pixel ratio and active marble counts are capped. Reduced-motion
settings give immediate, static outcomes. A WebGL failure retains access to all
professional information and provides a retry. JavaScript-disabled visitors
have direct professional links. Old `/about`, `/contact`, `/work`, and known
`/work/[slug]` URLs continue to redirect to the appropriate home dialogs.

## Checks

```sh
npm test -- --run
npx tsc --noEmit
npm run lint
```

Tests cover rail continuity, destination branching, time bounds, single-fire
consequences, control transitions, keyboard behavior, legacy links, and WebGL
failure recovery. Some retained, unused legacy components have pre-existing
ESLint violations; the machine implementation is linted independently.

## Static Sites build

The default build preserves the existing Next.js deployment. Sites uses an
optional static export:

```sh
SITES_EXPORT=1 npm run build
```

The output is `out/`; `.openai/hosting.json` identifies the Sites project.
