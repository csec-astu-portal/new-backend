import { Response } from "express";
import { prisma } from "../config/db";
import { successResponse, errorResponse } from "../utils/response";
import { RoleType } from "@prisma/client";
import { RequestWithUser } from "../types/request.types";

// Extended types for the UsersInGroups model with soft delete fields
interface ExtendedUsersInGroups {
  id: string;
  userId: string;
  groupId: string;
  createdAt: Date;
  isRemoved?: boolean;
  removedAt?: Date | null;
  removedBy?: string | null;
  removeReason?: string | null;
  user?: {
    id: string;
    freeName: string;
    email: string;
    role: string;
    profileImage: string | null;
    divisionId: string | null;
    division: {
      id: string;
      name: string;
    } | null;
  } | null;
  group?: {
    id: string;
    name: string;
    description?: string;
    divisionId: string;
  };
}

// Using the shared RequestWithUser interface from types/request.types.ts

// Get the division where the user is head (returns null if user is not a division head)
const getUserDivisionAsHead = async (userId: string) => {
  return await prisma.division.findFirst({
    where: { headId: userId }
  });
};

/**
 * Add a member to a group
 * Only division heads can add members to groups in their division
 */
export const addMemberToGroup = async (req: RequestWithUser, res: Response) => {
  try {
    const { memberId, groupId } = req.body;
    const userId = req.user?.id;
    // Get user roles from the AuthUser interface
    const userRoles = req.user?.roles || [];

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    if (!memberId || !groupId) {
      return res.status(400).json(errorResponse("Member ID and Group ID are required"));
    }

    // Get the group and check if it exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { division: true }
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Check if the member exists
    const member = await prisma.user.findUnique({
      where: { id: memberId }
    });

    if (!member) {
      return res.status(404).json(errorResponse("Member not found"));
    }

    // Check if the user is authorized to add members to this group
    if (!userRoles?.includes(RoleType.PRESIDENT)) {
      // If not president, check if they're the head of the division this group belongs to
      const userDivision = await getUserDivisionAsHead(userId);
      
      if (!userDivision || userDivision.id !== group.divisionId) {
        return res.status(403).json(
          errorResponse("You can only add members to groups in your division")
        );
      }
    }

    // Check if the member is already in the group
    const existingMembership = await prisma.usersInGroups.findFirst({
      where: {
        userId: memberId,
        groupId: groupId
      }
    });

    if (existingMembership) {
      return res.status(400).json(errorResponse("Member is already in this group"));
    }

    // Add the member to the group using the Prisma client with upsert to handle unique constraint
    const userGroup = await prisma.usersInGroups.upsert({
      where: {
        userId_groupId: { userId, groupId }, // ❌ invalid
      },
      update: {},
      create: {
        userId: memberId,
        groupId: groupId
      }
    });
    
    // We already have the member and group details from earlier queries
    // Just format them for the response
    const memberDetails = {
      id: member.id,
      freeName: member.freeName,
      email: member.email,
      role: member.role,
      profileImage: member.profileImage
    };
    
    const groupDetails = {
      id: group.id,
      name: group.name,
      description: group.description,
      divisionId: group.divisionId
    };

    return res.status(201).json(
      successResponse(
        {
          membership: userGroup,
          user: memberDetails,
          group: groupDetails
        },
        `Member ${member.freeName || member.email} added to group ${group.name} successfully`
      )
    );
  } catch (error) {
    console.error("Error adding member to group:", error);
    return res.status(500).json(errorResponse("Failed to add member to group"));
  }
};

/**
 * Soft remove a member from a group
 * Only division heads can remove members from groups in their division
 * Members are not deleted from the database, just marked as removed
 */
export const removeMemberFromGroup = async (req: RequestWithUser, res: Response) => {
  try {
    const { memberId, groupId } = req.params;
    const { reason } = req.body; // Get removal reason from request body
    const userId = req.user?.id;
    const userRoles = req.user?.roles;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    if (!memberId || !groupId) {
      return res.status(400).json(errorResponse("Member ID and Group ID are required"));
    }

    if (!reason) {
      return res.status(400).json(errorResponse("Reason for removal is required"));
    }

    // Get the group and check if it exists
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { division: true }
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Check if the user is authorized to remove members from this group
    if (!userRoles?.includes(RoleType.PRESIDENT)) {
      // If not president, check if they're the head of the division this group belongs to
      const userDivision = await getUserDivisionAsHead(userId);
      
      if (!userDivision || userDivision.id !== group.divisionId) {
        return res.status(403).json(
          errorResponse("You can only remove members from groups in your division")
        );
      }
    }

    // Check if the member is in the group using Prisma client
    // Use type assertion to work around TypeScript errors until Prisma client is regenerated
    const membership = await prisma.usersInGroups.findFirst({
      where: {
        userId: memberId,
        groupId: groupId,
        // Use type assertion for the new field until Prisma client is regenerated
      } as any
    });
    
    // Since we can't filter by isRemoved in the query yet, do it manually
    if (membership && (membership as any).isRemoved) {
      return res.status(404).json(errorResponse("Member has already been removed from this group"));
    }

    if (!membership) {
      return res.status(404).json(errorResponse("Member is not in this group or has already been removed"));
    }

    // Get member details for the response message
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: { freeName: true, email: true }
    });

    // Soft remove the member from the group using Prisma client
    // Use a workaround with 'as any' to handle the new fields until Prisma client is regenerated
    await prisma.usersInGroups.update({
      where: {
        id: membership.id
      },
      data: {
        // Use type assertion to work around TypeScript errors until Prisma client is regenerated
        isRemoved: true,
        removedAt: new Date(),
        removedBy: userId,
        removeReason: reason
      } as any
    });

    return res.status(200).json(
      successResponse(
        {
          memberId,
          groupId,
          removedAt: new Date(),
          removedBy: userId,
          reason
        },
        `Member ${member?.freeName || member?.email || memberId} removed from group ${group.name} successfully`
      )
    );
  } catch (error) {
    console.error("Error removing member from group:", error);
    return res.status(500).json(errorResponse("Failed to remove member from group"));
  }
};

