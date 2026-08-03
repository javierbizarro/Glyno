PORT := 5173
URL  := http://localhost:$(PORT)

.PHONY: help up down restart logs status reset clean test hooks

help: ## List the available commands
	@grep -E "^[a-z]+:.*##" $(MAKEFILE_LIST) | awk -F ":.*## " "{printf \"  make %-10s %s\\n\", \$$1, \$$2}"

up: hooks ## Start the app at http://localhost:5173
	docker compose up -d
	@echo "Glyno running at $(URL)"

test: ## Run type-check + test suite (inside Docker)
	docker compose exec -T web npx tsc --noEmit
	docker compose exec -T web npx vitest run

hooks: ## Point git at the versioned hooks (pre-commit runs the tests)
	@git config core.hooksPath .githooks

down: ## Stop the app (browser data is not touched)
	docker compose down

restart: down up ## Stop and start again

logs: ## Follow the dev server logs
	docker compose logs -f web

status: ## Container status
	docker compose ps

reset: ## Wipe profile and diary (browser data) and open the app as freshly installed
	open "$(URL)/?reset"

clean: down ## Stop and also remove the Docker environment (node_modules volume)
	docker compose down -v
	@echo "Docker environment clean. \"make up\" rebuilds it (the first time takes a while)."

prod: ## Build and serve the production version (PWA with service worker) at http://localhost:4173
	docker compose exec web npm run build
	docker compose exec -d web npx vite preview --host 0.0.0.0 --port 4173
	@echo "Production at http://localhost:4173"
