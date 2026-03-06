import axios from "axios";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ───
export const authAPI = {
  signup: (data: { firstName: string; middleName?: string; lastName: string; email: string }) =>
    api.post("/auth/signup", data),

  verifySignupOTP: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-signup-otp", data),

  login: (data: { email: string }) =>
    api.post("/auth/login", data),

  verifyOTP: (data: { email: string; otp: string }) =>
    api.post("/auth/verify-otp", data),

  getProfile: () =>
    api.get("/auth/profile"),
};

// ─── LMS API ───
export const lmsAPI = {
  // Programs
  createProgram: (data: any) =>
    api.post("/lms/programs", data),

  getPrograms: () =>
    api.get("/lms/programs"),

  getProgram: (programId: string) =>
    api.get(`/lms/programs/${programId}`),

  updateProgram: (programId: string, data: any) =>
    api.put(`/lms/programs/${programId}`, data),

  deleteProgram: (programId: string) =>
    api.delete(`/lms/programs/${programId}`),

  togglePublish: (programId: string) =>
    api.post(`/lms/programs/${programId}/publish`),

  // File upload
  uploadFile: (formData: FormData) =>
    api.post("/lms/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Material upload — restricted to JPEG, PNG, PDF
  uploadMaterial: (formData: FormData) =>
    api.post("/lms/upload/material", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Video upload — restricted to video formats
  uploadVideo: (formData: FormData) =>
    api.post("/lms/upload/video", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Enrollments
  enrollInProgram: (programId: string) =>
    api.post(`/lms/programs/${programId}/enroll`),

  getEnrollments: () =>
    api.get("/lms/enrollments"),

  getEnrollment: (programId: string) =>
    api.get(`/lms/enrollments/${programId}`),

  completeCourse: (programId: string, courseId: string) =>
    api.post(`/lms/enrollments/${programId}/complete-course`, { courseId }),

  markProgramComplete: (programId: string) =>
    api.post(`/lms/enrollments/${programId}/mark-complete`),

  submitTest: (programId: string, data: { courseId: string; testId: string; answers: number[] }) =>
    api.post(`/lms/enrollments/${programId}/submit-test`, data),

  // Admin enrollment stats
  getProgramEnrollments: (programId: string) =>
    api.get(`/lms/programs/${programId}/enrollments`),

  // Categories
  getCategories: () =>
    api.get("/lms/categories"),

  createCategory: (data: { name: string }) =>
    api.post("/lms/categories", data),

  addSubCategory: (id: string, data: { subCategory: string }) =>
    api.put(`/lms/categories/${id}`, data),

  deleteCategory: (id: string) =>
    api.delete(`/lms/categories/${id}`),

  deleteSubCategory: (id: string, subCategory: string) =>
    api.delete(`/lms/categories/${id}/sub/${encodeURIComponent(subCategory)}`),

  // Admin dashboard
  getDashboardStats: () =>
    api.get("/lms/admin/dashboard"),

  // Wishlist
  getWishlist: () =>
    api.get("/lms/wishlist"),

  addToWishlist: (programId: string) =>
    api.post(`/lms/wishlist/${programId}`),

  removeFromWishlist: (programId: string) =>
    api.delete(`/lms/wishlist/${programId}`),
};

export default api;
