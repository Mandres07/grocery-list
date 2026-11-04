import { Schema, model, models, type Model } from "mongoose";

interface IAuthRateLimit {
  _id: string;
  count: number;
  expiresAt: Date;
}

const schema = new Schema<IAuthRateLimit>({
  _id: { type: String, required: true },
  count: { type: Number, required: true },
  expiresAt: { type: Date, required: true },
}, { versionKey: false });

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default (models.AuthRateLimit as Model<IAuthRateLimit> | undefined) ?? model<IAuthRateLimit>("AuthRateLimit", schema);
