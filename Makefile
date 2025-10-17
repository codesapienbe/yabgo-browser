.PHONY: run build dev test clean install release prod help

help:
	@echo "YABGO Browser - Available Make Targets"
	@echo ""
	@echo "Development:"
	@echo "  make run          - Build and run in production mode (real-world experience)"
	@echo ""
	@echo "Building:"
	@echo "  make build        - Build distribution (AppImage on Linux, installer on Windows)"
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
	npm run build

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh
