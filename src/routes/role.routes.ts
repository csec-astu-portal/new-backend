import { Router, Request, Response, NextFunction } from "express";
import { getRolePermissionsController, getAllRoles } from "../controllers/role.controller";
import { PrismaClient, RoleType } from "@prisma/client";
import jwt from "jsonwebtoken";

const router = Router();
const prisma = new PrismaClient();

// Get current user's role permissions
router.get("/permissions", (req: Request, res: Response, next: NextFunction) => {
  getRolePermissionsController(req, res).catch(next);
});

// Get all available roles
router.get("/all", (req: Request, res: Response, next: NextFunction) => {
  getAllRoles(req, res).catch(next);
});

// Update user role to division head
router.post("/make-division-head", async (req: Request, res: Response) => {
  try {
    const { userId, divisionId, divisionName } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Determine the appropriate role based on division name
    // Initialize with MEMBER as default
    let newRole: RoleType = 'MEMBER';
    
    if (divisionName) {
      // Use the provided division name to determine role
      switch (divisionName.toUpperCase()) {
        case 'CPD':
        case 'COMPETITIVE PROGRAMMING DIVISION':
          newRole = 'CPD_HEAD';
          break;
        case 'DEV':
        case 'DEVELOPMENT DIVISION':
          newRole = 'DEV_HEAD';
          break;
        case 'CYBER':
        case 'CYBERSECURITY DIVISION':
          newRole = 'CYBER_HEAD';
          break;
        case 'CBD':
        case 'CAPACITY BUILDING DIVISION':
          newRole = 'CBD_HEAD';
          break;
        case 'DATA_SCIENCE':
        case 'DATA SCIENCE DIVISION':
          newRole = 'DATA_SCIENCE_HEAD';
          break;
        default:
          // Default to DEV_HEAD if no match
          newRole = 'DEV_HEAD';
      }
    } else {
      // Default to DEV_HEAD if no division name provided
      newRole = 'DEV_HEAD';
    }
    
    // Update the user's role
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: newRole,
        divisionId: divisionId || null
      }
    });
    
    // Generate a new token with the updated role
    const tokenSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        id: updatedUser.id,
        email: updatedUser.email,
        role: updatedUser.role,
        freeName: updatedUser.freeName
      },
      tokenSecret,
      { expiresIn: '24h' }
    );
    
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          status: updatedUser.status,
          freeName: updatedUser.freeName,
          divisionId: updatedUser.divisionId,
          isEmailVerified: updatedUser.isEmailVerified
        },
        token
      },
      message: 'User role updated to division head successfully'
    });
  } catch (error) {
    console.error('Error updating user role:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update user role'
    });
  }
});

export default router;