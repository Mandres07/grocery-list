import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, wholeQuantity, type Timestamps } from "./shared";

export interface IStockMovement extends Timestamps {
  householdId: Types.ObjectId;
  productId: Types.ObjectId;
  actorId: Types.ObjectId;
  delta: number;
  reason: "receipt" | "consumption" | "correction" | "undo";
  requestId: string;
  undoOfMovementId: Types.ObjectId | null;
  quantityBefore: number | null;
  quantityAfter: number | null;
}

const schema = new Schema<IStockMovement>({
  householdId: { type: objectId, ref: "Household", required: true },
  productId: { type: objectId, ref: "Product", required: true },
  actorId: { type: objectId, ref: "User", required: true },
  delta: { type: Number, required: true, validate: { validator: (value: number) => Number.isSafeInteger(value) && value !== 0, message: "A movement must change stock by a nonzero whole amount." } },
  reason: { type: String, required: true, enum: ["receipt", "consumption", "correction", "undo"] },
  requestId: { type: String, required: true, trim: true, maxlength: 128 },
  undoOfMovementId: { type: objectId, ref: "StockMovement", default: null },
  quantityBefore: { ...wholeQuantity, required: false, default: null, validate: { validator: (value: number | null) => value === null || Number.isSafeInteger(value) } },
  quantityAfter: { ...wholeQuantity, required: false, default: null, validate: { validator: (value: number | null) => value === null || Number.isSafeInteger(value) } },
}, schemaOptions);

schema.index({ householdId: 1, requestId: 1 }, { unique: true });
schema.index({ householdId: 1, createdAt: -1 });
schema.index({ householdId: 1, undoOfMovementId: 1 }, { unique: true, partialFilterExpression: { undoOfMovementId: { $type: "objectId" } } });

export default (models.StockMovement as Model<IStockMovement> | undefined) ?? model<IStockMovement>("StockMovement", schema);
