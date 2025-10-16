.PHONY: run build dev test clean install release

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

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh
