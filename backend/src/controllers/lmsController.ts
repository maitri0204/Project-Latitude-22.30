import { Request, Response } from "express";
import mongoose from "mongoose";
import LMSProgram, { LMSEnrollment } from "../models/LMSProgram";
import { AuthRequest } from "../middleware/auth";
import { USER_ROLE } from "../types/roles";
import path from "path";
import fs from "fs";

// ===================== ADMIN (manages programs) =====================

// POST /api/lms/programs - Create a new program
export const createProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, brief, totalDuration, author, whatYouLearn, fees, courses } =
      req.body;

    if (!name || !brief || !totalDuration || !author) {
      res.status(400).json({
        message: "Name, brief, totalDuration, and author are required.",
      });
      return;
    }

    const program = new LMSProgram({
      adminId: req.user._id,
      name: name.trim(),
      brief: brief.trim(),
      totalDuration: totalDuration.trim(),
      author: author.trim(),
      whatYouLearn: whatYouLearn || [],
      fees: fees || 0,
      courses: courses || [],
      isPublished: false,
    });

    await program.save();

    res.status(201).json({
      message: "Program created successfully.",
      program,
    });
  } catch (error: any) {
    console.error("Create program error:", error);
    res.status(500).json({ message: "Server error creating program." });
  }
};

// GET /api/lms/programs - Get programs (admin sees own, user sees published)
export const getPrograms = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    let programs;

    if (req.user.role === USER_ROLE.ADMIN) {
      programs = await LMSProgram.find({ adminId: req.user._id }).sort({
        createdAt: -1,
      });
    } else {
      programs = await LMSProgram.find({ isPublished: true }).sort({
        createdAt: -1,
      });
    }

    res.status(200).json({ programs });
  } catch (error: any) {
    console.error("Get programs error:", error);
    res.status(500).json({ message: "Server error fetching programs." });
  }
};

// GET /api/lms/programs/:programId - Get single program
export const getProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }

    const program = await LMSProgram.findById(programId);

    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    // Admin can only see own programs, user can see published ones
    if (req.user.role === USER_ROLE.ADMIN) {
      if (program.adminId.toString() !== req.user._id.toString()) {
        res.status(403).json({ message: "Not authorized." });
        return;
      }
    } else {
      if (!program.isPublished) {
        res.status(404).json({ message: "Program not found." });
        return;
      }
    }

    res.status(200).json({ program });
  } catch (error: any) {
    console.error("Get program error:", error);
    res.status(500).json({ message: "Server error fetching program." });
  }
};

// PUT /api/lms/programs/:programId - Update program
export const updateProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }

    const program = await LMSProgram.findById(programId);

    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    if (program.adminId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized." });
      return;
    }

    const updateData = req.body;
    const updatedProgram = await LMSProgram.findByIdAndUpdate(
      programId,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      message: "Program updated successfully.",
      program: updatedProgram,
    });
  } catch (error: any) {
    console.error("Update program error:", error);
    res.status(500).json({ message: "Server error updating program." });
  }
};

// DELETE /api/lms/programs/:programId - Delete program
export const deleteProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }

    const program = await LMSProgram.findById(programId);

    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    if (program.adminId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized." });
      return;
    }

    await LMSProgram.findByIdAndDelete(programId);
    await LMSEnrollment.deleteMany({ programId });

    res.status(200).json({ message: "Program deleted successfully." });
  } catch (error: any) {
    console.error("Delete program error:", error);
    res.status(500).json({ message: "Server error deleting program." });
  }
};

// POST /api/lms/programs/:programId/publish - Toggle publish
export const togglePublish = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    const program = await LMSProgram.findById(programId);

    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    if (program.adminId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized." });
      return;
    }

    program.isPublished = !program.isPublished;
    await program.save();

    res.status(200).json({
      message: `Program ${program.isPublished ? "published" : "unpublished"} successfully.`,
      program,
    });
  } catch (error: any) {
    console.error("Toggle publish error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/lms/upload - Upload file
export const uploadFile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ message: "No file uploaded." });
      return;
    }

    const relativePath = path.relative(process.cwd(), req.file.path);
    const fileUrl = `/${relativePath.replace(/\\/g, "/")}`;

    res.status(200).json({
      message: "File uploaded successfully.",
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    res.status(500).json({ message: "Server error uploading file." });
  }
};

// ===================== USER (browses/enrolls) =====================

// POST /api/lms/programs/:programId/enroll - Enroll in a program
export const enrollInProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    if (!mongoose.Types.ObjectId.isValid(programId)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }

    const program = await LMSProgram.findById(programId);
    if (!program || !program.isPublished) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    const existingEnrollment = await LMSEnrollment.findOne({
      userId: req.user._id,
      programId,
    });

    if (existingEnrollment) {
      res.status(400).json({ message: "Already enrolled in this program." });
      return;
    }

    const enrollment = new LMSEnrollment({
      userId: req.user._id,
      programId,
      status: "ENROLLED",
      completedCourses: [],
      completedTests: [],
      testScores: [],
      passedTests: [],
    });

    await enrollment.save();

    res.status(201).json({
      message: "Enrolled successfully.",
      enrollment,
    });
  } catch (error: any) {
    console.error("Enroll error:", error);
    res.status(500).json({ message: "Server error during enrollment." });
  }
};

// GET /api/lms/enrollments - Get user's enrollments
export const getEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enrollments = await LMSEnrollment.find({
      userId: req.user._id,
    }).populate("programId");

    res.status(200).json({ enrollments });
  } catch (error: any) {
    console.error("Get enrollments error:", error);
    res.status(500).json({ message: "Server error fetching enrollments." });
  }
};

