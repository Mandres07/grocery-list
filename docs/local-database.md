# 🍃 Local database — milestone 2

The app's sample home page still works without a database. This checkpoint adds the data foundation; registration, invitations, and persistent inventory screens follow in later milestones.

## Option A: Docker Compose

Install and open [Docker Desktop](https://www.docker.com/products/docker-desktop/) if it is not already working. In the project directory:

```bash
npm run db:up
npm run db:check
```

`db:up` waits for MongoDB to become a writable primary. Initial startup may take a minute while Docker downloads the image and initializes the replica set. `db:check` should report seven passing integration tests.

Configuration:

| Item | Value |
| --- | --- |
| App database | `grocery_list` |
| Replica set | `grocery-rs` |
| Host binding | `127.0.0.1:27018` |
| MongoDB image | `mongo:8.0` |
| Storage | Dedicated Docker named volume |
| Credentials | None; loopback-only local development |

The Compose health check initializes the single-node replica set once. Data persists across `npm run db:down` and subsequent startup. Do not add `-v` to shutdown commands unless intentionally deleting local data.

## Option B: existing native MongoDB on macOS

This machine has Homebrew MongoDB and mongosh installed. They can run the same local replica set without Docker. Use this option only when Docker is not already running the database on port 27018.

In the project directory, start MongoDB in one terminal:

```bash
mkdir -p .local/mongo
mongod --dbpath .local/mongo --replSet grocery-rs --bind_ip 127.0.0.1 --port 27018
```

Leave that terminal open. After restarting your Mac or closing that terminal, run the same `mongod` command again to reopen the existing `.local/mongo` data. Accounts and saved inventory live in that directory; do not switch the app port to an empty data directory.

In a second terminal, initialize the replica set **once**:

```bash
mongosh 'mongodb://127.0.0.1:27018/?directConnection=true' --eval 'rs.initiate({_id:"grocery-rs",members:[{_id:0,host:"localhost:27018"}]})'
```

Wait a few seconds for primary election, then run:

```bash
npm run db:check
```

An `AlreadyInitialized` response on later starts means initialization has already been completed; do not reconfigure the replica set. Stop the native server with Ctrl+C in its terminal. `.local/` is ignored by Git.

## Application configuration

The development connection defaults to:

```text
mongodb://127.0.0.1:27018/grocery_list?replicaSet=grocery-rs&directConnection=true
```

No `.env.local` is needed to run the preview or verification. `.env.example` documents future application settings; real hosted credentials must remain private. Production never defaults to this local URI.

MongoDB documents `directConnection=true` for development environments exposing a single replica-set endpoint: [connection targets](https://www.mongodb.com/docs/drivers/node/current/connect/connection-targets/).

## What verification checks

`npm test` runs 36 database-independent checks covering model validation, connection reuse/retry, owner/member permissions, removal checks, and household-scoped references.

`npm run db:check` uses a fixed loopback connection and a uniquely named `grocery_list_verify_*` database. It never uses Atlas credentials or the application's configured database name. It checks:

1. Unique memberships and normalized account email indexes.
2. Multiple non-Google users and unique Google account identifiers.
3. One pending invitation per household/email, with reinvitation after revocation.
4. Household-scoped stock request deduplication.
5. Actual transaction rollback.
6. Cross-household references and category cycle rejection.
7. Owner/member permissions and revoked membership access.

It deletes only its own temporary verification database at the end. If the process is forcibly terminated, its disposable database may remain; the real `grocery_list` database is unaffected.

Schema declarations alone do not enforce cross-document references or authorization. Future API services must call the access/reference guards and use transactions for related writes. Stock adjustment endpoints are not implemented at this milestone. MongoDB unique constraints are checked by the integration tests rather than assumed from schema validation.

## Troubleshooting

- **`docker: command not found`:** install/open Docker Desktop or use the existing native MongoDB option above. This machine currently has a Docker command pointing to a missing Docker Desktop installation.
- **Cannot connect:** confirm the chosen server is running on port 27018.
- **Replica set not ready:** wait for primary election; for Docker, check `docker compose ps` and `docker compose logs mongo`.
- **Port already in use:** run only one of the Docker/native options. Do not stop an unrelated database to free the port.
- **Transactions require a replica set:** use the startup command above rather than an existing standalone MongoDB service.

## Review checkpoint

Milestone 2 has been reviewed. Lint, types, 36 unit tests, and the production build pass; the user also confirmed all seven integration tests pass against their running local replica set. Docker startup remains unverified on this machine. Registration has not been started.

Run `npm run check` and then, with MongoDB running, `npm run db:check`. Confirm all pass and send the output if startup or integration checks fail. The UI remains the design preview; the next milestone introduces registration and household creation.

For an isolated test MongoDB process, use a different port (for example 27019), a disposable data directory, and its own replica-set configuration. Keep the app’s existing process on 27018 running. Generated disposable test database names on an already-running replica set remain isolated from `grocery_list`.
