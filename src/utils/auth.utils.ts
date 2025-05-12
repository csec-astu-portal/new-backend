import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db';
import { errorResponse } from './response';
import { RoleType } from '../types/role.types';
import { User } from '../types/user.types';

/**
 * Interface for JWT payload
 */
interface JwtPayload {
  id: string;
  email: string;
  role?: string;
  roles?: string[];
  freeName?: string;
  fullName?: string; // Added for UI consistency
  name?: string;
}

/**
 * Extended Request interface with user property
 */
export interface RequestWithUser extends Request {
  user?: Pick<User, 'id' | 'email' | 'role' | 'freeName' | 'divisionId'> & { fullName?: string };
}

/**
 * Verifies JWT token and returns the user
 * @param token JWT token
 * @returns User object or null if token is invalid
 */
export const verifyToken = async (token: string): Promise<(Pick<User, 'id' | 'email' | 'role' | 'freeName' | 'divisionId'> & { fullName?: string }) | null> => {
  try {
    // Verify the token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'fallback_secret'
    ) as JwtPayload;
    
    console.log('Decoded token:', decoded);
    
    if (!decoded || !decoded.id) {
      console.log('Token missing id field');
      return null;
    }
    
    // Create a user object directly from the token if needed
    // This is useful when the database is empty or when testing
    const userFromToken = {
      id: decoded.id,
      email: decoded.email,
      role: (decoded.role || (decoded.roles && decoded.roles.length > 0 ? decoded.roles[0] : 'MEMBER')) as RoleType,
      freeName: decoded.freeName || decoded.name || '',
      fullName: decoded.fullName || decoded.freeName || decoded.name || '', // Include fullName for UI consistency
      divisionId: null
    };
    
    // Try to find the user in the database
    try {
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { 
          id: true, 
          email: true, 
          role: true, 
          freeName: true, 
          divisionId: true 
        }
      });
      
      // Add fullName property for UI consistency
      if (user) {
        (user as any).fullName = user.freeName;
      }
      
      if (user) {
        // Handle legacy tokens with 'name' instead of 'freeName'
        if (decoded.name && !user.freeName) {
          user.freeName = decoded.name;
        }
        
        // Handle legacy tokens with 'roles' array instead of 'role' string
        if (decoded.roles && decoded.roles.length > 0 && !user.role) {
          user.role = decoded.roles[0] as RoleType;
        }
        
        console.log('User found in database:', user);
        return user;
      }
    } catch (dbError) {
      console.error('Database error when finding user:', dbError);
      console.log('Continuing with mock user from token due to database error');
      // Continue with user from token if database lookup fails
    }
    
    // If we couldn't find the user in the database, use the token information
    console.log('Using user info from token:', userFromToken);
    return userFromToken;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      console.error(`Token expired at ${new Date(error.expiredAt).toLocaleString()}. Please login again.`);
    } else if (error.name === 'JsonWebTokenError') {
      console.error('Invalid token format:', error.message);
    } else if (error.name === 'NotBeforeError') {
      console.error(`Token not valid until ${new Date(error.date).toLocaleString()}`);
    } else {
      console.error('Token verification error:', error);
    }
    return null;
  }
};

/**
 * Extracts token from request headers or cookies
 * @param req Request object
 * @returns Token string or null if not found
 */
export const extractTokenFromRequest = (req: Request): string | null => {
  // Try to get token from Authorization header
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    console.log('Token found in Authorization header');
    return authHeader.split(' ')[1];
  }
  
  // Try to get token from cookies
  if (req.cookies && req.cookies.jwt) {
    console.log('Token found in cookies');
    return req.cookies.jwt;
  }
  
  // Try to get token from query parameter (not recommended for production)
  if (req.query && req.query.token) {
    console.log('Token found in query parameter');
    return req.query.token as string;
  }
  
  console.log('No token found in request');
  return null;
};

/**
 * Checks if user has PRESIDENT role
 * @param user User object
 * @returns True if user is PRESIDENT, false otherwise
 */
export const isPresident = (user: Pick<User, 'role'>): boolean => {
  return user.role === RoleType.PRESIDENT;
};

/**
 * Checks if user has any division head role
 * @param user User object
 * @returns True if user is a division head, false otherwise
 */
export const isDivisionHead = (user: Pick<User, 'role'>): boolean => {
  const divisionHeadRoles = [
    RoleType.CPD_HEAD,
    RoleType.CBD_HEAD,
    RoleType.CYBER_HEAD,
    RoleType.DEV_HEAD,
    RoleType.DATA_SCIENCE_HEAD
  ] as RoleType[];
  
  return divisionHeadRoles.includes(user.role);
};

/**
 * Checks if user has access to a specific division
 * @param user User object
 * @param divisionId Division ID
 * @returns True if user has access, false otherwise
 */
export const hasAccessToDivision = (
  user: Pick<User, 'role' | 'divisionId'>, 
  divisionId: string
): boolean => {
  // President can access any division
  if (user.role === RoleType.PRESIDENT) {
    return true;
  }
  
  // Division heads can only access their own division
  return user.divisionId === divisionId;
};

/**
 * Validates file upload
 * @param file File object
 * @returns Object with validation result and error message
 */
export const validateImageUpload = (file: Express.Multer.File | undefined): { 
  valid: boolean; 
  error?: string 
} => {
  if (!file) {
    return { valid: true }; // No file uploaded, validation passes
  }
  
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB
  
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return { 
      valid: false, 
      error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed' 
    };
  }
  
  if (file.size > maxSize) {
    return { 
      valid: false, 
      error: 'File too large. Maximum file size is 5MB' 
    };
  }
  
  return { valid: true };
};

/**
 * Authentication handler for controllers
 * Extracts token, verifies it, and attaches user to request
 * @param req Request object
 * @param res Response object
 * @returns User object or sends error response
 */
export const authenticateRequest = async (
  req: Request, 
  res: Response
): Promise<(Pick<User, 'id' | 'email' | 'role' | 'freeName' | 'divisionId'> & { fullName?: string }) | null> => {
  const token = extractTokenFromRequest(req);
  
  if (!token) {
    res.status(401).json(errorResponse('Authentication required'));
    return null;
  }
  
  try {
    // Try to verify the token directly to catch specific errors
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        res.status(401).json(errorResponse(`Your session has expired. Please login again.`));
        return null;
      } else if (jwtError.name === 'JsonWebTokenError') {
        res.status(401).json(errorResponse(`Invalid token format: ${jwtError.message}`));
        return null;
      } else if (jwtError.name === 'NotBeforeError') {
        res.status(401).json(errorResponse(`Token not yet valid`));
        return null;
      }
    }
    
    // If we get here, proceed with full token verification
    const user = await verifyToken(token);
    
    if (!user) {
      res.status(401).json(errorResponse('Invalid authentication token'));
      return null;
    }
    
    // Attach user to request
    (req as RequestWithUser).user = user;
    
    return user;
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json(errorResponse('Authentication failed'));
    return null;
  }
};
