import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, type Timestamps } from "./shared";

export interface IMembership extends Timestamps {
  householdId: Types.ObjectId;
  userId: Types.ObjectId;
}

// Role is derived from Household.ownerId, avoiding competing owner flags.
const schema = new Schema<IMembership>({
  householdId: { type: objectId, ref: "Household", required: true },
  userId: { type: objectId, ref: "User", required: true },
}, schemaOptions);

schema.index({ householdId: 1, userId: 1 }, { unique: true });
schema.index({ userId: 1, householdId: 1 });

export default (models.Membership as Model<IMembership> | undefined) ?? model<IMembership>("Membership", schema);
