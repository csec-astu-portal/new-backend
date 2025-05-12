import { Request } from 'express';
import { RoleType } from '@prisma/client';

export interface JWTPayload {
  id: string;
  email: string;
  roles: RoleType[];
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JWTPayload;
} 