import { Schema, model, models, type Model } from "mongoose";
import { emailPattern, schemaOptions, type Timestamps } from "./shared";

export interface IUser extends Timestamps {
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  emailVerifiedAt: Date | null;
}

const schema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: emailPattern },
  passwordHash: { type: String, default: null, select: false },
  googleId: { type: String, trim: true, default: null, select: false },
  emailVerifiedAt: { type: Date, default: null },
}, schemaOptions);

schema.index({ email: 1 }, { unique: true });
schema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });

export default (models.User as Model<IUser> | undefined) ?? model<IUser>("User", schema);
