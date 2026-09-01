.PHONY: all update install run

all: update install run

update:
	git pull

install:
	bun install

run:
	npm run dev
