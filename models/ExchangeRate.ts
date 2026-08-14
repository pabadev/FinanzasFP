import { Schema, model, models } from "mongoose";

const ExchangeRateSchema = new Schema(
  {
    from: { type: String, required: true, uppercase: true },
    to: { type: String, required: true, uppercase: true },
    rate: { type: Number, required: true, min: 0 },
    source: { type: String, max: 80 },
  },
  { timestamps: true },
);

ExchangeRateSchema.index({ from: 1, to: 1 }, { unique: true });

export default models.ExchangeRate || model("ExchangeRate", ExchangeRateSchema);