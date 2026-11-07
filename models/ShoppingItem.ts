import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, wholeQuantity, type Timestamps } from "./shared";

export interface IShoppingItem extends Timestamps {
  retentionExpiresAt?: Date;
  householdId: Types.ObjectId;
  productId: Types.ObjectId | null;
  name: string;
  quantity: number;
  unit: string;
  revision: number;
  receivedQuantity: number | null;
  receivedAt: Date | null;
  status: "pending" | "purchased" | "received";
  addedById: Types.ObjectId;
  receivedMovementId: Types.ObjectId | null;
  receiptId: string | null;
}

const schema = new Schema<IShoppingItem>({
  retentionExpiresAt: { type: Date },
  householdId: { type: objectId, ref: "Household", required: true },
  productId: { type: objectId, ref: "Product", default: null },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  quantity: { ...wholeQuantity, min: 1, default: 1 },
  unit: { type: String, required: true, trim: true, maxlength: 60, default: "unidades" },
  revision: { ...wholeQuantity, default: 0 },
  receivedQuantity: { ...wholeQuantity, required: false, default: null, min: 1, validate: { validator: (value: number | null) => value === null || Number.isSafeInteger(value) } },
  receivedAt: { type: Date, default: null },
  status: { type: String, required: true, enum: ["pending", "purchased", "received"], default: "pending" },
  addedById: { type: objectId, ref: "User", required: true },
  receiptId: { type: String, default: null, maxlength: 128 },
  receivedMovementId: { type: objectId, ref: "StockMovement", default: null },
}, schemaOptions);

schema.index({ householdId: 1, status: 1, createdAt: -1 });
schema.index({ householdId: 1, receivedMovementId: 1 }, { unique: true, partialFilterExpression: { receivedMovementId: { $type: "objectId" } } });

schema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default (models.ShoppingItem as Model<IShoppingItem> | undefined) ?? model<IShoppingItem>("ShoppingItem", schema);
