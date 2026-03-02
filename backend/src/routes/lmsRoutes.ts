import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { upload, materialUpload, handleMulterError } from "../middleware/upload";
import { USER_ROLE } from "../types/roles";
import {
  createProgram,
  getPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  togglePublish,
  uploadFile,
  enrollInProgram,
  getEnrollments,
  getEnrollment,
  completeCourse,
  submitTest,
  getProgramEnrollments,
} from "../controllers/lmsController";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ===== Admin routes (program management) =====
router.post(
  "/programs",
  authorize(USER_ROLE.ADMIN),
  createProgram
);

router.put(
  "/programs/:programId",
  authorize(USER_ROLE.ADMIN),
  updateProgram
);

router.delete(
  "/programs/:programId",
  authorize(USER_ROLE.ADMIN),
  deleteProgram
);

router.post(
  "/programs/:programId/publish",
  authorize(USER_ROLE.ADMIN),
  togglePublish
);

router.get(
  "/programs/:programId/enrollments",
  authorize(USER_ROLE.ADMIN),
  getProgramEnrollments
);

// File upload (admin only)
router.post(
  "/upload",
  authorize(USER_ROLE.ADMIN),
  upload.single("file"),
  handleMulterError,
  uploadFile
);

// Material upload — restricted to JPEG, PNG, PDF (admin only)
router.post(
  "/upload/material",
  authorize(USER_ROLE.ADMIN),
  materialUpload.single("file"),
  handleMulterError,
  uploadFile
);

// ===== Shared routes =====
router.get("/programs", getPrograms);
router.get("/programs/:programId", getProgram);

// ===== User routes (enrollment & learning) =====
router.post(
  "/programs/:programId/enroll",
  authorize(USER_ROLE.USER),
  enrollInProgram
);

router.get(
  "/enrollments",
  authorize(USER_ROLE.USER),
  getEnrollments
);

router.get(
  "/enrollments/:programId",
  authorize(USER_ROLE.USER),
  getEnrollment
);

router.post(
  "/enrollments/:programId/complete-course",
  authorize(USER_ROLE.USER),
  completeCourse
);

router.post(
  "/enrollments/:programId/submit-test",
  authorize(USER_ROLE.USER),
  submitTest
);

export default router;
