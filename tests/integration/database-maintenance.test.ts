import { afterAll, describe, expect, it } from "vitest";
import { mongo } from "mongoose";
import { readdir, readFile, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { runDatabaseCommand } from "../../scripts/database-tools";
import { LOCAL_DATABASE_URI } from "../../lib/db";

const { MongoClient, ObjectId } = mongo;

const database = `grocery_list_maintenance_${Date.now()}_${process.pid}`;
const recovery = `grocery_list_restore_${Date.now()}_${process.pid}`;
const env = { ...process.env, MONGODB_URI: LOCAL_DATABASE_URI, MONGODB_DB_NAME: database, MONGODB_RESTORE_DB_NAME: recovery };
let archive: string | undefined;

afterAll(async () => {
  const client = await new MongoClient(LOCAL_DATABASE_URI).connect();
  try {
    await client.db(database).dropDatabase();
    await client.db(recovery).dropDatabase();
  } finally { await client.close(); }
  if (archive) { await rm(archive, { force: true }); await rm(`${archive}.json`, { force: true }); }
});

describe("disposable database maintenance", () => {
  it("prepares actual indexes, verifies transactions, and restores exact documents into an isolated database", async () => {
    await runDatabaseCommand("prepare", [], env);
    const client = await new MongoClient(LOCAL_DATABASE_URI).connect();
    const product = { _id: new ObjectId(), householdId: new ObjectId(), name: "Arroz de prueba", quantity: 4, createdAt: new Date(), nested: { value: null, label: "ñ" } };
    try { await client.db(database).collection("products").insertOne(product); }
    finally { await client.close(); }
    const inspect = spawnSync(process.execPath, ["scripts/run-database-tools.mjs", "inspect"], { env, encoding: "utf8", timeout: 20000 });
    expect(inspect.status, inspect.stderr).toBe(0);
    expect(inspect.stdout).toContain("indexes verified");
    await expect(runDatabaseCommand("backup", [], env)).rejects.toThrow("Pause all application writes");
    await runDatabaseCommand("backup", ["--writes-paused"], env);
    archive = `.local/backups/${(await readdir(".local/backups")).find(name => name.startsWith(database) && name.endsWith(".archive.gz"))!}`;
    expect(archive).not.toContain("undefined");
    await runDatabaseCommand("restore-test", [archive], env);
    const restoredClient = await new MongoClient(LOCAL_DATABASE_URI).connect();
    try {
      expect(await restoredClient.db(recovery).collection("products").findOne({ _id: product._id })).toEqual(product);
      expect(await restoredClient.db(database).collection("products").findOne({ _id: product._id })).toEqual(product);
      expect(await restoredClient.db(recovery).collection("inventoryrequests").indexes()).toEqual(await restoredClient.db(database).collection("inventoryrequests").indexes());
    } finally { await restoredClient.close(); }
    await expect(runDatabaseCommand("restore-test", [archive], env)).rejects.toThrow("must be empty");
    const bytes = await readFile(archive);
    bytes[0] ^= 1;
    await writeFile(archive, bytes);
    await expect(runDatabaseCommand("restore-test", [archive], env)).rejects.toThrow("checksum mismatch");
  }, 45000);
});
