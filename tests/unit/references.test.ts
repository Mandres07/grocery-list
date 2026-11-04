import { beforeEach, describe, expect, it, vi } from "vitest";
import { Types } from "mongoose";

const mocks = vi.hoisted(() => ({ category: vi.fn(), product: vi.fn() }));
vi.mock("@/models/Category", () => ({ default: { findOne: mocks.category } }));
vi.mock("@/models/Product", () => ({ default: { findOne: mocks.product } }));

import { requireProductInHousehold, validateCategoryParent } from "@/lib/inventory/references";

const householdId = new Types.ObjectId();
const categoryId = new Types.ObjectId();
const parentId = new Types.ObjectId();
const query = (value: unknown) => ({ session: () => ({ lean: async () => value }) });

beforeEach(() => vi.resetAllMocks());

describe("household reference guards", () => {
  it("scopes product lookups to the household", async () => {
    const productId = new Types.ObjectId();
    mocks.product.mockReturnValue(query(null));
    await expect(requireProductInHousehold(householdId, productId)).rejects.toThrow("no pertenece");
    expect(mocks.product).toHaveBeenCalledWith({ _id: productId, householdId });
  });

  it("rejects a parent from another household or a missing parent", async () => {
    mocks.category.mockReturnValue(query(null));
    await expect(validateCategoryParent(householdId, categoryId, parentId)).rejects.toThrow("no pertenece");
    expect(mocks.category).toHaveBeenCalledWith({ _id: parentId, householdId });
  });

  it("rejects self-parenting without a database lookup", async () => {
    await expect(validateCategoryParent(householdId, categoryId, categoryId)).rejects.toThrow("ciclo");
    expect(mocks.category).not.toHaveBeenCalled();
  });

  it("rejects a parent whose ancestor is the category being edited", async () => {
    mocks.category.mockReturnValue(query({ parentId: categoryId }));
    await expect(validateCategoryParent(householdId, categoryId, parentId)).rejects.toThrow("ciclo");
  });

  it("accepts an independent parent or a root category", async () => {
    mocks.category.mockReturnValue(query({ parentId: null }));
    await expect(validateCategoryParent(householdId, categoryId, parentId)).resolves.toBeUndefined();
    await expect(validateCategoryParent(householdId, categoryId, null)).resolves.toBeUndefined();
  });
});
