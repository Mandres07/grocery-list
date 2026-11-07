# Hosted database — milestone 7

Status: Atlas provisioning and recovery verification are complete. Production is deployed with restricted app credentials; the user deferred hosted preview deployment, while its separate database/user remain available for maintenance checks. The cluster is Free/M0 in AWS us-east-1. Optional paid backups are disabled; manual backup/recovery is tested but not scheduled. Local development remains on its saved replica at port 27018. See [deployment](deployment.md) for current hosted configuration and the [README](../README.md) for the latest recorded application checks.

## Atlas setup

1. In the existing Atlas account, create a separate **Lista de Compras** project and a **Free (M0)** cluster named `lista-de-compras`, without sample data. Choose AWS Northern Virginia (`us-east-1`) if offered, matching the deployed Vercel iad1 function region. Verify the actual provider/region/tier shown before creation. No paid tier or backup subscription is authorized by this workflow.
2. Under Database Access, create separate strong-password users `lista-preview` and `lista-production`. Use specific database privileges: `readWrite` on `grocery_list_preview` for the first, and `readWrite` on `grocery_list_production` for the second. Avoid “read/write any database.” These roles include index creation; the app does not need Atlas admin. Limit each user to this cluster if the UI offers it. Store passwords in a password manager.
3. Under Network Access, add the current workstation's public IP. Update this when the IP changes. The deployed Vercel Hobby app also uses the user-configured `0.0.0.0/0` entry for dynamic egress; database authentication and the scoped roles remain required. See [deployment networking](deployment.md#atlas-network-access-for-hobby) before changing that setting.
4. Create a temporary maintenance user with `readWrite` on `grocery_list_preview` and on **only** `grocery_list_restore_preview`. Keep it separate from the app's preview credential. Production maintenance uses its own source/recovery pair later. Remove temporary credentials and recovery data after verification.
5. In Connect → Drivers, choose **Node.js**, version **7.0 or later** if available (the 6.7-or-later SRV template is also compatible; the actual installed driver version comes from Mongoose and the lockfile), and copy the SRV connection string into the ignored private file below. Replace the user/password placeholders locally; URL-encode password special characters. Keep `retryWrites=true&w=majority`, and use `authSource=admin` if needed. Keep the explicit database name in `MONGODB_DB_NAME`. Do not paste secrets into chat, Git, screenshots, or shell command arguments.

