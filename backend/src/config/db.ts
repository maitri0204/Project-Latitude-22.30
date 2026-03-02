import mongoose from "mongoose";
import User from "../models/User";
import { USER_ROLE } from "../types/roles";

const seedAdmin = async (): Promise<void> => {
  const adminEmail = "maitripatel2608@gmail.com";
  const existing = await User.findOne({ email: adminEmail });
  if (!existing) {
    await User.create({
      firstName: "Maitri",
      lastName: "Patel",
      email: adminEmail,
      role: USER_ROLE.ADMIN,
      isVerified: true,
      isActive: true,
    });
    console.log("✅ Admin user seeded:", adminEmail);
  }
};

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI as string;

    if (!mongoURI) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    const conn = await mongoose.connect(mongoURI, {
      dbName: "LATITUDE",
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    await seedAdmin();
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

export default connectDB;
