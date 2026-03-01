import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/api/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", message: "LMS Backend is running" });
});

// Connect to MongoDB, then start server
const startServer = async (): Promise<void> => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
  });
};

startServer();

export default app;
