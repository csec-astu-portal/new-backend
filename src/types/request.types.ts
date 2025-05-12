import { Request } from 'express';
import { RoleType } from '@prisma/client';

/**
 * User information attached to the request by the authentication middleware
 */
export interface AuthUser {
  id: string;
  email: string;
  roles: RoleType[];
  name?: string;
}

/**
 * Extended Request type that includes the authenticated user information
 * This is used throughout the application for controller functions that need
 * access to the authenticated user
 */
export interface RequestWithUser extends Request {
  user?: AuthUser;
}
