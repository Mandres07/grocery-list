import { backfillRetention } from "../lib/retention-maintenance";
import mongoose from "mongoose";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile, readFile, rm, chmod } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { initializeDatabase } from "../models";

type Snapshot = Record<string, { count: number; digest: string }>;
interface BackupManifest { version: 1; database: string; archiveDigest: string; collections: Snapshot }

export function maintenanceConfiguration(env: Record<string, string | undefined>) {
  const uri = env.MONGODB_URI?.trim();
  const database = env.MONGODB_DB_NAME?.trim();
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri)) throw new Error("Set MONGODB_URI in the private maintenance environment file.");
  if (!database || !/^[a-zA-Z0-9_-]+$/.test(database) || ["admin", "local", "config"].includes(database)) throw new Error("Set an explicit application MONGODB_DB_NAME.");
  return { uri, database };
}

export function recoveryDatabase(source: string, target: string | undefined) {
  if (!target || !/^grocery_list_restore_[a-zA-Z0-9_]+$/.test(target) || target === source) throw new Error("Recovery requires a separate MONGODB_RESTORE_DB_NAME beginning grocery_list_restore_.");
  return target;
}

async function snapshot(database: mongoose.mongo.Db): Promise<Snapshot> {
  const result: Snapshot = {};
  for (const collection of await database.listCollections({}, { nameOnly: true }).toArray()) {
    if (collection.name.startsWith("system.")) continue;
    const hash = createHash("sha256");
    let count = 0;
    for await (const document of database.collection(collection.name).find().sort({ _id: 1 })) {
      hash.update(mongoose.mongo.BSON.serialize(document));
      count++;
    }
    result[collection.name] = { count, digest: hash.digest("hex") };
  }
  return Object.fromEntries(Object.entries(result).sort(([a], [b]) => a.localeCompare(b)));
}

export function sameSnapshot(a: Snapshot, b: Snapshot) { return JSON.stringify(a) === JSON.stringify(b); }

export function toolConnectionUri(uri: string) {
  const connection = new URL(uri);
  // Dump/restore namespace flags own database selection; preserve authentication scope.
  if (connection.username && !connection.searchParams.has("authSource")) connection.searchParams.set("authSource", decodeURIComponent(connection.pathname.slice(1)) || "admin");
  connection.pathname = "/";
  return connection.toString();
}

async function databaseTool(tool: "mongodump" | "mongorestore", uri: string, args: string[]) {
  const directory = await mkdtemp(join(tmpdir(), "grocery-db-"));
  const config = join(directory, "connection.yml");
  try {
    // Keep credentials out of command arguments, logs, and tool error output.
    await writeFile(config, `uri: ${JSON.stringify(toolConnectionUri(uri))}\n`, { mode: 0o600 });
    await new Promise<void>((resolvePromise, reject) => {
      const child = spawn(tool, [`--config=${config}`, ...args], { stdio: "ignore" });
      child.on("error", () => reject(new Error(`${tool} could not start. Install MongoDB Database Tools.`)));
      child.on("exit", code => code === 0 ? resolvePromise() : reject(new Error(`${tool} failed. Check database permissions, network access, and tool/server version compatibility.`)));
    });
  } finally { await rm(directory, { recursive: true, force: true }); }
}

