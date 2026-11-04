import { Schema, model, models, type Model, type Types } from "mongoose";
import { emailPattern, objectId, schemaOptions, type Timestamps } from "./shared";

export interface IInvitation extends Timestamps {
  householdId: Types.ObjectId;
  invitedById: Types.ObjectId;
  email: string;
  tokenHash: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
}

const schema = new Schema<IInvitation>({
  householdId: { type: objectId, ref: "Household", required: true },
  invitedById: { type: objectId, ref: "User", required: true },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: emailPattern },
  tokenHash: { type: String, required: true, match: /^[a-f0-9]{64}$/, select: false },
  status: { type: String, required: true, enum: ["pending", "accepted", "expired", "revoked"], default: "pending" },
  expiresAt: { type: Date, required: true },
}, schemaOptions);

schema.index({ tokenHash: 1 }, { unique: true });
schema.index({ householdId: 1, email: 1 }, { unique: true, partialFilterExpression: { status: "pending" } });
schema.index({ status: 1, expiresAt: 1 });

export default (models.Invitation as Model<IInvitation> | undefined) ?? model<IInvitation>("Invitation", schema);
