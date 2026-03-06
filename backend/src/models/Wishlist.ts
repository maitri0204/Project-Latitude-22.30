import mongoose, { Document, Schema } from "mongoose";

// ─── Interface ───

export interface IWishlist extends Document {
  userId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Schema ───

const WishlistSchema = new Schema<IWishlist>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    programId: { type: Schema.Types.ObjectId, ref: "LMSProgram", required: true },
  },
  { timestamps: true }
);

WishlistSchema.index({ userId: 1, programId: 1 }, { unique: true });

export default mongoose.model<IWishlist>("Wishlist", WishlistSchema);
