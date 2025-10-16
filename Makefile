.PHONY: run build dev test clean install help

# Default target
help:
	@echo "Available targets:"
	@echo "  run     - Run the application in production mode"
	@echo "  build   - Build the application for Linux"
	@echo "  dev     - Start development mode with hot reload"
	@echo "  test    - Run tests"
	@echo "  clean   - Clean build artifacts"
	@echo "  install - Install dependencies"

# Install dependencies
install:
	npm install

# Run the application in production mode
run:
	npm run prod

# Build the application
build:
	npm run build

# Start development mode
dev:
	npm run dev

# Run tests
test:
	npm run test

# Clean build artifacts
clean:
	npm run clean
