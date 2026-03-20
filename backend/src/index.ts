import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import path from "path";
import connectDB from "./config/db";
import authRoutes from "./routes/authRoutes";
import lmsRoutes from "./routes/lmsRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000", "http://localhost:3002"],
  credentials: true,
}));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static file serving for uploads
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "LMS Backend is running" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/lms", lmsRoutes);

// Connect to MongoDB, then start server
const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`🚀 LMS Server is running on port ${PORT} (0.0.0.0) [${process.env.NODE_ENV}]`);
  });
};

startServer();

export default app;
