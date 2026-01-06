## Carlos Mata – Portfolio (Provisional README)

This repository contains the personal portfolio of **Carlos Mata**, a **Software Engineer** with experience in **C++ / ROS2 / Qt**, data platforms and **Linux** environments.

### Main technologies

- **Framework**: Next.js 16 (App Router, `src/app` directory)
- **Libraries**: React 19, React DOM 19
- **Styling**: Tailwind CSS 4
- **Animations**: Framer Motion
- **Language**: TypeScript

### Overall structure

- `src/app/layout.tsx`: root layout, font setup (`Inter`, `Playfair Display`) and basic metadata.
- `src/app/(site)/layout.tsx`: main site layout; wraps the content with `Header` and `TextModeProvider`.
- `src/app/(site)/page.tsx`: home page with hero (name, role, stack, location), CTA to **Work**, CV download (`/cv.pdf`) and project panel.
- `src/app/(site)/about/page.tsx`: **About** page (content to be refined/completed).
- `src/app/(site)/work/page.tsx`: **Work** page (currently a placeholder: “Coming next: case studies”, planned for detailed case studies).
- `src/app/(site)/contact/page.tsx`: **Contact** page (also a placeholder for now).
- `src/components/Header.tsx`: header with navigation (`Work`, `About`, `Contact`) and a button to toggle text mode.
- `src/components/TextModeProvider.tsx`: global context that manages **text mode** (a more editorial/table-like view), persisted in `localStorage`.
- `src/components/ProjectGrid.tsx`: project grid; switches between:
  - visual card view (`ProjectCard`) and
  - editorial index-style rows (`ProjectRow`),
  depending on `textMode`.
- `src/content/projects.ts`: typed data source (`CaseStudy[]`) with detailed case studies like `PROJECT AURA`, `SYNAPSE DATA` and `QUANTUM EDGE`, including `slug`, description, tags, context, problem, approach, outcome, and metadata (year, role, status, duration).

### Key portfolio features

- **Clear hero**: full name, role (`Software Engineer`), main tech stack and location (Madrid).
- **Project listing**:
  - Animated cards with Framer Motion (`ProjectCard`) linked to anchors in `Work` (`/work#slug`).
  - Alternative text mode view (`ProjectRow`) with numbering, short description and tags on the right.
- **Persistent text mode**:
  - “Text mode ON/OFF” button in the header.
  - State stored in `localStorage` (`cm:textMode`) and restored on reload.
- **Editorial / monochrome design**:
  - Serif typography for headings and sans for body text.
  - Greyscale palette controlled via CSS variables (`--bg`, `--muted`, `--line`, `--accent`).

### Local installation and usage

1. **Install dependencies**

```bash
npm install
```

2. **Start the development server**

```bash
npm run dev
```

3. **Open in the browser**

Go to `http://localhost:3000`.

### Available scripts

- **`npm run dev`**: starts the Next.js development server.
- **`npm run build`**: creates the production build.
- **`npm run start`**: runs the server with the existing production build.
- **`npm run lint`**: runs ESLint using the Next.js config.

### Deployment

The project is ready to be deployed on any Next.js-compatible platform (for example Vercel).  
In production, use:

- `npm run build` to generate the production artifacts.
- `npm run start` to serve the application.

### Next steps (ideas for evolution)

- Fill in content on the `About`, `Work` (with detailed case studies) and `Contact` pages.
- Add per-project detail pages (`/work/[slug]`) reusing data from `src/content/projects.ts`.
- Add real thumbnails under `thumbs/` and populate the `thumb` field for each project.
- Improve SEO (per-route metadata, Open Graph, etc.) and accessibility (labels, focus handling, contrast).

> This README is **provisional** and intended as a technical and functional overview of the portfolio. The tone (more personal vs. more corporate) can be adjusted depending on how you want to present your work.
