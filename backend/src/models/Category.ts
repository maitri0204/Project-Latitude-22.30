import mongoose, { Document, Schema } from "mongoose";

export interface ICategory extends Document {
  name: string;
  subCategories: string[];
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    subCategories: [{ type: String, trim: true }],
  },
  { timestamps: true }
);

export default mongoose.model<ICategory>("Category", CategorySchema);
