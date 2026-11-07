# Six-month data retention

Historical records expire after six UTC calendar months, clamped to the last day of the destination month (August 31 → February 28/29). This is not a fixed 180-day interval.

| Collection | Expiration basis |
| --- | --- |
| Stock movements / activity | Movement creation time + six months |
| Received shopping items | Shared purchase reception time + six months |
| Invitations | Link expiration time + six months; resending updates both dates |
| Mutation deduplication records | First successful command time + six months |

Pending and purchased shopping items have no retention date. Products (including archived products), categories, memberships, and accounts do not expire through this feature. Rate-limit records keep their existing short TTL.

`retentionExpiresAt` has a MongoDB TTL index with `expireAfterSeconds: 0` on each historical collection. MongoDB's background deletion is asynchronous. Activity, received-purchase, and invitation reads exclude expired history immediately, including legacy records awaiting backfill. Expired movements cannot be undone. Deleting movements does not recalculate or subtract product quantities. References to deleted movements are historical links; they do not cascade into products or current stock.

## Safe request expiration

All inventory/shopping clients and server-rendered forms generate versioned IDs containing their creation timestamp and a random UUID. The complete ID is the deduplication key. Changing the timestamp makes a different command; it does not renew the existing key. Client clocks may be at most five minutes ahead of server time.

The server rejects commands 24 hours after creation, including retries whose deduplication records still exist. It checks freshness again inside the serialized transaction. Deduplication records remain for six months, well beyond the accepted retry window. Replaying an expired key after TTL deletion is rejected rather than applying stock again. Normal uncertain retries preserve the exact original identity and payload.

Legacy IDs without timestamps can only return an existing matching fingerprint/result after authorization; they can never execute a missing command. Old tabs must reload before submitting a new command. Expired-command messages ask the user to refresh and review current data. An old request may already have succeeded, so it must not be automatically renewed and resubmitted.

## Deployment and existing data

Application changes alone do not backfill saved data. Production disables automatic index creation.

1. Deploy this application's request-expiration protection to every writer. Pause app writes for maintenance; do not run an older writer alongside cleanup.
2. Using the existing explicit private maintenance target, run `npm run db:prepare` to install/verify schema indexes.
3. Run `npm run db:tools -- retention --writes-paused` to assign expiration dates to existing historical records. This can cause old data to be permanently removed by MongoDB as soon as it becomes eligible. The command checks required indexes before changing records.
4. Run `npm run db:inspect`, then resume writes and reload old tabs.

The backfill is idempotent: it does not extend existing deadlines, modify pending/purchased items, or update inventory. It only backfills records with a valid source date. Counts report modified records per collection. It uses explicit configured credentials/database and never silently targets local data. Existing backup procedures apply before maintenance. Do not roll back to code without request expiration after deduplication records have been cleaned up.

The implementation and tests use disposable databases. Saved local and hosted data are not backfilled by the test suite.
