# Container Engine Development Makefile

.PHONY: help dev build test clean setup db-up db-down db-reset migrate format lint check docker-build docker-up

# Default target
help:
	@echo "Container Engine Development Commands:"
	@echo ""
	@echo "Setup:"
	@echo "  make setup          - Initial project setup"
	@echo "  make db-up          - Start database services"
	@echo "  make db-down        - Stop database services"
	@echo "  make db-reset       - Reset database and volumes"
	@echo "  make migrate        - Run database migrations"
	@echo ""
	@echo "Development:"
	@echo "  make dev            - Start development server"
	@echo "  make build          - Build the project"
	@echo "  make test           - Run tests"
	@echo "  make check          - Check code without building"
	@echo "  make format         - Format code"
	@echo "  make lint           - Run linting"
	@echo ""
	@echo "Docker:"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-up      - Start all services with Docker"
	@echo "  make docker-down    - Stop all Docker services"
	@echo ""
	@echo "Utilities:"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make sqlx-prepare   - Prepare SQLx offline queries"

# Initial setup
setup:
	@echo "Setting up Container Engine development environment..."
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env file"; fi
	@cargo --version || (echo "Rust not found. Install from https://rustup.rs/" && exit 1)
	@docker --version || (echo "Docker not found. Please install Docker" && exit 1)
	@docker-compose --version || (echo "Docker Compose not found. Please install Docker Compose" && exit 1)
	@echo "Installing SQLx CLI..."
	@cargo install sqlx-cli --no-default-features --features native-tls,postgres || true
	@echo "Setup complete! Run 'make db-up && make migrate && make dev' to start"

# Database management
db-up:
	@echo "Starting database services..."
	@docker-compose up postgres redis -d
	@echo "Waiting for databases to be ready..."
	@sleep 5

db-down:
	@echo "Stopping database services..."
	@docker-compose stop postgres redis

db-reset:
	@echo "Resetting database..."
	@docker-compose stop postgres redis
	@docker-compose rm -f postgres redis
	@docker volume rm open-container-engine_postgres_data open-container-engine_redis_data 2>/dev/null || true
	@make db-up
	@sleep 5
	@make migrate

migrate:
	@echo "Running database migrations..."
	@export DATABASE_URL="postgresql://postgres:password@localhost:5432/container_engine" && \
	sqlx migrate run

# Development
dev: db-up
	@echo "Starting development server..."
	@cargo run

build:
	@echo "Building project..."
	@cargo build

test:
	@echo "Running tests..."
	@cargo test

check:
	@echo "Checking code..."
	@cargo check

format:
	@echo "Formatting code..."
	@cargo fmt

lint:
	@echo "Running linter..."
	@cargo clippy -- -D warnings

# SQLx utilities
sqlx-prepare:
	@echo "Preparing SQLx queries for offline compilation..."
	@export DATABASE_URL="postgresql://postgres:password@localhost:5432/container_engine" && \
	cargo sqlx prepare

# Docker
docker-build:
	@echo "Building Docker image..."
	@docker build -t container-engine .

docker-up:
	@echo "Starting all services with Docker..."
	@docker-compose up --build

docker-down:
	@echo "Stopping all Docker services..."
	@docker-compose down

# Cleanup
clean:
	@echo "Cleaning build artifacts..."
	@cargo clean
	@docker system prune -f

# Development workflow shortcuts
full-setup: setup db-up migrate sqlx-prepare
	@echo "Full setup complete!"

restart: db-down db-up migrate dev

fresh-start: clean db-reset sqlx-prepare dev