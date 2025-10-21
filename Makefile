.PHONY: build test clean install release help

help:
	@echo "YABGO Browser - Available Make Targets"
	@echo ""
	@echo "Building:"
	@echo "  make build        	- Build the application locally"
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

# Ensure install runs before build so devDependencies (typescript, webpack, etc.) are present
build: install
	@echo "Building YABGO Browser locally..."
	npm run build
	@echo "Installing production dependencies..."
	npm ci --only=production

sign:
	npm run build:sign

test:
	npm run test

clean:
	npm run clean

# Run the application in development mode. Ensure devDependencies are installed first
run: install
	@echo "Starting YABGO Browser in dev mode..."
	npm run dev

release:install build
	@./scripts/release.sh || true
