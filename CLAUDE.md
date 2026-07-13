# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page **Satisfactory logistics network planner** ("Cargo Dispatcher"): you define worlds → trains (car consists + looped routes) → stations (platforms), and an analysis engine reports how cargo actually flows and what's misconfigured. It is a React + TypeScript + Vite rewrite of an original single-file prototype.

## Commands

Package manager is **pnpm**. A `Makefile` wraps the scripts (run `make help` for the list).

- `make dev` / `pnpm dev` — dev server (`make dev PORT=3000` to override the port; the Makefile handles pnpm-vs-npm flag forwarding)
- `make build` / `pnpm build` — `tsc -b` (type-checks app **and** tests) then `vite build`
- `make lint` / `pnpm lint` — oxlint
- `make test` / `pnpm test` — Vitest once; `make test-watch` for watch mode
- `pnpm exec vitest run src/lib/analysis.test.ts` — run one test file; add `-t "ERROR B"` to run tests matching a name
- `make typecheck` — type-checks the app (`tsconfig.app.json`) and the tests (`tsconfig.vitest.json`)

## Architecture

The code is split into a framework-free **logic layer** (`src/lib/`) and a **React layer** (`src/components/` + `App.tsx`). Keep domain logic in `lib/` — it has no React dependency and is where the analysis/model tests live.

**State ownership.** `App.tsx` holds the entire `AppState` (worlds, active index, section, collapsed map) in one `useState`. All mutations go through a single `update(fn)` helper that `structuredClone`s the state, lets `fn` mutate the draft in place, and sets it back. This immutable-via-clone pattern is passed down to every view as the `Update` type — views locate the active world/train/station by id inside the mutator (e.g. `update(s => { s.worlds[s.active]... })`). There is no reducer and no external store; follow this pattern rather than introducing one.

**Persistence** (`lib/storage.ts`) is tiered and chosen once at module load: `cloud` (Claude artifact `window.storage`) → `localStorage` → `memory`. `App` loads once on mount and then writes on every change via a **debounced effect gated behind a `ready` ref**, so the initial default state can't clobber persisted data before the async load resolves. Saved worlds run through `migrateWorld` (in `lib/model.ts`) which upgrades older on-disk shapes — preserve backward compatibility there.

**The analysis engine** (`lib/analysis.ts`) is the heart of the app and the highest-risk code. `analyze(world)` returns `{ errors, warnings, pickups, deposits }`. It simulates the loop: computes what each train car picks up per stop, traces each pickup forward until it can unload, then derives structural warnings, load/unload errors, and platform contention. `errors`/`warnings` are **pre-escaped HTML strings** (built with `esc()`) rendered via `dangerouslySetInnerHTML` in `AnalysisView`; keep that contract. `App` memoizes `analyze(world)` and shares the result with both the analysis view and the section-nav badge.

**Views** are section-based, switched by `state.section`: `TrainsView` (consist editor — click a car to cycle E→F→L; route/stop builder), `StationsView` (platforms with type/mode toggles and item editors), `AnalysisView`. `WorldBar` and `SectionNav` are the chrome. `RuleEditor`, `ItemSelect` (grouped catalog `<select>`), and the dialogs are shared.

**Dialogs.** Native `confirm`/`prompt` are blocked in sandboxed iframes, so all confirmations use a promise-based API: `DialogsProvider` (wraps `<App>` in `main.tsx`) renders a single `<dialog>` and provides `useDialogs()` → `{ confirm, prompt, notice }`. Import/export use their own `<dialog>` components.

**Drag-and-drop** reordering of train/station cards is centralized in the `useReorder` hook (`lib/useReorder.ts`).

## Conventions & gotchas

- **`verbatimModuleSyntax` is on** — import types with `import type { … }`, and `erasableSyntaxOnly` forbids enums / parameter properties. Use union types and plain interfaces.
- The **item catalog** (`lib/catalog.ts`) is the source of truth for valid items and which are fluids (`isFluid`). Fluids may only ride fluid cars (`L`) and dock fluid platforms; this rule recurs throughout the analysis and platform code.
- **Styling is a Tailwind v4 design system in `src/index.css`**: `:root` design tokens live in `@theme` (so utilities like `bg-panel`, `text-accent`, `font-display` exist), and the legacy component classes (`.card`, `.railcar`, `.plat`, `.issue`, …) are reproduced in `@layer components`. Views use those class names, not utility soup — extend the design system there rather than hardcoding colors.
- **Tests** use Vitest + Testing Library + jsdom. `src/test/setup.ts` polyfills `HTMLDialogElement.showModal()`/`close()` (jsdom lacks them) and clears `localStorage` between tests. Test files are excluded from `tsconfig.app.json` and covered by `tsconfig.vitest.json`.
