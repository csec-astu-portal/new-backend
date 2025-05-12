import { Request, Response } from "express";
import { RoleType } from "@prisma/client";
import { successResponse, errorResponse } from "../utils/response";
import { getRolePermissions } from "../services/role.service";
import { prisma } from "../config/db";

// Define a type for the user in the request
interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    name?: string;
  };
}

export const getRolePermissionsController = async (req: Request, res: Response) => {
  try {
    // Cast the request to our custom type
    const { user } = req as RequestWithUser;

    if (!user || !user.id) {
      return res.status(401).json(errorResponse('Please login to access this resource'));
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true }
    });

    if (!userRecord) {
      return res.status(404).json(errorResponse('User not found'));
    }

    const permissions = getRolePermissions(userRecord.role as RoleType);
    return res.json(successResponse(permissions, 'Role permissions retrieved successfully'));
  } catch (error) {
    console.error('Get role permissions error:', error);
    return res.status(500).json(errorResponse('Failed to get role permissions'));
  }
};

export const getAllRoles = async (_req: Request, res: Response) => {
  try {
    const roles = Object.values(RoleType);
    return res.status(200).json(successResponse(roles, 'Roles retrieved successfully'));
  } catch (error) {
    console.error('Get all roles error:', error);
    return res.status(500).json(errorResponse('Failed to get all roles'));
  }
}; 