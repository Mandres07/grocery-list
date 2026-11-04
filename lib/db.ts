import mongoose from "mongoose";

export const LOCAL_DATABASE_URI =
  "mongodb://127.0.0.1:27018/grocery_list?replicaSet=grocery-rs&directConnection=true";

declare global {
  var groceryDatabasePromise: Promise<typeof mongoose> | undefined;
}

export function databaseConfiguration() {
  const uri = process.env.MONGODB_URI?.trim();
  const dbName = process.env.MONGODB_DB_NAME?.trim();

  if (process.env.NODE_ENV === "production" && (!uri || !dbName)) {
    throw new Error("MONGODB_URI and MONGODB_DB_NAME are required in production.");
  }

  return { uri: uri || LOCAL_DATABASE_URI, dbName: dbName || "grocery_list" };
}

// Only import this module from server-side services. No connection is opened at import time.
export async function connectToDatabase() {
  const { uri, dbName } = databaseConfiguration();

  if (mongoose.connection.readyState === 1) return mongoose;

  if (!global.groceryDatabasePromise) {
    global.groceryDatabasePromise = mongoose.connect(uri, {
      dbName,
      bufferCommands: false,
      autoIndex: process.env.NODE_ENV !== "production",
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    }).catch((error: unknown) => {
      global.groceryDatabasePromise = undefined;
      throw error;
    });
  }

  return global.groceryDatabasePromise;
}
