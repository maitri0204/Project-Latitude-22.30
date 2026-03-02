import { Request, Response, NextFunction } from "express";
import { USER_ROLE } from "../types/roles";

export const validateSignup = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const { firstName, lastName, email } = req.body;

  if (!firstName || !firstName.trim()) {
    res.status(400).json({ message: "First name is required." });
    return;
  }

  if (!lastName || !lastName.trim()) {
    res.status(400).json({ message: "Last name is required." });
    return;
  }

  if (!email || !email.trim()) {
    res.status(400).json({ message: "Email is required." });
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    res.status(400).json({ message: "Invalid email format." });
    return;
  }

  next();
};
