import { Request, Response, NextFunction } from "express";
import { verifyToken, TokenPayload } from "../utils/jwt";
import User from "../models/User";

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ message: "Access denied. No token provided." });
      return;
    }

    const token = authHeader.split(" ")[1];
    const decoded: TokenPayload = verifyToken(token);

    const user = await User.findById(decoded.id).select("-otp -otpExpires");

    if (!user) {
      res.status(401).json({ message: "User not found." });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ message: "Account is deactivated." });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    if (
      error.message === "Token has expired" ||
      error.message === "Invalid token"
    ) {
      res.status(401).json({ message: error.message });
      return;
    }
    res.status(500).json({ message: "Authentication failed." });
  }
};
