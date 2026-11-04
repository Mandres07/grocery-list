import { Schema, model, models, type Model } from "mongoose";
import { emailPattern, schemaOptions, type Timestamps } from "./shared";

export interface IUser extends Timestamps {
  name: string;
  email: string;
  passwordHash: string | null;
  googleId: string | null;
  emailVerifiedAt: Date | null;
  sessionVersion: number;
  householdRevision: number;
  verificationTokenHash: string | null;
  verificationExpiresAt: Date | null;
  verificationSentAt: Date | null;
  resetTokenHash: string | null;
  resetExpiresAt: Date | null;
  resetSentAt: Date | null;
}

const schema = new Schema<IUser>({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254, match: emailPattern },
  passwordHash: { type: String, default: null, select: false },
  googleId: { type: String, trim: true, default: null, select: false },
  emailVerifiedAt: { type: Date, default: null },
  sessionVersion: { type: Number, default: 0, select: false },
  householdRevision: { type: Number, default: 0, select: false },
  verificationTokenHash: { type: String, default: null, select: false },
  verificationExpiresAt: { type: Date, default: null, select: false },
  verificationSentAt: { type: Date, default: null, select: false },
  resetTokenHash: { type: String, default: null, select: false },
  resetExpiresAt: { type: Date, default: null, select: false },
  resetSentAt: { type: Date, default: null, select: false },
}, schemaOptions);

schema.index({ email: 1 }, { unique: true });
schema.index({ googleId: 1 }, { unique: true, partialFilterExpression: { googleId: { $type: "string" } } });
schema.index({ verificationTokenHash: 1 }, { unique: true, partialFilterExpression: { verificationTokenHash: { $type: "string" } } });
schema.index({ resetTokenHash: 1 }, { unique: true, partialFilterExpression: { resetTokenHash: { $type: "string" } } });

export default (models.User as Model<IUser> | undefined) ?? model<IUser>("User", schema);
