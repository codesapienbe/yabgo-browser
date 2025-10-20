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

build:
	# Ensure native modules are rebuilt for the current Electron runtime before building
	# This prevents invalid ELF/header errors from mismatched prebuilt binaries
	if [ -x "$(npm bin)/electron-rebuild" ]; then \
		$(npm bin)/electron-rebuild -f -w better-sqlite3 || true; \
	else \
		npx electron-rebuild -f -w better-sqlite3 || true; \
	fi
	# Build the app and build a Docker image containing the runnable Electron app
	npm run build
	# Build docker image (tag: yabgo-browser:latest)
	docker build -t yabgo-browser:latest .

sign:
	npm run build:sign

run:
	@echo "Running YABGo Browser in Docker..."
	# Run the application in Docker with X11, XAUTH, audio and GPU mounts
	@echo "Starting app in Docker (ensure X is forwarded):";
	# Validate DISPLAY
	if [ -z "${DISPLAY}" ]; then \
		echo "ERROR: DISPLAY is not set on the host. You need an X server available to run the GUI inside Docker."; \
		echo "If you want to run locally use 'make run' (without DOCKER=1). To run in docker ensure DISPLAY is exported, e.g. export DISPLAY=":0""; \
		exit 1; \
	fi; \

	# Allow override of XAUTH path via environment variable; default to ${HOME}/.Xauthority
	XAUTH_PATH="${XAUTH:-${HOME}/.Xauthority}"; \
	XAUTH_ARGS=""; \
	if [ -f "$$XAUTH_PATH" ]; then \
		echo "Using XAUTH: $$XAUTH_PATH"; \
		XAUTH_ARGS="-e XAUTHORITY=$$XAUTH_PATH -v $$XAUTH_PATH:$$XAUTH_PATH:ro"; \
	else \
		echo "No XAUTH file found at $$XAUTH_PATH; you can either run 'xhost +local:root' before running or set XAUTH env to point to your .Xauthority file."; \
		XAUTH_ARGS=""; \
	fi; \

	# Pulse audio socket (per-user)
	PULSE_SOCKET="/run/user/$$(id -u)/pulse/native"; \
	PULSE_ARGS=""; \
	if [ -S "$$PULSE_SOCKET" ]; then \
		PULSE_ARGS="-v $$PULSE_SOCKET:$$PULSE_SOCKET:ro -e PULSE_SERVER=unix:$$PULSE_SOCKET"; \
	fi; \

	# DBus socket (optional)
	DBUS_ARGS=""; \
	if [ -S "/run/dbus/system_bus_socket" ]; then \
		DBUS_ARGS="-v /run/dbus/system_bus_socket:/run/dbus/system_bus_socket:ro"; \
	fi; \

	docker run --rm $${XAUTH_ARGS} -e DISPLAY=$$DISPLAY -v /tmp/.X11-unix:/tmp/.X11-unix $${PULSE_ARGS} $${DBUS_ARGS} \
		--device /dev/snd --device /dev/dri --shm-size=1g --user $$(id -u):$$(id -g) --network host \
		yabgo-browser:latest

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh || true
	npm run build:snap

