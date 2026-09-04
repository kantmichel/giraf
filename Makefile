.PHONY: all update install run docker-build docker-run docker-stop

all: update install run

update:
	git pull

install:
	bun install

run:
	npm run dev

# Production image, same one CI builds and Dokploy runs.
docker-build:
	docker build -t giraf:local .

# Runs it on http://localhost:3000 with .env.local for secrets and a named
# volume for the database. Set NEXTAUTH_URL=http://localhost:3000 there.
docker-run:
	docker compose up --build

docker-stop:
	docker compose down
