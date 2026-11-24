# Yaswanth Sai Venkatesan — Portfolio

A scroll-driven 3D portfolio drawn entirely in two colours: porcelain and oxblood line art. The whole site is one office. Every part of it is always standing (the desks, the model floor, the server room, the book at the back, the final desk at the front), and each scroll moves the camera to a different part of the office.

**Live:** <https://yaswanthsai-venkatesan.vercel.app>

## The scroll story

| Section | What happens |
| --- | --- |
| **Home** | A large curved office with three project zones of nine desks each (27 people). Each zone has a wall screen showing a live project (AgentReplay, InferencePilot, KernelForge), and the projects rotate across the screens. Click a person at a desk to see the feature they're working on; click again for the next one. |
| **Projects** | The wall screens lower into their cabinets to clear the view, and the camera moves to the model floor. Each project builds itself as a working miniature on the floor in front of the server room: components rise one by one, tracks are laid between them, then data packets run through. Requests over the rate limit bounce back at the gateway, and DeployGuard's risky release queues up at its gate. Half the team works around the model. Scroll on and the system sinks into the floor while the next one builds: Feather AI, Intelligent API Gateway, DocuIntel AI and DeployGuard AI. |
| **Experience** | At the back of the office (visible from every earlier section), a clothbound book on a writing table opens as you arrive. Each role is a chapter: the left page holds the numeral, years and tools, and the right page holds an animated figure of the work. Pages turn as you scroll. The current chapter is still being written. |
| **Contact** | The camera rises up over the whole office and comes down at the front, where the team merges into one figure at a desk, with five screens about where AI is heading fanned out above. The office stays behind, dimmed. Click the figure to see what Yaswanth is building right now; each click shows the next thing, rotating through the three live projects. The inverted oxblood contact panel sits below. |

Every scene respects `prefers-reduced-motion` (it shows still frames that change per section) and has a lighter mobile version.

## Design system

- **Colour:** porcelain `#F3EFEB` and oxblood `#4B1724` only. Variations come from opacity; there are no other hues, gradients or shadows.
- **Type:** Cormorant Garamond (display), Manrope (body), IBM Plex Mono (labels).
- **3D style:** porcelain faces with oxblood edge lines, same-colour fog, and flat 2D pictogram people that always face the camera.

## Tech stack

- React 19 + Vite 5
- Three.js with `@react-three/fiber`
- Tailwind CSS v4
- React Router (the home page plus `/resume`)
- Deployed on Vercel

All the screens, pages and figures in the scene are drawn on `<canvas>` at runtime. There are no image assets apart from the favicon and the résumé PDF.

## Run locally

```bash
git clone https://github.com/Yaswanth2120/yaswanth-portfolio.git
cd yaswanth-portfolio
npm install
npm run dev        # http://localhost:5173
```

```bash
npm run build      # production build into dist/
npm run preview    # serve the build locally
npm run lint
```

## Project structure

```text
src/
  data/content.js        All site copy: intro, live projects, projects, experience, education, contact
  pages/Home.jsx         Page sections (one per scroll stop) and the scroll tracking
  lib/scroll.js          Shared scroll position (a fractional "stop" index) read by the scene
  scene/
    OfficeScene.jsx      The 3D scene: office, people, model floor, server room, book, final desk
    choreography.js      Timeline: where everyone is, camera keys and fades at each scroll stop
    pictogram.js         The 2D people (poses drawn to canvas textures)
    screens.js           Drawing helpers, desk-monitor screens, server-rack lights
    systems.js           The model floor: each project's system as nodes and links
    demos.js             Live-project wall screens, agent cards, final screens
    book.js              The experience book's pages and animated figures
public/
  Yaswanth_Resume.pdf    Served at /resume
```

## Editing content

Most edits only touch `src/data/content.js`:

- **Projects:** `projects.items` holds 4 entries. Each project's model is defined in `src/scene/systems.js` (the `SYSTEMS` array, in the same order) as nodes (services, stores, gates, models…) and the links packets travel along.
- **Live projects:** `liveProjects` holds 3 entries (one office zone each), with the features shown when you click a person.
- **Experience:** `experience.items`. If you change how many roles there are, also update `JOBS` in `src/scene/choreography.js`. Each role's book figure is in `src/scene/book.js` (`FIGURES`).

The scroll timeline expects one page section per stop: intro, 4 projects, the roles, then contact.

## Deployment

Pushing to `main` deploys to production on Vercel. `vercel.json` rewrites every path to the single-page app, so `/resume` works on refresh.

## Branches

- `main` is the live site, with the "Chapters" book experience.
- `one-office` makes the whole site one continuous office: every section stays standing and the camera moves between them.
- `projects-model-floor` is the model-floor projects section on its own.
- `experience-the-walk` is an alternative experience section, "The Walk": monoliths rise along a path as you walk it.
