PORT := 5173
URL  := http://localhost:$(PORT)
# native (host-only: Capacitor and Xcode cannot run in Docker)
SIM    := iPhone 17
APP_ID := app.glyno
DD     := ios/build

.PHONY: help up down restart logs status reset clean test hooks native ios

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

native: ## Build the web assets for the native app (Capacitor webDir: dist)
	docker compose exec -T -e NATIVE=1 web npm run build
	@echo "dist/ built for the native app: root paths, no service worker."

ios: native ## Build and run the app on the iOS simulator (Xcode on the Mac, not Docker)
	npx cap copy ios
	# signed even for the simulator: without it the entitlements are dropped and HealthKit throws
	xcodebuild -project ios/App/App.xcodeproj -scheme App -sdk iphonesimulator \
	  -configuration Debug -destination 'platform=iOS Simulator,name=$(SIM)' \
	  -derivedDataPath $(DD) CODE_SIGN_IDENTITY="-" CODE_SIGNING_REQUIRED=NO build | tail -2
	-xcrun simctl boot "$(SIM)"
	xcrun simctl install booted $(DD)/Build/Products/Debug-iphonesimulator/App.app
	-xcrun simctl terminate booted $(APP_ID)
	xcrun simctl launch booted $(APP_ID)
	open -a Simulator

prod: ## Build and serve the production version (PWA with service worker) at http://localhost:4173
	docker compose exec web npm run build
	docker compose exec -d web npx vite preview --host 0.0.0.0 --port 4173
	@echo "Production at http://localhost:4173"
