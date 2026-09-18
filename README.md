# Task Management API

Node.js + Express.js REST API for managing tasks: full CRUD, filtering, search,
pagination, sorting, validation, and reporting endpoints. No database — in-memory store.

## Requirements
- Docker + Docker Compose (no local Node.js install needed — everything runs in a container)

## Setup & Run

```bash
cp .env.example .env
docker compose up
```

The API is now available at `http://localhost:3000`.

## Run tests

```bash
docker compose run --rm api npm test
```

## Lint / format

```bash
docker compose run --rm api npm run lint
docker compose run --rm api npm run format
```

## Postman collection & test-run evidence

A Postman collection (v2.1 schema) covering full CRUD, filtering/search, and the reporting
endpoint — plus negative cases (400/404) — lives in `postman/`. Run the tests with Newman
against a running server:

```bash
docker compose up -d
docker compose exec api npm run postman:test
docker compose down
```

This generates `postman/report.html` and `postman/report.json`, both checked into this repo as
test-run evidence. To view the HTML report interactively after cloning, just open
`postman/report.html` directly in a browser (double-click it, or drag it into a browser tab) —
it's a self-contained page, no server needed. It loads its styling/charts from a CDN, so an
internet connection is required to see it fully styled.

## Project structure

```
src/
├── app.js                  # Express app setup
├── server.js               # Entry point
├── controllers/            # Route handlers
├── middleware/              # Logger, validation, error handler
├── models/                 # Task model and constants
├── routes/                 # Express routers
├── services/               # Business logic
└── utils/                  # AppError hierarchy
tests/                      # Jest test suites
postman/                    # Postman collection + environment
```