// GET /api/lms/enrollments/:programId - Get single enrollment
export const getEnrollment = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    const enrollment = await LMSEnrollment.findOne({
      userId: req.user._id,
      programId,
    });

    if (!enrollment) {
      res.status(404).json({ message: "Enrollment not found." });
      return;
    }

    res.status(200).json({ enrollment });
  } catch (error: any) {
    console.error("Get enrollment error:", error);
    res.status(500).json({ message: "Server error fetching enrollment." });
  }
};

// POST /api/lms/enrollments/:programId/complete-course
export const completeCourse = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;
    const { courseId } = req.body;

    const enrollment = await LMSEnrollment.findOne({
      userId: req.user._id,
      programId,
    });

    if (!enrollment) {
      res.status(404).json({ message: "Enrollment not found." });
      return;
    }

    const courseObjectId = new mongoose.Types.ObjectId(courseId);
    if (
      !enrollment.completedCourses.some((id: any) => id.equals(courseObjectId))
    ) {
      enrollment.completedCourses.push(courseObjectId);
      enrollment.status = "IN_PROGRESS";
      await enrollment.save();
    }

    res.status(200).json({
      message: "Course marked as completed.",
      enrollment,
    });
  } catch (error: any) {
    console.error("Complete course error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/lms/enrollments/:programId/submit-test
export const submitTest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;
    const { courseId, testId, answers } = req.body;

    const program = await LMSProgram.findById(programId);
    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    // Find the course and test
    const course = program.courses.find(
      (c: any) => c._id.toString() === courseId
    );
    if (!course) {
      res.status(404).json({ message: "Course not found." });
      return;
    }

    const test = course.tests.find((t: any) => t._id.toString() === testId);
    if (!test) {
      res.status(404).json({ message: "Test not found." });
      return;
    }

    // Calculate score
    let score = 0;
    let totalScore = 0;

    test.questions.forEach((question: any, idx: number) => {
      totalScore += question.score;
      if (answers[idx] === question.correctOptionIndex) {
        score += question.score;
      } else {
        score -= question.negativeMarking || 0;
      }
    });

    score = Math.max(0, score);
    const passed = score >= (test.minimumPassingMarks || 0);

    const enrollment = await LMSEnrollment.findOne({
      userId: req.user._id,
      programId,
    });

    if (!enrollment) {
      res.status(404).json({ message: "Enrollment not found." });
      return;
    }

    const testObjectId = new mongoose.Types.ObjectId(testId);

    // Update or add test score
    const existingScoreIdx = enrollment.testScores.findIndex(
      (ts: any) => ts.testId.toString() === testId
    );

    const scoreEntry = {
      testId: testObjectId,
      score,
      totalScore,
      passed,
      completedAt: new Date(),
    };

    if (existingScoreIdx >= 0) {
      enrollment.testScores[existingScoreIdx] = scoreEntry;
    } else {
      enrollment.testScores.push(scoreEntry);
    }

    // Store submitted answers for review
    const existingAnswersIdx = (enrollment as any).testAnswers?.findIndex(
      (ta: any) => ta.testId.toString() === testId
    ) ?? -1;
    if (!(enrollment as any).testAnswers) (enrollment as any).testAnswers = [];
    if (existingAnswersIdx >= 0) {
      (enrollment as any).testAnswers[existingAnswersIdx] = { testId: testObjectId, answers };
    } else {
      (enrollment as any).testAnswers.push({ testId: testObjectId, answers });
    }

    if (passed) {
      if (
        !enrollment.completedTests.some((id: any) => id.equals(testObjectId))
      ) {
        enrollment.completedTests.push(testObjectId);
      }
      if (
        !enrollment.passedTests.some((id: any) => id.equals(testObjectId))
      ) {
        enrollment.passedTests.push(testObjectId);
      }

      // Auto-complete the course if all its tests are passed
      const courseObjectId = new mongoose.Types.ObjectId(courseId);
      const allCourseTestsPassed = course.tests.every((t: any) =>
        enrollment.passedTests.some((id: any) => id.toString() === t._id.toString())
      );
      if (allCourseTestsPassed && !enrollment.completedCourses.some((id: any) => id.equals(courseObjectId))) {
        enrollment.completedCourses.push(courseObjectId);
      }
    }

    enrollment.status = enrollment.completedCourses.length > 0 ? "IN_PROGRESS" : "ENROLLED";

    // Check if program is complete — all courses have all tests passed
    const allProgramTestsPassed = program.courses.every((c: any) =>
      c.tests.every((t: any) =>
        enrollment.passedTests.some((id: any) => id.toString() === t._id.toString())
      )
    );

    if (allProgramTestsPassed && program.courses.length > 0) {
      enrollment.status = "COMPLETED";
      if (!enrollment.certificateIssuedAt) {
        enrollment.certificateIssuedAt = new Date();
      }
    }

    await enrollment.save();

    res.status(200).json({
      message: passed ? "Test passed!" : "Test not passed. Try again.",
      score,
      totalScore,
      passed,
      minimumPassingMarks: test.minimumPassingMarks,
      enrollment,
    });
  } catch (error: any) {
    console.error("Submit test error:", error);
    res.status(500).json({ message: "Server error submitting test." });
  }
};

// GET /api/lms/programs/:programId/enrollments - Admin gets enrollment stats
export const getProgramEnrollments = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    const program = await LMSProgram.findById(programId);
    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    if (program.adminId.toString() !== req.user._id.toString()) {
      res.status(403).json({ message: "Not authorized." });
      return;
    }

    const enrollments = await LMSEnrollment.find({ programId }).populate(
      "userId",
      "firstName lastName email"
    );

    res.status(200).json({ enrollments });
  } catch (error: any) {
    console.error("Get program enrollments error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
