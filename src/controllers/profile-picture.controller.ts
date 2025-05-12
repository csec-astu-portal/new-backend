import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { uploadToCloudinary } from '../config/cloudinary';
import { verifyToken } from '../utils/auth.utils';
import { errorResponse, successResponse } from '../utils/response.util';

/**
 * Update a member's profile picture using Cloudinary
 * This endpoint requires authentication via Bearer token
 */
export const updateProfilePicture = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    
    // Extract token from Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json(errorResponse('Authentication required'));
    }
    
    // Verify the token and get the user
    const currentUser = await verifyToken(token);
    
    if (!currentUser) {
      return res.status(401).json(errorResponse('Authentication failed'));
    }
    
    // Check if the current user is updating their own profile or is a president
    const isOwnProfile = currentUser.id === memberId;
    const isPresident = currentUser.role === 'PRESIDENT';
    
    if (!isOwnProfile && !isPresident) {
      return res.status(403).json(errorResponse('You can only update your own profile picture unless you are a president'));
    }
    
    // Check if member exists
    const existingMember = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    if (!existingMember) {
      return res.status(404).json(errorResponse('Member not found'));
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(errorResponse('No profile picture uploaded'));
    }
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.path, 'profile-pictures');
    
    // Update the member's profile picture URL in the database
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { profileImage: cloudinaryResult.secure_url },
      select: {
        id: true,
        freeName: true,
        email: true,
        profileImage: true
      }
    });
    
    // Return the updated member with the new profile image URL
    return res.json(successResponse({
      id: updatedMember.id,
      name: updatedMember.freeName,
      email: updatedMember.email,
      profileImage: updatedMember.profileImage
    }, 'Profile picture updated successfully'));
  } catch (error) {
    console.error('Update profile picture error:', error);
    return res.status(500).json(errorResponse('Failed to update profile picture'));
  }
};

/**
 * Simple profile picture update endpoint that doesn't require authentication
 * This is useful for testing or when authentication is not working
 */
export const simpleUpdateProfilePicture = async (req: Request, res: Response) => {
  try {
    const { memberId } = req.params;
    
    // Check if member exists
    const existingMember = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    if (!existingMember) {
      return res.status(404).json(errorResponse('Member not found'));
    }
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json(errorResponse('No profile picture uploaded'));
    }
    
    // Upload to Cloudinary
    const cloudinaryResult = await uploadToCloudinary(req.file.path, 'profile-pictures');
    
    // Update the member's profile picture URL in the database
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { profileImage: cloudinaryResult.secure_url },
      select: {
        id: true,
        freeName: true,
        email: true,
        profileImage: true
      }
    });
    
    // Return the updated member with the new profile image URL
    return res.json(successResponse({
      id: updatedMember.id,
      name: updatedMember.freeName,
      email: updatedMember.email,
      profileImage: updatedMember.profileImage
    }, 'Profile picture updated successfully'));
  } catch (error) {
    console.error('Simple update profile picture error:', error);
    return res.status(500).json(errorResponse('Failed to update profile picture'));
  }
};

export default {
  updateProfilePicture,
  simpleUpdateProfilePicture
};
