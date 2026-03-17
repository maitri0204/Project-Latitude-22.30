// ─── Roles ───
export enum USER_ROLE {
  ADMIN = "ADMIN",
  USER = "USER",
}

// ─── User ───
export interface User {
  id: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  email: string;
  role: USER_ROLE;
  isVerified: boolean;
  isActive?: boolean;
}

// ─── LMS Program Types ───
export interface LMSTestQuestion {
  _id?: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  score: number;
  negativeMarking: number;
}

export interface LMSTest {
  _id?: string;
  title: string;
  questions: LMSTestQuestion[];
  minimumPassingMarks?: number;
}

export interface LMSVideo {
  _id?: string;
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

export interface LMSCourseMaterial {
  _id?: string;
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
}

export interface LMSCourse {
  _id?: string;
  title: string;
  description?: string;
  order: number;
  videos: LMSVideo[];
  tests: LMSTest[];
  materials: LMSCourseMaterial[];
}

export interface LMSProgram {
  _id: string;
  adminId: string;
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
  courses: LMSCourse[];
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  _id: string;
  name: string;
  subCategories: string[];
}

export interface TestScore {
  testId: string;
  score: number;
  totalScore: number;
  passed: boolean;
  completedAt: string;
}

export interface LMSEnrollment {
  _id: string;
  userId: string;
  programId: string | LMSProgram;
  enrolledAt: string;
  completedCourses: string[];
  completedTests: string[];
  testScores: TestScore[];
  passedTests: string[];
  testAnswers?: { testId: string; answers: number[] }[];
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED";
  certificateIssuedAt?: string;
}

export interface WishlistItem {
  _id: string;
  userId: string;
  programId: string | LMSProgram;
  createdAt: string;
}

export interface DashboardEnrollment {
  _id: string;
  user: { _id: string; firstName: string; middleName?: string; lastName: string; email: string; mobile?: string; country?: string; state?: string; city?: string };
  program: { _id: string; name: string; courses: any[] };
  enrolledAt: string;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  completedCourses: number;
  totalCourses: number;
}
