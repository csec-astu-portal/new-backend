import express from "express";
import { PrismaClient, RoleType } from "@prisma/client";
import { sendDivisionHeadEmail } from "../services/email.service";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();

// Test endpoint to verify routing is working
router.get('/test', async (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Division head routes are working!'
  });
});

// Simple endpoint to assign a division head without authentication
router.post('/assign', async (req, res) => {
  try {
    console.log('Assign division head endpoint called');
    console.log('Request body:', req.body);
    
    const { memberId, divisionId, divisionName } = req.body;
    
    // Validate required fields
    if (!memberId || !divisionId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and Division ID are required'
      });
    }
    
    // Clean up IDs to ensure they're in the correct format for MongoDB
    // MongoDB IDs should be exactly 24 characters
    const cleanMemberId = memberId.length > 24 ? memberId.substring(0, 24) : memberId;
    const cleanDivisionId = divisionId.length > 24 ? divisionId.substring(0, 24) : divisionId;
    
    console.log('Cleaned IDs for MongoDB:', { cleanMemberId, cleanDivisionId });
    
    // Find member and division with all necessary fields for validation
    const member = await prisma.user.findUnique({
      where: { id: cleanMemberId },
      select: {
        id: true,
        email: true,
        freeName: true,
        divisionId: true,
        isEmailVerified: true,
        status: true,
        role: true
      }
    });
    
    const division = await prisma.division.findUnique({
      where: { id: cleanDivisionId }
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Division not found'
      });
    }
    
    // Check if member is already part of the division they're being assigned to head
    if (member.divisionId !== cleanDivisionId) {
      console.log(`Member ${member.freeName} (${cleanMemberId}) is not part of division ${division.name} (${cleanDivisionId})`);
      console.log(`Member's current division: ${member.divisionId || 'None'}`);
      return res.status(400).json({
        success: false,
        message: `This member is not part of the ${division.name} division. Only members who are already part of a division can be assigned as the head of that division.`
      });
    }
    
    // Check if member is verified
    if (!member.isEmailVerified) {
      console.log(`Member ${member.freeName} (${cleanMemberId}) is not verified`);
      return res.status(400).json({
        success: false,
        message: `This member's email is not verified. Only verified members can be assigned as division heads.`
      });
    }
    
    // Check if member is active
    if (member.status !== 'ACTIVE') {
      console.log(`Member ${member.freeName} (${cleanMemberId}) is not active. Status: ${member.status}`);
      return res.status(400).json({
        success: false,
        message: `This member is not active (current status: ${member.status}). Only active members can be assigned as division heads.`
      });
    }
    
    // Determine the appropriate role based on division name
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
          // If division name doesn't match, use the division's name from database
          if (division.name) {
            const divName = division.name.toUpperCase();
            if (divName.includes('CPD') || divName.includes('COMPETITIVE')) {
              newRole = 'CPD_HEAD';
            } else if (divName.includes('DEV') || divName.includes('DEVELOPMENT')) {
              newRole = 'DEV_HEAD';
            } else if (divName.includes('CYBER') || divName.includes('SECURITY')) {
              newRole = 'CYBER_HEAD';
            } else if (divName.includes('CBD') || divName.includes('CAPACITY')) {
              newRole = 'CBD_HEAD';
            } else if (divName.includes('DATA')) {
              newRole = 'DATA_SCIENCE_HEAD';
            }
          }
      }
    } else if (division.name) {
      // If no division name provided, use the division's name from database
      const divName = division.name.toUpperCase();
      if (divName.includes('CPD') || divName.includes('COMPETITIVE')) {
        newRole = 'CPD_HEAD';
      } else if (divName.includes('DEV') || divName.includes('DEVELOPMENT')) {
        newRole = 'DEV_HEAD';
      } else if (divName.includes('CYBER') || divName.includes('SECURITY')) {
        newRole = 'CYBER_HEAD';
      } else if (divName.includes('CBD') || divName.includes('CAPACITY')) {
        newRole = 'CBD_HEAD';
      } else if (divName.includes('DATA')) {
        newRole = 'DATA_SCIENCE_HEAD';
      }
    }
    
    // Update the division to set this member as head
    const updatedDivision = await prisma.division.update({
      where: { id: cleanDivisionId },
      data: { headId: cleanMemberId }
    });
    
    // Update the member's role and division
    const updatedMember = await prisma.user.update({
      where: { id: cleanMemberId },
      data: {
        role: newRole,
        divisionId: cleanDivisionId
      }
    });
    
    // Try to send division head email
    try {
      await sendDivisionHeadEmail(member.email, member.freeName || 'Member', division.name || 'Division');
      console.log('Division head email sent successfully');
    } catch (emailError) {
      console.error('Failed to send division head email:', emailError);
    }
    
    // Generate a new token with the updated role
    const tokenSecret = process.env.JWT_SECRET || 'your-secret-key';
    const token = jwt.sign(
      {
        id: updatedMember.id,
        email: updatedMember.email,
        role: updatedMember.role,
        freeName: updatedMember.freeName
      },
      tokenSecret,
      { expiresIn: '24h' }
    );
    
    // Log the successful update
    console.log(`✅ Successfully updated user ${updatedMember.id} to role ${updatedMember.role}`);
    console.log(`✅ Successfully assigned head ${updatedMember.id} to division ${updatedDivision.id}`);
    
    // Return comprehensive response with user data, token, and division info
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: updatedMember.id,
          email: updatedMember.email,
          role: updatedMember.role,
          status: updatedMember.status,
          freeName: updatedMember.freeName,
          divisionId: updatedMember.divisionId,
          isEmailVerified: updatedMember.isEmailVerified
        },
        token,
        division: {
          id: updatedDivision.id,
          name: updatedDivision.name,
          headId: updatedDivision.headId,
          description: division.description
        }
      },
      message: `${member.freeName || 'Member'} has been assigned as head of ${division.name || 'the division'}`
    });
  } catch (error) {
    console.error('Error assigning division head:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to assign division head'
    });
  }
});

