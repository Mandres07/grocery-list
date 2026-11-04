import { Schema, model, models, type Model, type Types } from "mongoose";
import { objectId, schemaOptions, wholeQuantity, type Timestamps } from "./shared";

export interface IProduct extends Timestamps {
  householdId: Types.ObjectId;
  name: string;
  unit: string;
  categoryId: Types.ObjectId | null;
  quantity: number;
  lowStockThreshold: number | null;
  archivedAt: Date | null;
}

const schema = new Schema<IProduct>({
  householdId: { type: objectId, ref: "Household", required: true },
  name: { type: String, required: true, trim: true, maxlength: 160 },
  unit: { type: String, required: true, trim: true, maxlength: 60, default: "unidades" },
  categoryId: { type: objectId, ref: "Category", default: null },
  quantity: { ...wholeQuantity, default: 0 },
  lowStockThreshold: {
    ...wholeQuantity,
    required: false,
    default: null,
    validate: {
      validator: (value: number | null) => value === null || Number.isSafeInteger(value),
      message: "A threshold must be null or a whole safe integer.",
    },
  },
  archivedAt: { type: Date, default: null },
}, schemaOptions);

schema.index({ householdId: 1, archivedAt: 1, categoryId: 1, name: 1 });

export default (models.Product as Model<IProduct> | undefined) ?? model<IProduct>("Product", schema);
