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

  // Enrollments
  enrollInProgram: (programId: string) =>
    api.post(`/lms/programs/${programId}/enroll`),

  getEnrollments: () =>
    api.get("/lms/enrollments"),

  getEnrollment: (programId: string) =>
    api.get(`/lms/enrollments/${programId}`),

  completeCourse: (programId: string, courseId: string) =>
    api.post(`/lms/enrollments/${programId}/complete-course`, { courseId }),

  submitTest: (programId: string, data: { courseId: string; testId: string; answers: number[] }) =>
    api.post(`/lms/enrollments/${programId}/submit-test`, data),

  // Admin enrollment stats
  getProgramEnrollments: (programId: string) =>
    api.get(`/lms/programs/${programId}/enrollments`),
};

export default api;
