.PHONY: run build dev test clean install release

install:
	npm install

run:
	npm run prod

build:
	npm run build

dev:
	npm run dev

test:
	npm run test

clean:
	npm run clean

release:
	@./scripts/release.sh
