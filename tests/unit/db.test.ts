import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({ connect: vi.fn(), connection: { readyState: 0 } }));
vi.mock("mongoose", () => ({ default: mock }));

import { connectToDatabase, databaseConfiguration } from "@/lib/db";

beforeEach(() => {
  global.groceryDatabasePromise = undefined;
  mock.connection.readyState = 0;
  mock.connect.mockReset();
});
afterEach(() => vi.unstubAllEnvs());

describe("database connection", () => {
  it("shares an in-flight connection across concurrent callers", async () => {
    mock.connect.mockResolvedValue(mock);
    await Promise.all([connectToDatabase(), connectToDatabase(), connectToDatabase()]);
    expect(mock.connect).toHaveBeenCalledTimes(1);
  });

  it("can retry a failed connection", async () => {
    mock.connect.mockRejectedValueOnce(new Error("Connection failed")).mockResolvedValueOnce(mock);
    await expect(connectToDatabase()).rejects.toThrow("Connection failed");
    await expect(connectToDatabase()).resolves.toBe(mock);
    expect(mock.connect).toHaveBeenCalledTimes(2);
  });

  it("reuses an established connection", async () => {
    mock.connection.readyState = 1;
    await connectToDatabase();
    expect(mock.connect).not.toHaveBeenCalled();
  });

  it("never silently falls back to local data in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("MONGODB_URI", "");
    vi.stubEnv("MONGODB_DB_NAME", "");
    expect(databaseConfiguration).toThrow("required in production");
  });
});