async function archiveChecksum(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

async function checkIndexes(database = mongoose.connection.db!) {
  for (const model of Object.values(mongoose.models)) {
    const indexes = await database.collection(model.collection.name).listIndexes().toArray();
    for (const [keys, options] of model.schema.indexes()) {
      const present = indexes.some(index => JSON.stringify(index.key) === JSON.stringify(keys)
        && Boolean(index.unique) === Boolean(options.unique)
        && (options.expireAfterSeconds === undefined || index.expireAfterSeconds === options.expireAfterSeconds)
        && (options.partialFilterExpression === undefined || JSON.stringify(index.partialFilterExpression) === JSON.stringify(options.partialFilterExpression))
        && (options.collation === undefined || Object.entries(options.collation).every(([key, value]) => index.collation?.[key] === value)));
      if (!present) throw new Error(`Missing or incompatible index in ${model.collection.name}. Run db:prepare with the database setup user.`);
    }
  }
}

export async function runDatabaseCommand(command: string, args: string[], env = process.env) {
  const { uri, database } = maintenanceConfiguration(env);
  if (!["inspect", "prepare", "product-duplicates", "retention", "backup", "restore-test"].includes(command)) throw new Error("Choose inspect, prepare, product-duplicates, retention, backup, or restore-test.");
  try {
    await mongoose.connect(uri, { dbName: database, autoIndex: false, autoCreate: false, serverSelectionTimeoutMS: 10000, maxPoolSize: 2 });
    const db = mongoose.connection.db!;
    const hello = await db.command({ hello: 1 });
    if (!hello.setName && hello.msg !== "isdbgrid") throw new Error("This application requires a replica set or Atlas cluster for transactions.");
    if (command === "product-duplicates") {
      const duplicates = await db.collection("products").aggregate([
        { $group: { _id: { householdId: "$householdId", name: "$name" }, count: { $sum: 1 }, products: { $push: { id: "$_id", name: "$name", archivedAt: "$archivedAt" } } } },
        { $match: { count: { $gt: 1 } } },
      ], { collation: { locale: "es", strength: 2 } }).toArray();
      console.log(JSON.stringify(duplicates, null, 2));
      return;
    }
    if (command === "retention") {
      if (!args.includes("--writes-paused")) throw new Error("Deploy request-expiration protection and pause application writes before running retention --writes-paused.");
      await checkIndexes();
      console.log("Retention backfill:", await backfillRetention(db));
      return;
    }
    if (command === "prepare") await initializeDatabase();
    if (command === "inspect" || command === "prepare") {
      await db.command({ ping: 1 });
      await checkIndexes();
      const session = await mongoose.startSession();
      try { await session.withTransaction(async () => { await db.collection("users").findOne({}, { session, projection: { _id: 1 } }); }); }
      finally { await session.endSession(); }
      console.log(`Database ${database}: connected; transaction-capable topology and application indexes verified.`);
      return;
    }
    if (command === "backup") {
      if (!args.includes("--writes-paused")) throw new Error("Pause all application writes, then pass --writes-paused. Database dumps are not an atomic snapshot during concurrent writes.");
      const directory = resolve(".local/backups");
      await mkdir(directory, { recursive: true, mode: 0o700 });
      const archive = join(directory, `${database}-${Date.now()}.archive.gz`);
      await writeFile(archive, "", { flag: "wx", mode: 0o600 });
      try {
        const before = await snapshot(db);
        await databaseTool("mongodump", uri, [`--db=${database}`, `--archive=${archive}`, "--gzip"]);
        const after = await snapshot(db);
        if (!sameSnapshot(before, after)) throw new Error("Data changed during backup. Pause writes and retry; this archive is not accepted.");
        const archiveDigest = await archiveChecksum(archive);
        const manifest: BackupManifest = { version: 1, database, archiveDigest, collections: before };
        await writeFile(`${archive}.json`, JSON.stringify(manifest, null, 2), { mode: 0o600 });
        await chmod(archive, 0o600);
        console.log(`Backup created: ${archive}. Keep its JSON manifest with it; store an encrypted off-device copy.`);
      } catch (error) { await rm(archive, { force: true }); await rm(`${archive}.json`, { force: true }); throw error; }
      return;
    }
    const target = recoveryDatabase(database, env.MONGODB_RESTORE_DB_NAME);
    const archive = args[0];
    if (!archive || args.length !== 1) throw new Error("Pass exactly one backup archive path to restore-test.");
    const manifest = JSON.parse(await readFile(`${archive}.json`, "utf8")) as BackupManifest;
    if (manifest.version !== 1 || manifest.database !== database || !manifest.collections) throw new Error("The backup manifest does not match this database.");
    if ((await archiveChecksum(archive)) !== manifest.archiveDigest) throw new Error("Backup checksum mismatch.");
    const recovery = mongoose.connection.getClient().db(target);
    if ((await recovery.listCollections({}, { nameOnly: true }).toArray()).length) throw new Error("The recovery database must be empty. Existing data will never be overwritten.");
    await databaseTool("mongorestore", uri, [`--archive=${resolve(archive)}`, "--gzip", `--nsInclude=${database}.*`, `--nsFrom=${database}.*`, `--nsTo=${target}.*`, "--stopOnError"]);
    if (!sameSnapshot(manifest.collections, await snapshot(recovery))) throw new Error("Recovery contents do not match the backup. The isolated recovery database was retained for inspection.");
    await checkIndexes(recovery);
    console.log(`Recovery verified in ${target}: collection counts and complete document checksums match. Source data was not changed. Recovery data is retained for review; remove it in Atlas after review.`);
  } finally { await mongoose.disconnect(); }
}

export function applicationConnections(env: Record<string, string | undefined>) {
  const { uri } = maintenanceConfiguration(env);
  return [
    { user: "lista-preview", database: "grocery_list_preview", password: env.ATLAS_PREVIEW_PASSWORD },
    { user: "lista-production", database: "grocery_list_production", password: env.ATLAS_PRODUCTION_PASSWORD },
  ].map(({ user, database, password }) => {
    if (!password) throw new Error("Save ATLAS_PREVIEW_PASSWORD and ATLAS_PRODUCTION_PASSWORD in the private maintenance environment file.");
    const connection = new URL(toolConnectionUri(uri));
    connection.username = user;
    connection.password = encodeURIComponent(password);
    return { user, database, uri: connection.toString() };
  });
}

export async function verifyApplicationAccess(env = process.env) {
  for (const account of applicationConnections(env)) {
    await runDatabaseCommand("prepare", [], { ...env, MONGODB_URI: account.uri, MONGODB_DB_NAME: account.database });
    const client = await new mongoose.mongo.MongoClient(account.uri, { serverSelectionTimeoutMS: 10000 }).connect();
    const probe = client.db(account.database).collection(`_maintenance_access_${randomUUID().replace(/-/g, "")}`);
    let created = false;
    try {
      await client.db(account.database).createCollection(probe.collectionName);
      created = true;
      const session = client.startSession();
      try {
        await session.withTransaction(async () => { await probe.insertOne({ purpose: "milestone7-access-check" }, { session }); });
      } finally { await session.endSession(); }
      if (await probe.countDocuments() !== 1) throw new Error(`Write verification failed for ${account.user}.`);
      for (const forbidden of [account.database === "grocery_list_preview" ? "grocery_list_production" : "grocery_list_preview", "grocery_list_restore_preview"]) {
        let denied = false;
        try { await client.db(forbidden).collection("users").findOne({}); }
        catch (error) {
          if (error instanceof mongoose.mongo.MongoServerError && [13, 8000].includes(Number(error.code)) && /not authorized|not allowed|unauthorized/i.test(error.message)) denied = true;
          else throw error;
        }
        if (!denied) throw new Error(`${account.user} unexpectedly has access to ${forbidden}. Restrict its roles before deployment.`);
      }
      console.log(`${account.user}: own-database transaction/write verified; other app database and recovery access denied.`);
    } finally {
      try { if (created) await probe.drop(); }
      finally { await client.close(); }
    }
  }
}

if (require.main === module) (process.argv[2] === "verify-access" ? verifyApplicationAccess() : runDatabaseCommand(process.argv[2], process.argv.slice(3))).catch(error => {
  // Driver errors can contain credentials/hosts; expose only our own actionable errors.
  console.error(error instanceof Error && error.constructor === Error ? error.message : "Database operation failed. Check the private environment file, Atlas IP access, and database user permissions.");
  process.exitCode = 1;
});
