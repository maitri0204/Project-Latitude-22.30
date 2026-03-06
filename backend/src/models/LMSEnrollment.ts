import mongoose, { Document, Schema } from "mongoose";

// ─── Interface ───

export interface ILMSEnrollment extends Document {
  userId: mongoose.Types.ObjectId;
  programId: mongoose.Types.ObjectId;
  enrolledAt: Date;
  completedCourses: mongoose.Types.ObjectId[];
  completedTests: mongoose.Types.ObjectId[];
  testScores: {
    testId: mongoose.Types.ObjectId;
    score: number;
    totalScore: number;
    passed: boolean;
    completedAt: Date;
  }[];
  passedTests: mongoose.Types.ObjectId[];
  testAnswers: {
    testId: mongoose.Types.ObjectId;
    answers: number[];
  }[];
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED";
  certificateIssuedAt?: Date;
}

// ─── Schema ───

const LMSEnrollmentSchema = new Schema<ILMSEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    programId: { type: Schema.Types.ObjectId, ref: "LMSProgram", required: true },
    enrolledAt: { type: Date, default: Date.now },
    completedCourses: [{ type: Schema.Types.ObjectId }],
    completedTests: [{ type: Schema.Types.ObjectId }],
    testScores: [
      {
        testId: { type: Schema.Types.ObjectId },
        score: { type: Number },
        totalScore: { type: Number },
        passed: { type: Boolean, default: false },
        completedAt: { type: Date },
      },
    ],
    passedTests: [{ type: Schema.Types.ObjectId }],
    testAnswers: [
      {
        testId: { type: Schema.Types.ObjectId },
        answers: [{ type: Number }],
      },
    ],
    status: {
      type: String,
      enum: ["ENROLLED", "IN_PROGRESS", "COMPLETED"],
      default: "ENROLLED",
    },
    certificateIssuedAt: { type: Date },
  },
  { timestamps: true }
);

LMSEnrollmentSchema.index({ userId: 1, programId: 1 }, { unique: true });

export default mongoose.model<ILMSEnrollment>("LMSEnrollment", LMSEnrollmentSchema);
