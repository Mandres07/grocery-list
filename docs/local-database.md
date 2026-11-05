# Local database

Accounts, household sharing, inventory, and shopping use real persisted data. Local development is separate from the deployed Atlas databases. The local database configuration is:

| Setting | Value |
| --- | --- |
| App database | `grocery_list` |
| Replica set | `grocery-rs` |
| Loopback port | `127.0.0.1:27018` |
| Docker image / storage | `mongo:8.0` / dedicated named volume |
| Existing native storage on this workstation | `.local/mongo` |

Transactions require a replica set. Use **one** startup method, keeping the existing saved data directory or Docker volume. Do not start Docker on port 27018 while native MongoDB is already using it, and do not replace a saved instance with an empty test directory.

## Docker Compose

With [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running:

```bash
npm run db:up
npm run db:check
```

`db:up` waits for a writable primary; the health check initializes the single-node replica set once. Initial startup may take longer while the image downloads.

```bash
npm run db:down
```

Shutdown preserves the named volume. Do not add `-v` unless intentionally deleting that data. Docker startup has not been validated on this workstation because Docker Desktop was unavailable; native MongoDB is the verified path here. Do not infer Docker verification from successful native integration tests.

## Native MongoDB

This workstation has `mongod`, `mongosh`, `mongodump`, and `mongorestore`. On a new machine, install MongoDB Community Server, mongosh, and MongoDB Database Tools first. From the repository, reopen the existing database in a terminal:

```bash
mkdir -p .local/mongo
mongod --dbpath .local/mongo --replSet grocery-rs --bind_ip 127.0.0.1 --port 27018
```

Keep that process running. After a restart, use the same command/directory; saved accounts and inventory are not stored in the Next.js process.

For a **new, uninitialized** local replica only, initialize it in another terminal:

```bash
mongosh 'mongodb://127.0.0.1:27018/?directConnection=true' --eval 'rs.initiate({_id:"grocery-rs",members:[{_id:0,host:"localhost:27018"}]})'
```

Wait for primary election, then run `npm run db:check`. An `AlreadyInitialized` result on an existing database means no further initialization is needed; do not reconfigure it. Ctrl+C in its terminal stops that native process. `.local/` is ignored by Git.

## Application configuration

The local development fallback is:

```text
mongodb://127.0.0.1:27018/grocery_list?replicaSet=grocery-rs&directConnection=true
```

`.env.example` documents local values. The database alone needs no Atlas credentials; the app additionally needs its own session secret and Resend settings in ignored `.env.local` for sign-in/email. See [accounts](accounts.md). Production requires explicit connection values and never silently falls back to localhost.

The original local accounts/inventory remain local. Production started fresh by user choice. Atlas maintenance uses a separate `.env.atlas.local`; generated Vercel imports use separate ignored files. Do not overwrite `.env.local` to run a hosted maintenance command. See [hosted database](hosted-database.md).

## Verification and required tools

`npm test` runs database-independent unit tests. `npm run db:check` uses the fixed loopback replica and generated `grocery_list_verify_*`, `grocery_list_maintenance_*`, and `grocery_list_restore_*` databases. It ignores the application's configured database and Atlas URI, mocks email delivery, and removes only its own temporary databases/archive files.

The integration suite checks model indexes, account/token/rate-limit workflows, family permissions/concurrency, household-scoped references, inventory stock/undo/deduplication/rollback, shopping batch receipts, and a complete maintenance export/recovery drill. The latter requires **host-installed `mongodump` and `mongorestore`**, even when the database runs in Docker. The app itself does not need these tools at runtime.

The latest recorded application verification on 2026-11-04 passed 203 unit tests and 86 integration tests plus lint, TypeScript, and production build. Counts change as tests are added; command output is authoritative. This guide does not claim an unrun check passed.

## Troubleshooting

- **Database unavailable after restarting the Mac:** restart the existing native command above using `.local/mongo`; then refresh sign-in. Do not point the app at an empty directory to make the error disappear.
- **`docker: command not found` or Docker Desktop unavailable:** use the existing native instance or install/start Docker Desktop before selecting Docker. Do not start a second database on the app port.
- **Port already in use:** inspect which intended database already owns 27018. Never stop an unrelated server to free it.
- **Replica not ready:** wait for primary election. For Docker, inspect `docker compose ps` and `docker compose logs mongo`. Only initialize a genuinely new replica.
- **Transactions require a replica set:** restart using the configured replica-set command, not an unrelated standalone MongoDB service.
- **`mongodump`/`mongorestore` missing:** install MongoDB Database Tools on the host before the recovery integration test or maintenance commands.
- **Interrupted tests:** generated disposable databases may remain; identify their exact generated names before removal. Never delete `grocery_list` or the saved storage directory as test cleanup.

Separate browser-test processes must use a different port (27019), disposable directory/database, and replica configuration. Keep the saved app process on 27018 in service. A loopback `directConnection=true` URI is a development setting; hosted Atlas uses its own SRV connection.
