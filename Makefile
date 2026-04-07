.PHONY: update install dev

update:
	git pull

install:
	bun install

run:
	npm run dev

all: update install run
