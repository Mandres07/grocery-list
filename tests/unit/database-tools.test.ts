import { describe, expect, it } from "vitest";
import { maintenanceConfiguration, recoveryDatabase, sameSnapshot, toolConnectionUri, applicationConnections } from "../../scripts/database-tools";

describe("database maintenance boundaries", () => {
  it("requires explicit connection details instead of falling back to local household data", () => {
    expect(() => maintenanceConfiguration({})).toThrow("MONGODB_URI");
    expect(() => maintenanceConfiguration({ MONGODB_URI: "mongodb://localhost" })).toThrow("MONGODB_DB_NAME");
  });
  it.each(["admin", "local", "config", "home.*", "home/database", ""])('rejects unsafe database name "%s"', database => {
    expect(() => maintenanceConfiguration({ MONGODB_URI: "mongodb://localhost", MONGODB_DB_NAME: database })).toThrow();
  });
  it("accepts isolated preview/production database names and preserves the private URI", () => {
    expect(maintenanceConfiguration({ MONGODB_URI: "mongodb+srv://example.test/", MONGODB_DB_NAME: "grocery_list_preview" })).toEqual({ uri: "mongodb+srv://example.test/", database: "grocery_list_preview" });
  });
  it.each([undefined, "grocery_list_production", "admin", "grocery_list_restore_"])('refuses a recovery database without an explicit restore-only name: %s', target => {
    expect(() => recoveryDatabase("grocery_list_production", target)).toThrow();
  });
  it("never restores over the source database even when its name uses the recovery prefix", () => {
    expect(() => recoveryDatabase("grocery_list_restore_test", "grocery_list_restore_test")).toThrow();
    expect(recoveryDatabase("grocery_list_preview", "grocery_list_restore_preview")).toBe("grocery_list_restore_preview");
  });
  it("separates export namespaces from the URI database without losing authentication scope", () => {
    const uri = new URL(toolConnectionUri("mongodb://user:password@example.test/source?replicaSet=local"));
    expect(uri.pathname).toBe("/");
    expect(uri.searchParams.get("authSource")).toBe("source");
    expect(uri.searchParams.get("replicaSet")).toBe("local");
    expect(new URL(toolConnectionUri("mongodb+srv://user:password@example.test/?authSource=admin")).searchParams.get("authSource")).toBe("admin");
  });
  it("detects changed content even when document counts stay the same", () => {
    const before = { products: { count: 2, digest: "original" } };
    expect(sameSnapshot(before, before)).toBe(true);
    expect(sameSnapshot(before, { products: { count: 2, digest: "changed" } })).toBe(false);
    expect(sameSnapshot(before, {})).toBe(false);
  });
});

describe("application access configuration", () => {
  const settings = { MONGODB_URI: "mongodb+srv://lista-maintenance:old@example.test/?authSource=admin", MONGODB_DB_NAME: "grocery_list_preview" };
  it("requires both private passwords before accessing either environment", () => {
    expect(() => applicationConnections(settings)).toThrow("ATLAS_PREVIEW_PASSWORD");
  });
  it("uses separate identities and correctly encodes raw password characters", () => {
    const connections = applicationConnections({ ...settings, ATLAS_PREVIEW_PASSWORD: "a@b#c:/%", ATLAS_PRODUCTION_PASSWORD: "production-value" });
    expect(connections.map(value => value.database)).toEqual(["grocery_list_preview", "grocery_list_production"]);
    expect(new URL(connections[0].uri).username).toBe("lista-preview");
    expect(decodeURIComponent(new URL(connections[0].uri).password)).toBe("a@b#c:/%");
    expect(new URL(connections[1].uri).username).toBe("lista-production");
    expect(new URL(connections[1].uri).searchParams.get("authSource")).toBe("admin");
  });
});
