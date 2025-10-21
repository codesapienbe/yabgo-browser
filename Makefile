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

build:
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

release:
	@./scripts/release.sh || true

