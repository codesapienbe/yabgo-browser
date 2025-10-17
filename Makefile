.PHONY: run build dev test clean install release prod help

help:
	@echo "YABGO Browser - Available Make Targets"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Run in development mode (watch mode, hot reload)"
	@echo "  make run          - Build and run in production mode (real-world experience)"
	@echo ""
	@echo "Building:"
	@echo "  make build        - Build distribution (AppImage on Linux, installer on Windows)"
	@echo "  make prod         - Production build and run with Electron"
	@echo "  make release      - Create release distribution"
	@echo ""
	@echo "Maintenance:"
	@echo "  make install      - Install dependencies"
	@echo "  make test         - Run tests"
	@echo "  make clean        - Clean build artifacts"
	@echo ""

install:
	npm install

run:
	npm run prod

build:
	@OS_NAME=`uname -s`; \
	if [ "$${OS_NAME}" = "Linux" ] || [ "$${OS_NAME}" = "Darwin" ]; then \
		echo "Detected $${OS_NAME}: running Linux/macOS build (npm run build)"; \
		npm run build; \
	elif echo "$${OS_NAME}" | grep -qE 'MINGW|MSYS|CYGWIN'; then \
		echo "Detected Windows environment ($${OS_NAME}): running Windows build (npm run build:win)"; \
		npm run build:win; \
	else \
		echo "Unknown OS: $${OS_NAME}. Please run the appropriate build script manually."; \
		exit 1; \
	fi

dev:
	npm run dev

prod:
	npm run prod

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh
