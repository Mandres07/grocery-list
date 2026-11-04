import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, type Timestamps } from "./shared";

export interface IHousehold extends Timestamps {
  name: string;
  ownerId: Types.ObjectId;
  accessRevision: number;
  defaultCategoriesInitializedAt: Date | null;
}

const schema = new Schema<IHousehold>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  ownerId: { type: objectId, ref: "User", required: true, index: true },
  defaultCategoriesInitializedAt: { type: Date, default: null },
  accessRevision: { type: Number, default: 0, select: false },
}, schemaOptions);

export default (models.Household as Model<IHousehold> | undefined) ?? model<IHousehold>("Household", schema);
