import { Request, Response } from "express";
import User from "../models/User";
import { AuthRequest } from "../middleware/auth";
import { generateToken } from "../utils/jwt";
import { USER_ROLE } from "../types/roles";
import {
  generateOTP,
  hashOTP,
  compareOTP,
  isOTPExpired,
  getOTPExpiration,
} from "../utils/otp";
import { sendOTPEmail } from "../utils/email";

// POST /api/auth/signup
export const signup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { firstName, middleName, lastName, email, mobile, country, state, city } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(400).json({ message: "User with this email already exists." });
      return;
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    const user = new User({
      firstName: firstName.trim(),
      middleName: middleName?.trim() || "",
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      mobile: mobile?.trim() || "",
      country: country?.trim() || "",
      state: state?.trim() || "",
      city: city?.trim() || "",
      role: USER_ROLE.USER,
      otp: hashedOtp,
      otpExpires: getOTPExpiration(10),
      isVerified: false,
      isActive: true,
    });

    await user.save();

    try {
      await sendOTPEmail(email, firstName, otp, "signup");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(201).json({
      message: "Signup successful. Please verify your email with the OTP sent.",
      email: user.email,
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error during signup." });
  }
};

// POST /api/auth/verify-signup-otp
export const verifySignupOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ message: "User is already verified." });
      return;
    }

    if (!user.otp || !user.otpExpires) {
      res.status(400).json({ message: "No OTP found. Please sign up again." });
      return;
    }

    if (isOTPExpired(user.otpExpires)) {
      res.status(400).json({ message: "OTP has expired. Please request a new one." });
      return;
    }

    if (!compareOTP(otp, user.otp)) {
      res.status(400).json({ message: "Invalid OTP." });
      return;
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "Email verified successfully.",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error("Verify signup OTP error:", error);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
};

// POST /api/auth/login
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({ message: "Email is required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "User not found. Please sign up first." });
      return;
    }

    if (!user.isVerified) {
      res.status(400).json({ message: "Account not verified. Please verify your email." });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is deactivated." });
      return;
    }

    const otp = generateOTP();
    const hashedOtp = hashOTP(otp);

    user.otp = hashedOtp;
    user.otpExpires = getOTPExpiration(10);
    await user.save();

    try {
      await sendOTPEmail(email, user.firstName, otp, "login");
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
    }

    res.status(200).json({
      message: "OTP sent to your email.",
      email: user.email,
      otp: process.env.NODE_ENV === "development" ? otp : undefined,
    });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login." });
  }
};

// POST /api/auth/verify-otp
export const verifyOTP = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      res.status(400).json({ message: "Email and OTP are required." });
      return;
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ message: "User not found." });
      return;
    }

    if (!user.otp || !user.otpExpires) {
      res.status(400).json({ message: "No OTP found. Please request a new one." });
      return;
    }

    if (isOTPExpired(user.otpExpires)) {
      res.status(400).json({ message: "OTP has expired. Please request a new one." });
      return;
    }

    if (!compareOTP(otp, user.otp)) {
      res.status(400).json({ message: "Invalid OTP." });
      return;
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user);

    res.status(200).json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
    });
  } catch (error: any) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ message: "Server error during OTP verification." });
  }
};

// GET /api/auth/profile
export const getProfile = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const user = req.user;
    res.status(200).json({
      user: {
        id: user._id,
        firstName: user.firstName,
        middleName: user.middleName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
        isActive: user.isActive,
      },
    });
  } catch (error: any) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Server error." });
  }
};
