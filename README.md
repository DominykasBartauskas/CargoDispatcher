# Cargo Dispatcher

A single-page **Satisfactory logistics network planner**. Model your worlds, the
vehicles that move cargo (trains, trucks, and drones), and the stations they
dock at — then let the built-in analysis engine tell you how cargo *actually*
flows and what's misconfigured before you build any of it in-game.

Built with React + TypeScript + Vite. It's a rewrite of an original single-file
prototype, split into a framework-free logic layer and a React UI.

## What it does

You build up a network from a few primitives:

- **Worlds** — top-level containers; switch between multiple saved networks.
- **Trains** — a car consist (Engine / Freight / fluid car) running a looped
  route of stops, with per-stop load/unload rules.
- **Stations** — one or more platforms, each with a type (regular / fluid /
  empty) and a load-or-unload mode.
- **Trucks & truck stations** — road vehicles (truck, fluid truck, tractor,
  explorer) on looped routes docking at single-dock stations.
- **Drones & drone ports** — aerial vehicles that shuttle cargo both ways
  between exactly two ports.

The **analysis engine** simulates the loop: it computes what each car picks up
per stop, traces every pickup forward until it can unload, and then reports
structural warnings, load/unload errors, and platform contention. Fluids may
only ride fluid cars and dock fluid platforms — a rule the engine enforces
throughout.

Networks are persisted automatically. Storage is tiered and chosen at load:
Claude artifact storage → `localStorage` → in-memory. You can also import and
export a world as JSON.

## Getting started

Package manager is **pnpm**. A `Makefile` wraps the common scripts — run
`make help` for the full list.

```sh
make install     # install dependencies
make dev         # start the dev server (make dev PORT=3000 to override)
```

## Commands

| Command | What it does |
| --- | --- |
| `make dev` | Dev server with HMR (`PORT=n` to override the port) |
| `make build` | Type-check (app + tests) then produce a production build |
| `make preview` | Preview the production build locally |
| `make lint` | Run oxlint |
| `make typecheck` | Type-check the app and tests without emitting |
| `make test` | Run the Vitest suite once |
| `make test-watch` | Run tests in watch mode |

To run a single test file: `pnpm exec vitest run src/lib/analysis.test.ts`
(add `-t "name"` to filter by test name). The equivalent `pnpm` scripts
(`pnpm dev`, `pnpm build`, …) work too.

## Architecture

The code is split into two layers:

- **`src/lib/`** — a framework-free logic layer with no React dependency: the
  domain model and migrations (`model.ts`, `types.ts`), the item catalog
  (`catalog.ts`), tiered persistence (`storage.ts`), and the heart of the app,
  the analysis engine (`analysis.ts`). The model and analysis tests live here.
- **`src/components/` + `App.tsx`** — the React UI. `App.tsx` owns the entire
  app state in one `useState` and mutates it through a single clone-and-mutate
  `update` helper passed down to every view. The UI is section-based (trains,
  stations, trucks, drones, analysis), switched by `state.section`.

See [`CLAUDE.md`](./CLAUDE.md) for a deeper tour of the state model,
persistence, analysis engine, and project conventions.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4 (design system in `src/index.css`),
oxlint, and Vitest + Testing Library + jsdom for tests.
