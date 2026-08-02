PORT := 5173
URL  := http://localhost:$(PORT)

.PHONY: help up down restart logs status reset clean

help: ## Lista los comandos disponibles
	@grep -E "^[a-z]+:.*##" $(MAKEFILE_LIST) | awk -F ":.*## " "{printf \"  make %-10s %s\\n\", \$$1, \$$2}"

up: ## Levanta la app en http://localhost:5173
	docker compose up -d
	@echo "Glyno corriendo en $(URL)"

down: ## Apaga la app (los datos del navegador no se tocan)
	docker compose down

restart: down up ## Apaga y vuelve a levantar

logs: ## Sigue los logs del servidor de desarrollo
	docker compose logs -f web

status: ## Estado del contenedor
	docker compose ps

reset: ## Borra perfil y diario (datos del navegador) y abre la app como recien instalada
	open "$(URL)/?reset"

clean: down ## Apaga y ademas borra el entorno Docker (volumen node_modules)
	docker compose down -v
	@echo "Entorno Docker limpio. \"make up\" lo reconstruye (tarda un poco la primera vez)."

prod: ## Compila y sirve la version de produccion (PWA con service worker) en http://localhost:4173
	docker compose exec web npm run build
	docker compose exec -d web npx vite preview --host 0.0.0.0 --port 4173
	@echo "Produccion en http://localhost:4173"