Primary references: [deploy a Free cluster](https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/), [database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/), [IP access](https://www.mongodb.com/docs/atlas/security/ip-access-list/).

## Private maintenance configuration

Copy `.env.atlas.example` to `.env.atlas.local` and fill it using a local editor. This file is ignored by Git and separate from Next.js's `.env.local`. npm maintenance commands load it explicitly; the app and `npm run db:check` continue using their existing configuration.

```text
MONGODB_URI=<Atlas connection for the maintenance user>
MONGODB_DB_NAME=grocery_list_preview
MONGODB_RESTORE_DB_NAME=grocery_list_restore_preview
```

Run `npm run db:prepare` to create the app collections/indexes and verify an actual read transaction. This uses the real Mongoose models and does not seed accounts/products, drop indexes, or directly delete documents. Creating TTL indexes can, however, start background deletion of eligible historical records. `npm run db:inspect` repeats the read-only topology, index, and transaction checks. Both require explicit settings and refuse administrative database names; neither falls back to localhost. Tools print no URI or credentials. Setup diagnostics intentionally omit raw driver errors because they can contain credentials.

Before upgrading an existing database, run `npm run db:tools -- product-duplicates` and review conflicts before installing the unique product-name index. Follow the [retention rollout](data-retention.md) for request-expiration deployment, paused writes, backups, index preparation, and the explicit expiration backfill. These steps have not been performed against hosted data as part of the 2026-11-06 follow-up.

The operations runner compiles its entry point, application models, and required maintenance helpers with the existing TypeScript dependency into a temporary ignored `.local/database-tools-*` directory that is removed after the command exits. No extra runtime/build dependency or application endpoint is introduced.

The access-verification command below also prepares indexes; apply the existing-database rollout requirements before rerunning it.

After preparation, add the raw saved app-user passwords as `ATLAS_PREVIEW_PASSWORD` and `ATLAS_PRODUCTION_PASSWORD` to the private maintenance file and run `npm run db:verify-access`. It prepares each app database with its own user, verifies an actual committed transaction in a uniquely named diagnostic collection, removes that collection, and checks denials for the other app database and recovery database. Passwords are URL-encoded internally; do not manually encode these two fields. App-user credentials stay separate from the maintenance connection.

Expected boundaries: preview credentials must read preview data and fail to read production/recovery; production credentials must fail to read preview. Use the maintenance user only for setup/recovery. Both app databases were already prepared and verified. When provisioning a new environment, run preparation with its own restricted credentials before using it. Production and preview share cluster capacity but have separate databases and users; this is data/access isolation, not a dedicated infrastructure boundary. Untrusted external PR previews must never receive shared preview credentials.

## Export and recovery drill

`mongodump` and `mongorestore` from MongoDB Database Tools must be installed and compatible with the actual server version. They are already available on this workstation. The command wrapper passes the URI through a temporary owner-readable config file and removes it afterward; credentials are never placed in process arguments. Tool stderr is suppressed to avoid credential exposure.

1. Stop all app instances/background writers using the source database for the entire dump. A logical database dump is not an atomic transaction snapshot while writes continue. The command requires explicit acknowledgement and checks document digests before/after, but those checks do not replace pausing writes. For a new empty preview, there are no live app writers yet.
2. Run `npm run db:backup -- --writes-paused`. It creates an owner-readable gzip archive and JSON manifest in ignored `.local/backups`. The manifest contains source database, collection counts/document digests, and archive checksum, with no credentials. A failed or changed-data dump is removed. Keep the two files together and keep an encrypted off-device copy; laptop-only storage is not disaster recovery.
3. Ensure `grocery_list_restore_preview` is empty and accessible only to the maintenance user. Run `npm run db:restore-test -- .local/backups/<actual-file>.archive.gz`.
4. Recovery checks the archive checksum, restores only the source namespace into the separate recovery database, then verifies complete document digests, counts, and required indexes. It refuses the source database, non-recovery names, and nonempty targets, and never uses `--drop`. Source data is not written. A failed restore may leave partial recovery data; inspect/remove that isolated recovery database before retrying.
5. Review the retained recovery database in Atlas, then delete **only** the recovery database and temporary maintenance user there. Never practice overwriting production. Actual production recovery is a separate deliberate procedure: stop writers, recover to a fresh database, verify data/indexes and app login/permissions, then switch the production environment and redeploy.

Backups contain account hashes, personal data, invitations, and inventory history. Treat the archive as private, restrict filesystem access, and use encrypted backup storage. Retain at least one verified off-device copy before migrating real local household data. Local-to-Atlas migration is not automatic; existing accounts/inventory stay local until explicitly migrated.

Atlas backup availability must be verified in the actual project. As checked in official documentation on 2026-11-04, Free-cluster daily backups are an optional **paid private preview** and may not appear for this account. Do not assume free automatic backups or enable billing without authorization. If available, verify retention and perform a restore drill before relying on it. See [Free cluster backups](https://www.mongodb.com/docs/atlas/backup/cloud-backup/free-cluster-backup/). The logical export/recovery drill above remains independently available.

Pausing application writers does not pause MongoDB TTL deletion. If historical records expire during export or recovery, complete-document snapshot verification can fail; the tools reject a mismatch. Investigate expiration and retry the isolated procedure rather than bypassing checksum checks or treating a failed drill as a verified backup.

## Review checkpoint

The hosted checkpoint is complete: connectivity, transactions, required indexes, database-user isolation, tier/region, and preview export/recovery were verified, and backup availability was confirmed by the user. Production hosting and actual email/account/sharing checks subsequently passed; see [deployment](deployment.md). For a new deployment or recovery target, repeat the relevant checks rather than assuming a previous result applies. The retained recovery copy means that target is not currently empty; review/remove only that recovery database before repeating the drill.

## Hosted verification record

On 2026-11-04, Atlas preview preparation succeeded with the restricted maintenance account. Required indexes and a read transaction were verified. A temporary diagnostic collection in the otherwise-empty preview database was exported and restored into `grocery_list_restore_preview`; complete document hashes, collection counts, archive integrity, and required indexes matched. The source diagnostic collection was removed afterward, leaving application collections/data unchanged. The isolated recovery copy and private local archive/manifest remain available for review. Maintenance access to production was denied. The user confirmed Free/M0 and AWS us-east-1. Both app users subsequently passed their own-database committed transaction/write checks and were denied access to the other app database and recovery database. Both app databases have required indexes and no retained diagnostic data. The user confirmed an optional paid backup offer in the cluster Backup tab, currently disabled. Manual logical backups/recovery are verified; no automatic backup schedule is configured. No billing option was enabled and no local household data was migrated.

The 2026-11-04 verification above predates the 2026-11-06 unique product-name and retention TTL indexes. It does not establish that the newer indexes or retention backfill have been applied to hosted databases.
