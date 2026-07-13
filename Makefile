# Satisfactory Trains — Vite + React + TS

# Use bash for recipes
SHELL := /bin/bash

# package manager (override with `make PNPM=npm ...`)
PNPM ?= pnpm

# Dev/preview server port — `make dev PORT=3000` / `make preview PORT=3000`.
# npm needs a `--` before forwarding flags to the script; pnpm/yarn/bun don't.
PORT ?=
ifeq ($(PNPM),npm)
  argsep := --
else
  argsep :=
endif
portflag = $(if $(PORT),$(argsep) --port $(PORT))

.DEFAULT_GOAL := help

.PHONY: help install dev build preview lint typecheck test test-watch clean distclean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-12s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	$(PNPM) install

dev: node_modules ## Start the dev server (PORT=n to set port)
	$(PNPM) run dev $(portflag)

build: node_modules ## Type-check and build for production
	$(PNPM) run build

preview: build ## Preview the production build locally (PORT=n to set port)
	$(PNPM) run preview $(portflag)

lint: node_modules ## Run oxlint
	$(PNPM) run lint

typecheck: node_modules ## Type-check app + tests without emitting
	$(PNPM) exec tsc -- --noEmit -p tsconfig.app.json
	$(PNPM) run test:types

test: node_modules ## Run the test suite once
	$(PNPM) run test

test-watch: node_modules ## Run tests in watch mode
	$(PNPM) run test:watch

clean: ## Remove build output
	rm -rf dist

distclean: clean ## Remove build output and installed dependencies
	rm -rf node_modules

# Install deps when package.json is newer than node_modules
node_modules: package.json
	$(PNPM) install
	@touch node_modules
