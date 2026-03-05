import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { authorize } from "../middleware/authorize";
import { upload, materialUpload, videoUpload, handleMulterError } from "../middleware/upload";
import { USER_ROLE } from "../types/roles";
import {
  createProgram,
  getPrograms,
  getProgram,
  updateProgram,
  deleteProgram,
  togglePublish,
  uploadFile,
  streamVideo,
  streamSampleVideo,
  enrollInProgram,
  getEnrollments,
  getEnrollment,
  completeCourse,
  submitTest,
  getProgramEnrollments,
  getDashboardStats,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/lmsController";
import {
  getCategories,
  createCategory,
  addSubCategory,
  deleteCategory,
  deleteSubCategory,
} from "../controllers/categoryController";

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

// Video upload — restricted to video formats (admin only)
router.post(
  "/upload/video",
  authorize(USER_ROLE.ADMIN),
  videoUpload.single("file"),
  handleMulterError,
  uploadFile
);

// Authenticated video streaming proxy (no direct file access)
router.get(
  "/stream-video/:programId/:courseIdx/:videoIdx",
  streamVideo
);

// Authenticated sample video streaming proxy
router.get(
  "/stream-sample-video/:programId",
  streamSampleVideo
);

// ===== Shared routes =====
router.get("/programs", getPrograms);
router.get("/programs/:programId", getProgram);

// ===== Admin dashboard =====
router.get("/admin/dashboard", authorize(USER_ROLE.ADMIN), getDashboardStats);

// ===== Category routes =====
router.get("/categories", getCategories);
router.post("/categories", authorize(USER_ROLE.ADMIN), createCategory);
router.put("/categories/:id", authorize(USER_ROLE.ADMIN), addSubCategory);
router.delete("/categories/:id", authorize(USER_ROLE.ADMIN), deleteCategory);
router.delete("/categories/:id/sub/:subCategory", authorize(USER_ROLE.ADMIN), deleteSubCategory);

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

// ===== User wishlist =====
router.get("/wishlist", authorize(USER_ROLE.USER), getWishlist);
router.post("/wishlist/:programId", authorize(USER_ROLE.USER), addToWishlist);
router.delete("/wishlist/:programId", authorize(USER_ROLE.USER), removeFromWishlist);

export default router;
