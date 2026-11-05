import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { setTimeout } from "node:timers/promises";
import { mongo } from "mongoose";

const dataDirectory = fileURLToPath(new URL("../.local/mongo", import.meta.url));
const logPath = fileURLToPath(new URL("../.local/mongo.log", import.meta.url));

async function databaseStatus() {
  const client = new mongo.MongoClient("mongodb://127.0.0.1:27018/?directConnection=true", {
    serverSelectionTimeoutMS: 1000,
    connectTimeoutMS: 1000,
    socketTimeoutMS: 1000,
  });
  try {
    await client.connect();
    return await client.db("admin").command({ hello: 1 });
  } catch (error) {
    if (error instanceof mongo.MongoServerSelectionError) return null;
    throw error;
  } finally {
    await client.close();
  }
}

export async function startLocalMongo() {
  let status = await databaseStatus();
  if (!status) {
    // Only reopen saved storage; a missing directory must not silently create an empty app database.
    await access(dataDirectory).catch(() => {
      throw new Error("Saved MongoDB directory .local/mongo is missing. Follow docs/local-database.md to set up a local replica first.");
    });
    const result = spawnSync("mongod", [
      "--dbpath", dataDirectory, "--replSet", "grocery-rs",
      "--bind_ip", "127.0.0.1", "--port", "27018",
      "--fork", "--logpath", logPath, "--logappend",
    ], { stdio: "inherit" });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`MongoDB failed to start. See ${logPath}`);
  }

  for (let attempt = 0; attempt < 30; attempt++) {
    status ??= await databaseStatus();
    if (status && status.setName !== "grocery-rs") {
      throw new Error("Port 27018 is not running the grocery-rs replica. See docs/local-database.md; no database was reconfigured.");
    }
    if (status?.isWritablePrimary) {
      console.log("Local MongoDB is ready on port 27018. It will keep running after the dev server stops.");
      return;
    }
    status = null;
    await setTimeout(1000);
  }
  throw new Error(`MongoDB did not become writable. See ${logPath} and docs/local-database.md.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startLocalMongo().catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
