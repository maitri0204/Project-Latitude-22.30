import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";
import { USER_ROLE } from "../types/roles";

export const authorize = (...roles: USER_ROLE[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ message: "Authentication required." });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        message: "You do not have permission to perform this action.",
      });
      return;
    }

    next();
  };
};
