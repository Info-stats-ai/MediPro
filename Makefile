.PHONY: dev test check-frontend build up down

dev:
	docker compose up --build

up:
	docker compose up -d --build

down:
	docker compose down

test: check-frontend

check-frontend:
	cd frontend && npm run lint && npm run typecheck

build:
	docker compose build
