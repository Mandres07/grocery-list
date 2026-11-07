import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, type Timestamps } from "./shared";

interface IInventoryRequest extends Timestamps {
  retentionExpiresAt?: Date;
  householdId: Types.ObjectId;
  requestId: string;
  fingerprint: string;
  resultId: Types.ObjectId;
  movementId: Types.ObjectId | null;
}

const schema = new Schema<IInventoryRequest>({
  retentionExpiresAt: { type: Date },
  householdId: { type: objectId, required: true },
  requestId: { type: String, required: true, maxlength: 128 },
  fingerprint: { type: String, required: true },
  resultId: { type: objectId, required: true },
  movementId: { type: objectId, default: null },
}, schemaOptions);
schema.index({ householdId: 1, requestId: 1 }, { unique: true });

// Expired commands are rejected independently of these six-month deduplication records.
schema.index({ retentionExpiresAt: 1 }, { expireAfterSeconds: 0 });

export default (models.InventoryRequest as Model<IInventoryRequest> | undefined) ?? model<IInventoryRequest>("InventoryRequest", schema);
