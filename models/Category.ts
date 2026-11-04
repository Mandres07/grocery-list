import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, type Timestamps } from "./shared";

export interface ICategory extends Timestamps {
  householdId: Types.ObjectId;
  name: string;
  parentId: Types.ObjectId | null;
}

const schema = new Schema<ICategory>({
  householdId: { type: objectId, ref: "Household", required: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  parentId: { type: objectId, ref: "Category", default: null },
}, schemaOptions);

schema.index({ householdId: 1, parentId: 1, name: 1 }, {
  unique: true,
  collation: { locale: "es", strength: 2 },
});

export default (models.Category as Model<ICategory> | undefined) ?? model<ICategory>("Category", schema);
