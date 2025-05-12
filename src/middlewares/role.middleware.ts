import { Request, Response, NextFunction } from "express";
import { RoleType } from "../types/role.types";
import { errorResponse } from "../utils/response";
import { prisma } from "../config/db";

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    role: RoleType;
    email?: string;
    name?: string;
  };
}

export const checkRole = (allowedRoles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;

    if (!user) {
      return res.status(401).json(errorResponse("Unauthorized"));
    }

    if (!user.role || !allowedRoles.includes(user.role)) {
      return res.status(403).json(errorResponse("Forbidden: Insufficient permissions"));
    }

    return next();
  };
};

// Special middleware to ensure only one president exists
export const checkPresidentLimit = async (
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const presidentCount = await prisma.user.count({
      where: { role: RoleType.PRESIDENT }
    });

    if (presidentCount >= 1) {
      return res.status(403).json(errorResponse("Only one president is allowed"));
    }

    return next();
  } catch (error) {
    console.error("President limit check error:", error);
    return res.status(500).json(errorResponse("Internal server error"));
  }
}; 