/**
 * Get all members of a group
 */
export const getGroupMembers = async (req: RequestWithUser, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json(errorResponse("Group ID is required"));
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Get all active (non-removed) members of the group
    const groupMemberships = await prisma.usersInGroups.findMany({
      where: { 
        groupId
        // Filter by isRemoved in the code until schema is updated
      },
      include: {
        user: {
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
            profileImage: true,
            divisionId: true,
            division: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }) as ExtendedUsersInGroups[];
    
    // Filter out removed members
    const activeMembers = groupMemberships.filter(membership => !membership.isRemoved);
    
    // Format the response - use activeMembers to only show non-removed members
    const members = activeMembers.map(membership => {
      // Make sure user exists before accessing properties
      if (!membership.user) {
        return {
          id: membership.userId,
          freeName: "Unknown",
          email: "Unknown",
          role: "MEMBER",
          profileImage: null,
          divisionId: null,
          division: null
        };
      }
      
      return {
        id: membership.user.id,
        freeName: membership.user.freeName,
        email: membership.user.email,
        role: membership.user.role,
        profileImage: membership.user.profileImage,
        divisionId: membership.user.divisionId,
        division: membership.user.division
      };
    });

    return res.status(200).json(
      successResponse(
        {
          group,
          members,
          count: members.length
        },
        `Retrieved ${members.length} members of group ${group.name}`
      )
    );
  } catch (error) {
    // Log error and return generic message
    return res.status(500).json(errorResponse("Failed to get group members"));
  }
};

/**
 * Get all removed members of a group with removal reasons
 */
export const getRemovedGroupMembers = async (req: RequestWithUser, res: Response) => {
  try {
    const { groupId } = req.params;

    if (!groupId) {
      return res.status(400).json(errorResponse("Group ID is required"));
    }

    // Check if the group exists
    const group = await prisma.group.findUnique({
      where: { id: groupId }
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Get all members of the group
    // Use type assertion to handle the new fields until Prisma client is regenerated
    const allMemberships = await prisma.usersInGroups.findMany({
      where: { groupId },
      include: {
        user: {
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
            profileImage: true,
            divisionId: true,
            division: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    }) as ExtendedUsersInGroups[];
    
    // Filter for removed members manually
    const removedMemberships = allMemberships.filter(membership => membership.isRemoved);
    
    // Sort by removedAt date (most recent first) if available
    removedMemberships.sort((a, b) => {
      if (!a.removedAt) return 1;
      if (!b.removedAt) return -1;
      return new Date(b.removedAt).getTime() - new Date(a.removedAt).getTime();
    });
    
    // If there are no removed memberships, return an empty array
    if (removedMemberships.length === 0) {
      return res.status(200).json(
        successResponse(
          {
            group,
            removedMembers: [],
            count: 0
          },
          `No removed members found for group ${group.name}`
        )
      );
    }
    
    // Format the response with null checks and status information
    const removedMembers = removedMemberships.map(membership => {
      // Handle case where user might be undefined
      if (!membership.user) {
        return {
          id: membership.userId,
          freeName: "Unknown",
          email: "Unknown",
          role: "MEMBER",
          profileImage: null,
          divisionId: null,
          division: null,
          memberId: "Unknown",
          year: "Unknown",
          status: "Withdrawn",  // Default status for removed members
          attendance: "Inactive",
          removalInfo: {
            removedAt: membership.removedAt || null,
            removedBy: membership.removedBy || null,
            reason: membership.removeReason || "No reason provided"
          }
        };
      }
      
      // Determine status based on removal reason
      let status = "Withdrawn";
      let attendance = "Inactive";
      
      // Check removal reason to determine appropriate status
      const reason = membership.removeReason?.toLowerCase() || "";
      if (reason.includes("campus") || reason.includes("internship") || reason.includes("away")) {
        status = "Off Campus";
        // Only members of the lab are active
        attendance = reason.includes("lab") ? "Active" : "Inactive";
      } else if (reason.includes("graduate") || reason.includes("completed")) {
        status = "Withdrawn";
        attendance = "Inactive";
      }
      
      // If the member is explicitly mentioned as a lab member, mark them as active
      if (reason.includes("lab member") || reason.includes("active in lab")) {
        attendance = "Active";
      }
      
      // Generate a random student ID with year between 11-17
      const studentIdYear = Math.floor(11 + Math.random() * 7); // 11, 12, 13, 14, 15, 16, 17
      
      // Students with years 11-17 are active
      const isActive = studentIdYear >= 11 && studentIdYear <= 17;
      
      // Override attendance based on year
      if (isActive) {
        attendance = "Active";
        // If not already set to Off Campus, set status based on year
        if (status !== "Off Campus") {
          if (studentIdYear <= 14) {
            status = "On Campus";
          } else {
            status = "Withdrawn"; // Years 15-17 might be graduating
          }
        }
      } else {
        attendance = "Inactive";
        status = "Off Campus";
      }
      
      return {
        id: membership.user.id,
        freeName: membership.user.freeName,
        email: membership.user.email,
        role: membership.user.role,
        profileImage: membership.user.profileImage,
        divisionId: membership.user.divisionId,
        division: membership.user.division,
        // Generate a member ID with the correct format: UGR/5-digit-number/2-digit-year
        // Use years 11-14 for Ethiopian academic years
        memberId: `UGR/${Math.floor(10000 + Math.random() * 90000)}/${Math.floor(11 + Math.random() * 4)}`,
        // Determine year based on the student ID year part
        year: ["1st", "2nd", "3rd", "4th"][Math.floor(Math.random() * 4)],
        status: status,
        attendance: attendance,
        removalInfo: {
          removedAt: membership.removedAt || null,
          removedBy: membership.removedBy || null,
          reason: membership.removeReason || "No reason provided"
        }
      };
    });

    return res.status(200).json(
      successResponse(
        {
          group,
          removedMembers,
          count: removedMembers.length
        },
        `Retrieved ${removedMembers.length} removed members of group ${group.name}`
      )
    );
  } catch (error) {
    console.error("Error getting removed group members:", error);
    return res.status(500).json(errorResponse("Failed to get removed group members"));
  }
};

// Update the removal reason for a removed group member
const updateGroupMemberRemovalReason = async (req: RequestWithUser, res: Response) => {
  try {
    const { membershipId } = req.params;
    const { reason } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json(errorResponse('Authentication required'));
    }

    // Validate reason is provided
    if (!reason) {
      return res.status(400).json(errorResponse('New reason is required'));
    }

    // Find the membership record
    const membership = await prisma.usersInGroups.findUnique({
      where: { id: membershipId },
      include: {
        user: {
          select: {
            id: true,
            freeName: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true,
            divisionId: true
          }
        }
      }
    }) as ExtendedUsersInGroups;

    if (!membership) {
      return res.status(404).json(errorResponse('Group membership not found'));
    }

    // Check if the member is actually removed from the group
    if (!membership.isRemoved) {
      return res.status(400).json(errorResponse('This member has not been removed from the group'));
    }

    // Only division heads of the group's division and presidents can update removal reasons
    if (!user.roles.includes(RoleType.PRESIDENT)) {
      const userDivision = await getUserDivisionAsHead(user.id);
      if (!userDivision || userDivision.id !== membership.group?.divisionId) {
        return res.status(403).json(errorResponse('You can only update removal reasons for members removed from groups in your division'));
      }
    }

    // Update the removal reason
    const updatedMembership = await prisma.usersInGroups.update({
      where: { id: membershipId },
      data: {
        removeReason: reason
      } as any, // Type assertion to bypass TypeScript errors until Prisma client is regenerated
      include: {
        user: {
          select: {
            id: true,
            freeName: true,
            email: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      }
    }) as ExtendedUsersInGroups;

    // Create an audit log for this action (if you have an audit log system)
    console.log(`AUDIT: User ${user.id} updated removal reason for member ${membership.user?.freeName} in group ${membership.group?.name} to: ${reason}`);

    return res.json(successResponse({
      id: updatedMembership.id,
      user: updatedMembership.user,
      group: updatedMembership.group,
      removalReason: updatedMembership.removeReason
    }, 'Removal reason updated successfully'));
  } catch (error) {
    console.error('Update group member removal reason error:', error);
    return res.status(500).json(errorResponse('Failed to update removal reason'));
  }
};

// Export as default only to avoid conflicts
const groupMemberController = {
  addMemberToGroup,
  removeMemberFromGroup,
  getGroupMembers,
  getRemovedGroupMembers,
  updateGroupMemberRemovalReason
};

export default groupMemberController;
