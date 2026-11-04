import { Schema } from "mongoose";

export const schemaOptions = { timestamps: true, strict: "throw" as const };
export const objectId = Schema.Types.ObjectId;
export const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const wholeQuantity = {
  type: Number,
  required: true,
  min: 0,
  max: Number.MAX_SAFE_INTEGER,
  validate: { validator: Number.isSafeInteger, message: "Quantity must be a whole safe integer." },
};

export interface Timestamps {
  createdAt?: Date;
  updatedAt?: Date;
}