// Get all division heads
router.get('/', async (_req, res) => {
  try {
    // Get all divisions with headId not null
    const divisions = await prisma.division.findMany({
      where: {
        headId: { not: null }
      }
    });
    
    // Fetch the head users separately since there's no direct relation
    const divisionHeadsData = await Promise.all(
      divisions.map(async (division) => {
        if (!division.headId) return null;
        
        const headUser = await prisma.user.findUnique({
          where: { id: division.headId },
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
            profileImage: true
          }
        });
        
        return {
          divisionId: division.id,
          divisionName: division.name,
          head: headUser
        };
      })
    );
    
    // Filter out any null entries (divisions without heads)
    const divisionHeads = divisionHeadsData.filter(div => div !== null && div.head !== null);
    
    return res.status(200).json({
      success: true,
      data: divisionHeads,
      message: 'Division heads retrieved successfully'
    });
  } catch (error) {
    console.error('Error getting division heads:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get division heads'
    });
  }
});

// Group management endpoints for division heads

// Create a group as division head
router.post('/groups/create', async (req, res) => {
  try {
    const { name, description, divisionHeadId } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Group name is required'
      });
    }

    if (!divisionHeadId) {
      return res.status(400).json({
        success: false,
        message: 'Division head ID is required'
      });
    }

    // Find the division where the user is head
    const division = await prisma.division.findFirst({
      where: { headId: divisionHeadId }
    });

    if (!division) {
      return res.status(403).json({
        success: false,
        message: 'User is not a division head'
      });
    }

    // Create the group in the division head's division
    const group = await prisma.group.create({
      data: {
        name,
        description,
        divisionId: division.id,
        createdById: divisionHeadId
      }
    });

    return res.status(201).json({
      success: true,
      data: group,
      message: 'Group created successfully'
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create group'
    });
  }
});

// Get all groups in a division head's division
router.get('/groups/:divisionHeadId', async (req, res) => {
  try {
    const { divisionHeadId } = req.params;

    if (!divisionHeadId) {
      return res.status(400).json({
        success: false,
        message: 'Division head ID is required'
      });
    }

    // Find the division where the user is head
    const division = await prisma.division.findFirst({
      where: { headId: divisionHeadId }
    });

    if (!division) {
      return res.status(403).json({
        success: false,
        message: 'User is not a division head'
      });
    }

    // Get all groups in the division
    const groups = await prisma.group.findMany({
      where: { divisionId: division.id }
    });

    return res.json({
      success: true,
      data: groups,
      message: 'Groups retrieved successfully'
    });
  } catch (error) {
    console.error('Get groups error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve groups'
    });
  }
});

// Delete a group as division head
router.delete('/groups/:groupId/:divisionHeadId', async (req, res) => {
  try {
    const { groupId, divisionHeadId } = req.params;

    if (!groupId || !divisionHeadId) {
      return res.status(400).json({
        success: false,
        message: 'Group ID and division head ID are required'
      });
    }

    // Find the division where the user is head
    const division = await prisma.division.findFirst({
      where: { headId: divisionHeadId }
    });

    if (!division) {
      return res.status(403).json({
        success: false,
        message: 'User is not a division head'
      });
    }

    // Find the group
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    // Check if the group belongs to the division head's division
    if (group.divisionId !== division.id) {
      return res.status(403).json({
        success: false,
        message: 'Division heads can only delete groups in their own division'
      });
    }

    // Delete the group
    await prisma.group.delete({
      where: { id: groupId }
    });

    return res.json({
      success: true,
      data: null,
      message: 'Group deleted successfully'
    });
  } catch (error) {
    console.error('Delete group error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete group'
    });
  }
});

export default router;
