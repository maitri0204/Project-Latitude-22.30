import mongoose, { Document, Schema } from "mongoose";

// ─── Interfaces ───

export interface ILMSTestQuestion {
  _id?: mongoose.Types.ObjectId;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  score: number;
  negativeMarking: number;
}

export interface ILMSTest {
  _id?: mongoose.Types.ObjectId;
  title: string;
  questions: ILMSTestQuestion[];
  minimumPassingMarks?: number;
}

export interface ILMSVideo {
  _id?: mongoose.Types.ObjectId;
  title: string;
  link?: string;
  filePath?: string;
  oneDriveItemId?: string;
  originalName?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  order: number;
}

export interface ILMSCourseMaterial {
  _id?: mongoose.Types.ObjectId;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: Date;
}

export interface ILMSCourse {
  _id?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  order: number;
  videos: ILMSVideo[];
  tests: ILMSTest[];
  materials: ILMSCourseMaterial[];
}

export interface ILMSProgram extends Document {
  adminId: mongoose.Types.ObjectId;
  name: string;
  brief: string;
  totalDuration: string;
  sampleVideoUrl?: string;
  sampleVideoPath?: string;
  sampleVideoOneDriveItemId?: string;
  thumbnailPath?: string;
  author: string;
  whatYouLearn: string[];
  fees: number;
  category: string;
  subCategory?: string;
  courses: ILMSCourse[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

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

// ─── Schemas ───

const LMSTestQuestionSchema = new Schema<ILMSTestQuestion>({
  questionText: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctOptionIndex: { type: Number, required: true },
  score: { type: Number, required: true, default: 1 },
  negativeMarking: { type: Number, default: 0 },
});

const LMSTestSchema = new Schema<ILMSTest>({
  title: { type: String, required: true },
  questions: [LMSTestQuestionSchema],
  minimumPassingMarks: { type: Number, default: 0 },
});

const LMSVideoSchema = new Schema<ILMSVideo>({
  title: { type: String, required: true },
  link: { type: String },
  filePath: { type: String },
  oneDriveItemId: { type: String },
  originalName: { type: String },
  fileName: { type: String },
  fileSize: { type: Number },
  mimeType: { type: String },
  order: { type: Number, default: 0 },
});

const LMSCourseMaterialSchema = new Schema<ILMSCourseMaterial>({
  originalName: { type: String, required: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
});

const LMSCourseSchema = new Schema<ILMSCourse>({
  title: { type: String, required: true },
  description: { type: String },
  order: { type: Number, default: 0 },
  videos: [LMSVideoSchema],
  tests: [LMSTestSchema],
  materials: [LMSCourseMaterialSchema],
});

const LMSProgramSchema = new Schema<ILMSProgram>(
  {
    adminId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true },
    brief: { type: String, required: true },
    totalDuration: { type: String, required: true },
    sampleVideoUrl: { type: String },
    sampleVideoPath: { type: String },
    sampleVideoOneDriveItemId: { type: String },
    thumbnailPath: { type: String },
    author: { type: String, required: true },
    whatYouLearn: [{ type: String }],
    fees: { type: Number, required: true, default: 0 },
    category: { type: String, required: true, default: "General" },
    subCategory: { type: String },
    courses: [LMSCourseSchema],
    isPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const LMSEnrollmentSchema = new Schema<ILMSEnrollment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    programId: {
      type: Schema.Types.ObjectId,
      ref: "LMSProgram",
      required: true,
    },
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

const LMSProgram = mongoose.model<ILMSProgram>("LMSProgram", LMSProgramSchema);
export const LMSEnrollment = mongoose.model<ILMSEnrollment>(
  "LMSEnrollment",
  LMSEnrollmentSchema
);

export default LMSProgram;
