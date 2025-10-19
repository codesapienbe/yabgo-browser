.PHONY: run build test clean install release help

help:
	@echo "YABGO Browser - Available Make Targets"
	@echo ""
	@echo "Development:"
	@echo "  make run          	- Build and run in production mode (real-world experience)"
	@echo ""
	@echo "Building:"
	@echo "  make build        	- Build distribution (AppImage on Linux, installer on Windows)"
	@echo "  make sign   		- Sign AppImage with GPG"
	@echo "  make release      	- Create release distribution"
	@echo ""
	@echo "Maintenance:"
	@echo "  make install      	- Install dependencies"
	@echo "  make test         	- Run tests"
	@echo "  make clean        	- Clean build artifacts"
	@echo ""

install:
	npm install

run:
	# Run the application without building; assume developer has built assets and native modules
	if [ -x "$(npm bin)/electron" ]; then \
		$(npm bin)/electron --no-sandbox .; \
	else \
		npx electron --no-sandbox .; \
	fi

build:
	# Ensure native modules are rebuilt for the current Electron runtime before building
	# This prevents invalid ELF/header errors from mismatched prebuilt binaries
	if [ -x "$(npm bin)/electron-rebuild" ]; then \
		$(npm bin)/electron-rebuild -f -w better-sqlite3 || true; \
	else \
		npx electron-rebuild -f -w better-sqlite3 || true; \
	fi
	npm run build

sign:
	npm run build:sign

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh || true
	npm run build:snap