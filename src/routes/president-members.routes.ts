import express from "express";
import { PrismaClient, RoleType } from "@prisma/client";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();



// Verify if the user is the president
const verifyPresident = async (presidentId: string) => {
  try {
    const president = await prisma.user.findUnique({
      where: { id: presidentId }
    });
    
    return president && president.role === RoleType.PRESIDENT;
  } catch (error) {
    // Error verifying president role
    return false;
  }
};

// Remove a member completely from the club (for president only)
router.post('/remove', async (req, res) => {
  try {

    
    const { memberId, presidentId } = req.body;
    
    // Validate required fields
    if (!memberId || !presidentId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and President ID are required'
      });
    }
    
    // Verify that the user is the president
    const isPresident = await verifyPresident(presidentId);
    if (!isPresident) {
      return res.status(403).json({
        success: false,
        message: 'Only the president can remove members from the club'
      });
    }
    
    // Find the member to be removed
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Don't allow removing the president
    if (member.role === RoleType.PRESIDENT) {
      return res.status(403).json({
        success: false,
        message: 'Cannot remove the president from the club'
      });
    }
    
    // Check if the member is still in a division
    if (member.divisionId) {
      return res.status(400).json({
        success: false,
        message: 'Member must be removed from their division by the division head before they can be removed from the club'
      });
    }
    
    // Delete the member from the database
    await prisma.user.delete({
      where: { id: memberId }
    });
    
    // Log the successful deletion
    console.log(`✅ President successfully removed member ${memberId} from the club`);
    
    return res.status(200).json({
      success: true,
      message: `${member.freeName || 'Member'} has been completely removed from the club`
    });
  } catch (error) {
    console.error('Error removing member from club:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove member from club'
    });
  }
});

// Deactivate a member (for president only)
router.post('/deactivate', async (req, res) => {
  try {
    console.log('President deactivate member endpoint called');
    console.log('Request body:', req.body);
    
    const { memberId, presidentId } = req.body;
    
    // Validate required fields
    if (!memberId || !presidentId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID and President ID are required'
      });
    }
    
    // Verify that the user is the president
    const isPresident = await verifyPresident(presidentId);
    if (!isPresident) {
      return res.status(403).json({
        success: false,
        message: 'Only the president can deactivate members'
      });
    }
    
    // Find the member to be deactivated
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }
    
    // Don't allow deactivating the president
    if (member.role === RoleType.PRESIDENT) {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate the president'
      });
    }
    
    // Update the member's status to INACTIVE
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        status: "INACTIVE",
        divisionId: null // Also remove from any division
      }
    });
    
    // Log the successful update
    console.log(`✅ President successfully deactivated member ${memberId}`);
    
    return res.status(200).json({
      success: true,
      data: {
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          freeName: updatedMember.freeName,
          status: updatedMember.status
        }
      },
      message: `${member.freeName || 'Member'} has been deactivated`
    });
  } catch (error) {
    console.error('Error deactivating member:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to deactivate member'
    });
  }
});

// Get all members in the club (for president only)
router.get('/all', async (req, res) => {
  try {
    const { presidentId } = req.query;
    
    if (!presidentId) {
      return res.status(400).json({
        success: false,
        message: 'President ID is required'
      });
    }
    
    // Verify that the user is the president
    const isPresident = await verifyPresident(presidentId as string);
    if (!isPresident) {
      return res.status(403).json({
        success: false,
        message: 'Only the president can view all members'
      });
    }
    
    // Get all members
    const members = await prisma.user.findMany({
      select: {
        id: true,
        freeName: true,
        email: true,
        role: true,
        status: true,
        divisionId: true,
        profileImage: true,
        githubProfile: true,
        skills: true,
        division: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        members: members,
        count: members.length
      },
      message: `Retrieved ${members.length} members`
    });
  } catch (error) {
    console.error('Error getting all members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get all members'
    });
  }
});

export default router;
