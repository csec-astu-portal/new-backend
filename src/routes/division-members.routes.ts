import express from "express";
import { PrismaClient } from "@prisma/client";
import { sendDivisionMemberEmail } from "../services/email.service";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const router = express.Router();
const prisma = new PrismaClient();



// Add a member to a division (for division heads)
router.post('/add', async (req, res) => {
  try {

    
    const { memberId, divisionId, divisionHeadId } = req.body;
    
    // Validate required fields
    if (!memberId || !divisionId || !divisionHeadId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID, Division ID, and Division Head ID are required'
      });
    }
    
    // Find member, division, and division head
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    const division = await prisma.division.findUnique({
      where: { id: divisionId }
    });
    
    const divisionHead = await prisma.user.findUnique({
      where: { id: divisionHeadId }
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
    
    if (!divisionHead) {
      return res.status(404).json({
        success: false,
        message: 'Division head not found'
      });
    }
    
    // Verify that the division head is actually the head of this division
    if (division.headId !== divisionHeadId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to add members to this division'
      });
    }
    
    // Update the member's division
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        divisionId: divisionId
      }
    });
    
    // Try to send division member email
    try {
      await sendDivisionMemberEmail(
        member.email, 
        member.freeName || member.email.split('@')[0] || 'Member', 
        division.name || 'Division',
        divisionHead && divisionHead.freeName ? divisionHead.freeName : 'Division Head'
      );
      console.log('Division member email sent successfully');
    } catch (emailError) {
      console.error('Failed to send division member email:', emailError);
    }
    
    // Log the successful update
    console.log(`✅ Successfully added member ${updatedMember.id} to division ${division.id}`);
    
    return res.status(200).json({
      success: true,
      data: {
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          freeName: updatedMember.freeName,
          divisionId: updatedMember.divisionId
        },
        division: {
          id: division.id,
          name: division.name,
          description: division.description
        }
      },
      message: `${member.freeName || 'Member'} has been added to ${division.name || 'the division'}`
    });
  } catch (error) {
    console.error('Error adding member to division:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to add member to division'
    });
  }
});

// Remove a member from a division (for division heads)
router.post('/remove', async (req, res) => {
  try {

    
    const { memberId, divisionId, divisionHeadId } = req.body;
    
    // Validate required fields
    if (!memberId || !divisionId || !divisionHeadId) {
      return res.status(400).json({
        success: false,
        message: 'Member ID, Division ID, and Division Head ID are required'
      });
    }
    
    // Find member, division, and division head
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });
    
    const division = await prisma.division.findUnique({
      where: { id: divisionId }
    });
    
    const divisionHead = await prisma.user.findUnique({
      where: { id: divisionHeadId }
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
    
    if (!divisionHead) {
      return res.status(404).json({
        success: false,
        message: 'Division head not found'
      });
    }
    
    // Verify that the division head is actually the head of this division
    if (division.headId !== divisionHeadId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to remove members from this division'
      });
    }
    
    // Verify that the member is actually in this division
    if (member.divisionId !== divisionId) {
      return res.status(400).json({
        success: false,
        message: 'This member is not in your division'
      });
    }
    
    // Update the member's division to null (removing them from the division)
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        divisionId: null
      }
    });
    
    // Log the successful update
    console.log(`✅ Successfully removed member ${updatedMember.id} from division ${division.id}`);
    
    return res.status(200).json({
      success: true,
      data: {
        member: {
          id: updatedMember.id,
          email: updatedMember.email,
          freeName: updatedMember.freeName,
          divisionId: updatedMember.divisionId
        },
        division: {
          id: division.id,
          name: division.name
        }
      },
      message: `${member.freeName || 'Member'} has been removed from ${division.name || 'the division'}`
    });
  } catch (error) {
    console.error('Error removing member from division:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to remove member from division'
    });
  }
});

// Get all members in a division (for division heads)
router.get('/:divisionId', async (req, res) => {
  try {
    const { divisionId } = req.params;
    const { divisionHeadId } = req.query;
    
    if (!divisionId) {
      return res.status(400).json({
        success: false,
        message: 'Division ID is required'
      });
    }
    
    // Find division and division head
    const division = await prisma.division.findUnique({
      where: { id: divisionId }
    });
    
    if (!division) {
      return res.status(404).json({
        success: false,
        message: 'Division not found'
      });
    }
    
    // If division head ID is provided, verify that they are the head of this division
    if (divisionHeadId && division.headId !== divisionHeadId) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to view members of this division'
      });
    }
    
    // Get all members in the division
    const members = await prisma.user.findMany({
      where: { divisionId: divisionId },
      select: {
        id: true,
        freeName: true,
        email: true,
        role: true,
        profileImage: true,
        githubProfile: true,
        skills: true
      }
    });
    
    return res.status(200).json({
      success: true,
      data: {
        division: {
          id: division.id,
          name: division.name,
          description: division.description
        },
        members: members,
        count: members.length
      },
      message: `Retrieved ${members.length} members from ${division.name}`
    });
  } catch (error) {
    console.error('Error getting division members:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get division members'
    });
  }
});

export default router;
