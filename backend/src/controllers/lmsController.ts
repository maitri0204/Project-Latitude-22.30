import { Request, Response } from "express";
import mongoose from "mongoose";
import LMSProgram from "../models/LMSProgram";
import LMSEnrollment from "../models/LMSEnrollment";
import Wishlist from "../models/Wishlist";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { USER_ROLE } from "../types/roles";
import path from "path";
import fs from "fs";
import axios from "axios";
import { uploadToOneDrive, getOneDriveItemInfo } from "../utils/onedrive";

// ===================== ADMIN (manages programs) =====================

// POST /api/lms/programs - Create a new program
export const createProgram = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { name, brief, totalDuration, author, whatYouLearn, fees, courses, sampleVideoUrl, sampleVideoOneDriveItemId, thumbnailPath, category, subCategory } =
      req.body;

    if (!name || !brief || !totalDuration || !author) {
      res.status(400).json({
        message: "Name, brief, totalDuration, and author are required.",
      });
      return;
    }

    // Strip out courses/videos/tests with empty titles to avoid Mongoose validation errors
    const sanitizedCourses = (courses || []).filter((c: any) => c.title?.trim()).map((c: any) => ({
      ...c,
      title: c.title.trim(),
      videos: (c.videos || []).filter((v: any) => v.title?.trim()).map((v: any) => ({ ...v, title: v.title.trim() })),
      tests: (c.tests || []).filter((t: any) => t.title?.trim()).map((t: any) => ({ ...t, title: t.title.trim() })),
    }));

    const program = new LMSProgram({
      adminId: req.user._id,
      name: name.trim(),
      brief: brief.trim(),
      totalDuration: totalDuration.trim(),
      author: author.trim(),
      whatYouLearn: whatYouLearn || [],
      fees: fees || 0,
      sampleVideoUrl: sampleVideoUrl || "",
      sampleVideoOneDriveItemId: sampleVideoOneDriveItemId || "",
      thumbnailPath: thumbnailPath || "",
      category: category?.trim() || "General",
      subCategory: subCategory?.trim() || "",
      courses: sanitizedCourses,
      isPublished: false,
    });

    await program.save();

    res.status(201).json({
      message: "Program created successfully.",
      program,
    });
  } catch (error: any) {
    console.error("Create program error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e: any) => e.message).join(", ");
      res.status(400).json({ message: `Validation error: ${messages}` });
      return;
    }
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

    // Strip out courses/videos/tests with empty titles
    if (req.body.courses) {
      req.body.courses = req.body.courses.filter((c: any) => c.title?.trim()).map((c: any) => ({
        ...c,
        title: c.title.trim(),
        videos: (c.videos || []).filter((v: any) => v.title?.trim()).map((v: any) => ({ ...v, title: v.title.trim() })),
        tests: (c.tests || []).filter((t: any) => t.title?.trim()).map((t: any) => ({ ...t, title: t.title.trim() })),
      }));
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

    // Video files → upload to OneDrive only (no local copy kept)
    if (req.file.mimetype.startsWith("video/")) {
      let oneDriveItemId: string;
      try {
        oneDriveItemId = await uploadToOneDrive(
          req.file.path,
          req.file.filename
        );
      } catch (odErr: any) {
        // Delete the temp file so disk space isn't wasted
        fs.unlink(req.file.path, () => {});
        console.error("OneDrive upload failed:", odErr.message);
        res.status(502).json({
          message: `OneDrive upload failed: ${odErr.message}. Please try again.`,
        });
        return;
      }
      // Delete local temp file after successful OneDrive upload
      fs.unlink(req.file.path, (err) => {
        if (err) console.warn("Could not delete temp video file:", err.message);
      });
      res.status(200).json({
        message: "Video uploaded to OneDrive.",
        oneDriveItemId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });
      return;
    }

    // Non-video files (thumbnails, materials, etc.) → local storage as before
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

// GET /api/lms/stream-sample-video/:programId - Authenticated sample video streaming proxy
export const streamSampleVideo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { programId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(programId as string)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }
    const program = await LMSProgram.findById(programId);
    if (!program) { res.status(404).json({ message: "Program not found." }); return; }

    const range = req.headers.range;

    // ── Stream from OneDrive (primary) ────────────────────────────────────
    if (program.sampleVideoOneDriveItemId) {
      const itemInfo = await getOneDriveItemInfo(program.sampleVideoOneDriveItemId);
      const odResponse = await axios.get(itemInfo.downloadUrl, {
        responseType: "stream",
        headers: range ? { Range: range } : {},
        validateStatus: (s) => s < 500,
      });
      res.writeHead(odResponse.status, {
        "Content-Type": odResponse.headers["content-type"] || "video/mp4",
        "Content-Length": odResponse.headers["content-length"] || "",
        "Content-Range": odResponse.headers["content-range"] || "",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      odResponse.data.pipe(res);
      return;
    }

    // ── Fall back to local file ────────────────────────────────────────────
    if (program.sampleVideoPath) {
      const absPath = path.join(process.cwd(), program.sampleVideoPath);
      if (!fs.existsSync(absPath)) { res.status(404).json({ message: "Sample video file missing." }); return; }
      const stat = fs.statSync(absPath);
      const fileSize = stat.size;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        res.writeHead(206, { "Content-Range": `bytes ${start}-${end}/${fileSize}`, "Accept-Ranges": "bytes", "Content-Length": end - start + 1, "Content-Type": "video/mp4", "Cache-Control": "no-store" });
        fs.createReadStream(absPath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { "Content-Length": fileSize, "Content-Type": "video/mp4", "Cache-Control": "no-store" });
        fs.createReadStream(absPath).pipe(res);
      }
      return;
    }

    res.status(404).json({ message: "No sample video found." });
  } catch (error: any) {
    console.error("Stream sample video error:", error);
    res.status(500).json({ message: "Server error streaming sample video." });
  }
};

// GET /api/lms/stream-video/:programId/:courseIdx/:videoIdx - Authenticated video streaming proxy
export const streamVideo = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { programId, courseIdx, videoIdx } = req.params;
    const cIdx = parseInt(courseIdx as string, 10);
    const vIdx = parseInt(videoIdx as string, 10);

    if (!mongoose.Types.ObjectId.isValid(programId as string)) {
      res.status(400).json({ message: "Invalid program ID." });
      return;
    }

    const program = await LMSProgram.findById(programId);
    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    // Users must be enrolled; admins who own it can also stream
    if (req.user.role !== USER_ROLE.ADMIN || String(program.adminId) !== String(req.user._id)) {
      const enrollment = await LMSEnrollment.findOne({ userId: req.user._id, programId });
      if (!enrollment) {
        res.status(403).json({ message: "Not enrolled in this program." });
        return;
      }
    }

    const course = program.courses[cIdx];
    if (!course) { res.status(404).json({ message: "Course not found." }); return; }
    const video = course.videos[vIdx];
    if (!video || (!video.oneDriveItemId && !video.filePath)) {
      res.status(404).json({ message: "Video not found." });
      return;
    }

    const range = req.headers.range;

    // ── Stream from OneDrive (primary) ────────────────────────────────────
    if (video.oneDriveItemId) {
      const itemInfo = await getOneDriveItemInfo(video.oneDriveItemId);

      // Forward the request to OneDrive's pre-authenticated download URL,
      // passing through the Range header so seeking works.
      const odResponse = await axios.get(itemInfo.downloadUrl, {
        responseType: "stream",
        headers: range ? { Range: range } : {},
        validateStatus: (s) => s < 500,
      });

      res.writeHead(odResponse.status, {
        "Content-Type": odResponse.headers["content-type"] || video.mimeType || "video/mp4",
        "Content-Length": odResponse.headers["content-length"] || "",
        "Content-Range": odResponse.headers["content-range"] || "",
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      odResponse.data.pipe(res);
      return;
    }

    // ── Fall back to local file (backward compat) ─────────────────────────
    const absPath = path.join(process.cwd(), video.filePath!);
    if (!fs.existsSync(absPath)) {
      res.status(404).json({ message: "Video file missing from server." });
      return;
    }

    const stat = fs.statSync(absPath);
    const fileSize = stat.size;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const stream = fs.createReadStream(absPath, { start, end });
      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": video.mimeType || "video/mp4",
        "Cache-Control": "no-store",
      });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": video.mimeType || "video/mp4",
        "Cache-Control": "no-store",
      });
      fs.createReadStream(absPath).pipe(res);
    }
  } catch (error: any) {
    console.error("Stream video error:", error);
    res.status(500).json({ message: "Server error streaming video." });
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

    // ── Block enrollment if user has an incomplete program ──
    const incompleteEnrollment = await LMSEnrollment.findOne({
      userId: req.user._id,
      status: { $in: ["ENROLLED", "IN_PROGRESS"] },
    }).populate("programId", "name");

    if (incompleteEnrollment) {
      const progName = (incompleteEnrollment.programId as any)?.name || "another program";
      res.status(400).json({
        message: `Please complete "${progName}" before enrolling in a new program.`,
      });
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

// POST /api/lms/enrollments/:programId/mark-complete
// Used when a program has no tests — user manually declares completion
export const markProgramComplete = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const programId = req.params.programId as string;

    const enrollment = await LMSEnrollment.findOne({ userId: req.user._id, programId });
    if (!enrollment) {
      res.status(404).json({ message: "Enrollment not found." });
      return;
    }

    if (enrollment.status === "COMPLETED") {
      res.status(400).json({ message: "Program is already completed." });
      return;
    }

    const program = await LMSProgram.findById(programId);
    if (!program) {
      res.status(404).json({ message: "Program not found." });
      return;
    }

    // Only allowed when the program has no tests at all
    const hasTests = program.courses.some((c: any) => c.tests && c.tests.length > 0);
    if (hasTests) {
      res.status(400).json({ message: "This program has tests. Please complete all tests to finish the program." });
      return;
    }

    // Mark all courses as completed
    enrollment.completedCourses = program.courses.map((c: any) => c._id);
    enrollment.status = "COMPLETED";
    if (!enrollment.certificateIssuedAt) {
      enrollment.certificateIssuedAt = new Date();
    }

    await enrollment.save();

    res.status(200).json({
      message: "🎉 Program marked as complete! Your certificate has been issued.",
      enrollment,
    });
  } catch (error: any) {
    console.error("Mark complete error:", error);
    res.status(500).json({ message: "Server error." });
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

// GET /api/lms/admin/dashboard - Admin gets all enrollment stats
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const enrollments = await LMSEnrollment.find()
      .populate("userId", "firstName middleName lastName email mobile country state city")
      .populate("programId", "name courses");

    // Determine real status: ENROLLED but hasn't watched any video = "NOT_STARTED",
    // ENROLLED and has at least completedCourses.length > 0 or status=IN_PROGRESS = "IN_PROGRESS"
    const data = enrollments.map((e: any) => {
      let displayStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";
      if (e.status === "COMPLETED") {
        displayStatus = "COMPLETED";
      } else if (e.status === "IN_PROGRESS" || e.completedCourses.length > 0 || e.completedTests.length > 0) {
        displayStatus = "IN_PROGRESS";
      }
      return {
        _id: e._id,
        user: e.userId,
        program: e.programId,
        enrolledAt: e.enrolledAt,
        status: displayStatus,
        completedCourses: e.completedCourses.length,
        totalCourses: e.programId?.courses?.length || 0,
      };
    });

    const total = data.length;
    const completed = data.filter((d: any) => d.status === "COMPLETED").length;
    const inProgress = data.filter((d: any) => d.status === "IN_PROGRESS").length;
    const notStarted = data.filter((d: any) => d.status === "NOT_STARTED").length;

    // Total registered users (role = USER only, excludes admins)
    const totalRegisteredUsers = await User.countDocuments({ role: "USER", isVerified: true });
    const registeredUsers = await User.find({ role: "USER", isVerified: true })
      .select("firstName middleName lastName email mobile country state city createdAt")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ total, completed, inProgress, notStarted, enrollments: data, totalRegisteredUsers, registeredUsers });
  } catch (error: any) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// GET /api/lms/wishlist - Get user's wishlist
export const getWishlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const items = await Wishlist.find({ userId: req.user._id }).populate("programId");
    res.status(200).json({ wishlist: items });
  } catch (error: any) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// POST /api/lms/wishlist/:programId - Add to wishlist
export const addToWishlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { programId } = req.params;
    const exists = await Wishlist.findOne({ userId: req.user._id, programId });
    if (exists) { res.status(400).json({ message: "Already in wishlist." }); return; }
    const item = new Wishlist({ userId: req.user._id, programId });
    await item.save();
    res.status(201).json({ message: "Added to wishlist.", item });
  } catch (error: any) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ message: "Server error." });
  }
};

// DELETE /api/lms/wishlist/:programId - Remove from wishlist
export const removeFromWishlist = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { programId } = req.params;
    await Wishlist.deleteOne({ userId: req.user._id, programId });
    res.status(200).json({ message: "Removed from wishlist." });
  } catch (error: any) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
