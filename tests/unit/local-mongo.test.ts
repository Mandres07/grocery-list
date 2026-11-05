import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(), command: vi.fn(), close: vi.fn(), access: vi.fn(), spawn: vi.fn(),
}));
vi.mock("node:child_process", () => ({ spawnSync: mocks.spawn }));
vi.mock("node:fs/promises", () => ({ access: mocks.access }));
vi.mock("node:timers/promises", () => ({ setTimeout: vi.fn() }));
vi.mock("mongoose", () => ({
  mongo: {
    MongoServerSelectionError: class extends Error {},
    MongoClient: class {
      connect = mocks.connect;
      close = mocks.close;
      db() { return { command: mocks.command }; }
    },
  },
}));

import { mongo } from "mongoose";
import { startLocalMongo } from "../../scripts/start-local-mongo.mjs";

describe("local development database startup", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.access.mockResolvedValue(undefined);
    mocks.command.mockResolvedValue({ setName: "grocery-rs", isWritablePrimary: true });
    mocks.spawn.mockReturnValue({ status: 0 });
  });

  it("reuses an existing writable replica without starting or changing storage", async () => {
    await startLocalMongo();
    expect(mocks.spawn).not.toHaveBeenCalled();
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("starts saved storage on the app port and waits for primary election", async () => {
    mocks.connect.mockRejectedValueOnce(new mongo.MongoServerSelectionError("unavailable", {} as never));
    mocks.command.mockResolvedValueOnce({ setName: "grocery-rs", isWritablePrimary: false });
    await startLocalMongo();
    expect(mocks.spawn).toHaveBeenCalledWith("mongod", [
      "--dbpath", expect.stringMatching(/\/\.local\/mongo$/), "--replSet", "grocery-rs",
      "--bind_ip", "127.0.0.1", "--port", "27018",
      "--fork", "--logpath", expect.stringMatching(/\/\.local\/mongo\.log$/), "--logappend",
    ], { stdio: "inherit" });
    expect(mocks.close).toHaveBeenCalledTimes(3);
  });

  it("refuses to silently replace missing saved storage", async () => {
    mocks.connect.mockRejectedValueOnce(new mongo.MongoServerSelectionError("unavailable", {} as never));
    mocks.access.mockRejectedValueOnce(new Error("missing"));
    await expect(startLocalMongo()).rejects.toThrow("directory .local/mongo is missing");
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("reports a failed mongod launch", async () => {
    mocks.connect.mockRejectedValueOnce(new mongo.MongoServerSelectionError("unavailable", {} as never));
    mocks.spawn.mockReturnValueOnce({ status: 1 });
    await expect(startLocalMongo()).rejects.toThrow("MongoDB failed to start");
  });

  it("rejects a different replica without reconfiguring it", async () => {
    mocks.command.mockResolvedValue({ setName: "another-replica", isWritablePrimary: true });
    await expect(startLocalMongo()).rejects.toThrow("not running the grocery-rs replica");
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("stops waiting when the replica never becomes writable", async () => {
    mocks.command.mockResolvedValue({ setName: "grocery-rs", isWritablePrimary: false });
    await expect(startLocalMongo()).rejects.toThrow("did not become writable");
    expect(mocks.spawn).not.toHaveBeenCalled();
  });

  it("surfaces command errors and closes the client", async () => {
    mocks.command.mockRejectedValue(new Error("access denied"));
    await expect(startLocalMongo()).rejects.toThrow("access denied");
    expect(mocks.close).toHaveBeenCalledOnce();
    expect(mocks.spawn).not.toHaveBeenCalled();
  });
});
