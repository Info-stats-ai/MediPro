.PHONY: dev test test-backend check-frontend build up down

dev:
	docker compose up --build

up:
	docker compose up -d --build

down:
	docker compose down

test: test-backend check-frontend

test-backend:
	cd backend && pytest -q

check-frontend:
	cd frontend && npm run lint && npm run typecheck

build:
	docker compose build
