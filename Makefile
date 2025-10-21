.PHONY: build test clean install release deploy sign help

help:
	@echo "YABGO Browser - Available Make Targets"
	@echo ""
	@echo "Building:"
	@echo "  make build        	- Build the application locally"
	@echo "  make deploy       	- Build Linux AppImage for distribution"
	@echo "  make sign   		- Build and sign AppImage with GPG"
	@echo "  make release      	- Create release distribution"
	@echo ""
	@echo "Maintenance:"
	@echo "  make install      	- Install dependencies"
	@echo "  make test         	- Run tests"
	@echo "  make clean        	- Clean build artifacts"
	@echo ""

install: clean
	npm install --include=dev

build: install
	@echo "Building YABGO Browser locally..."
	npm run build

deploy:
	@echo "Building Linux AppImage for distribution..."
	npx electron-builder --linux AppImage --x64 --publish never

sign: deploy
	@echo "Signing AppImage with GPG..."
	npm run build:sign

test:
	npm run test

clean:
	@echo "Cleaning build artifacts..."
	rm -rf dist release .cache .parcel-cache .npm .yarn npm-debug.log* yarn-debug.log* yarn-error.log*
	@echo "Clean complete!"

run:
	@echo "Starting YABGO Browser in dev mode..."
	npm run dev

release: build
	@./scripts/release.sh || true
