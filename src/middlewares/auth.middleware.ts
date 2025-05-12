import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { RoleType } from "@prisma/client";
import { JWT_CONFIG } from "../config/jwt.config";
import { prisma } from "../config/db";

// Define the authenticated request type
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    roles: RoleType[];
    name?: string;
    fullName?: string; // Added for UI consistency
    freeName?: string; // For backward compatibility
  };
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    console.log('authenticateToken middleware called');
    
    // Try to get token from Authorization header
    const authHeader = req.headers["authorization"];
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(" ")[1] : null;
    
    // If no token in Authorization header, try cookie
    if (!token && req.cookies && req.cookies.jwt) {
      token = req.cookies.jwt;
      console.log('Using token from cookie');
    }
    
    // If still no token, check query parameter (not recommended for production)
    if (!token && req.query && req.query.token) {
      token = req.query.token as string;
      console.log('Using token from query parameter');
    }

    if (!token) {
      console.log('No token found in request');
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided."
      });
    }
    
    console.log('Token found, verifying...');

    const decoded = jwt.verify(token, JWT_CONFIG.secret) as {
      id: string;
      email: string;
      roles?: string[];
      role?: string;
      name?: string;
      freeName?: string;
    };
    
    console.log('Token verified successfully for user:', decoded.id);

    // Check if the user has been withdrawn or marked as inactive
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        note: true
      }
    });

    // If user doesn't exist or has a note indicating they've been withdrawn, deny access
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found. Your account may have been deleted."
      });
    }

    // Check if user has been withdrawn by looking at their note field
    // This is the most reliable way since we're storing withdrawal info in the note field
    if (user.note && (user.note.startsWith('WITHDRAWN:') || user.note.startsWith('WITHDRAWN'))) {
      console.log(`Blocked login attempt by withdrawn user: ${user.id}`);
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact an administrator."
      });
    }

    // Convert string roles to RoleType, handling both 'roles' array and 'role' string
    let typedRoles: RoleType[] = [];
    
    if (decoded.roles && Array.isArray(decoded.roles)) {
      // Handle array of roles
      typedRoles = decoded.roles.map(role => role as RoleType);
    } else if (decoded.role) {
      // Handle single role as string
      typedRoles = [decoded.role as RoleType];
    } else if (user.role) {
      // Use the role from the database if not in the token
      typedRoles = [user.role as RoleType];
    }

    (req as AuthenticatedRequest).user = {
      id: decoded.id,
      email: decoded.email,
      roles: typedRoles,
      name: decoded.name || decoded.freeName
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: "Invalid token."
      });
    }
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};

export const authorize = (allowedRoles: RoleType[]) => {
  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) {
      return res.status(401).json({
        success: false,
        message: "Access denied. User not authenticated."
      });
    }

    if (!authReq.user.roles || !authReq.user.roles.some(role => allowedRoles.includes(role))) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Insufficient permissions."
      });
    }

    next();
  };
};

// Special middleware to ensure only one president exists
export const checkPresidentLimit = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const presidentCount = await prisma.user.count({
      where: { role: RoleType.PRESIDENT }
    });

    if (presidentCount > 0) {
      return res.status(409).json({
        success: false,
        message: "Only one PRESIDENT is allowed in the system"
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to check president limit"
    });
  }
}; 