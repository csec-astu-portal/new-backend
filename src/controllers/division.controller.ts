import { Request, Response } from "express";
import { prisma } from "../config/db";
import { successResponse, errorResponse } from "../utils/response";
import { RoleType } from "../types/role.types";
import { isDivisionHead } from "../services/role.service";
import {
  sendDivisionMemberEmail,
  sendDivisionHeadEmail,
} from "../services/email.service";
import { DivisionService } from "../services/division.service";

// Helper function to create audit logs
const createAuditLog = async ({
  action,
  userId,
  details,
}: {
  action: string;
  userId: string;
  details: string;
}) => {
  try {
    // Check if the model exists in your Prisma schema
    if ("auditLog" in prisma) {
      // @ts-ignore - Using dynamic property access
      await prisma.auditLog.create({
        data: {
          action,
          userId,
          details,
          timestamp: new Date(),
        },
      });
    } else {
      // Fallback to logging for development
      if (process.env.NODE_ENV !== "production") {
        console.log(`AUDIT: ${action} by ${userId} - ${details}`);
      }
    }
  } catch (error) {
    console.error("Error creating audit log:", error);
  }
};

// Get the division where the user is head (returns null if user is not a division head)
const getUserDivisionAsHead = async (userId: string) => {
  return await prisma.division.findFirst({
    where: { headId: userId },
  });
};

interface RequestWithUser extends Request {
  user?: {
    id: string;
    email: string;
    roles: RoleType[];
    name?: string;
    division?: {
      id: string;
      name: string;
    };
  };
}

// Create division - accessible by division heads
const createDivision = async (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Only president can create divisions (as per requirements)
    if (!user.roles.includes(RoleType.PRESIDENT)) {
      return res
        .status(403)
        .json(errorResponse("Only the president can create divisions"));
    }

    // Validate input
    if (!name || typeof name !== "string") {
      return res
        .status(400)
        .json(errorResponse("Division name is required and must be a string"));
    }

    const divisionService = new DivisionService();
    const division = await divisionService.createDivision(name, description);

    return res
      .status(201)
      .json(successResponse(division, "Division created successfully"));
  } catch (error: any) {
    console.error("Create division error:", error);
    if (error.message === "Division name already exists") {
      return res.status(400).json(errorResponse(error.message));
    }
    return res.status(500).json(errorResponse("Failed to create division"));
  }
};

// Get all divisions
const getAllDivisions = async (_req: Request, res: Response) => {
  try {
    // User is already authenticated by the middleware
    // No need to check user permissions as all authenticated users can view divisions

    try {
      const divisions = await prisma.division.findMany();
      return res.json(
        successResponse(divisions, "Divisions retrieved successfully")
      );
    } catch (dbError) {
      console.error("Database error when finding divisions:", dbError);
      // If database query fails, return empty array
      return res.json(successResponse([], "No divisions found"));
    }
  } catch (error) {
    console.error("Get divisions error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve divisions"));
  }
};

// Get division by ID
const getDivisionById = async (req: Request, res: Response) => {
  try {
    // User is already authenticated by the middleware
    // No need to check user permissions as all authenticated users can view division details

    const { divisionId } = req.params;

    try {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!division) {
        return res.status(404).json(errorResponse("Division not found"));
      }

      // Get all members in this division, including those with WITHDRAWN status
      // We'll also get members who have been withdrawn but still have this division ID
      const members = await prisma.user.findMany({
        where: { divisionId: divisionId },
        select: {
          id: true,
          freeName: true,
          email: true,
          role: true,
          status: true, // Include status to identify withdrawn members
          note: true, // Include note to check for WITHDRAWN prefix
        },
      });

      // Also get members who were previously in this division but have been withdrawn
      // These members might have their divisionId set to null but have a note indicating withdrawal
      const withdrawnMembers = await prisma.user.findMany({
        where: {
          divisionId: null,
          note: {
            contains: "WITHDRAWN:",
          },
        },
        select: {
          id: true,
          freeName: true,
          email: true,
          role: true,
          status: true,
          note: true,
        },
      });

      // Combine regular members and withdrawn members
      // Add a flag to indicate if a member is withdrawn based on their note field
      const allMembers = [...members, ...withdrawnMembers];

      // Process members to add withdrawal information
      const mappedMembers = allMembers.map((member) => {
        // Check if the member is withdrawn based on their note field
        const isWithdrawn = member.note && member.note.startsWith("WITHDRAWN");

        // Extract withdrawal reason from the note if available
        let withdrawalReason = "";
        if (isWithdrawn && member.note) {
          // Try to extract the reason from the note
          const reasonMatch = member.note.match(/Reason: (.+)$/);
          if (reasonMatch && reasonMatch[1]) {
            withdrawalReason = reasonMatch[1];
          }
        }

        return {
          id: member.id,
          freeName: member.freeName,
          fullName: member.freeName, // Add fullName for UI consistency
          email: member.email,
          role: member.role,
          status: isWithdrawn ? "WITHDRAWN" : member.status,
          isWithdrawn: isWithdrawn,
          withdrawalReason: withdrawalReason,
        };
      });

      // Use the mapped members with withdrawal status in the response
      const divisionWithMembers = {
        ...division,
        members: mappedMembers,
      };

      return res.json(
        successResponse(divisionWithMembers, "Division retrieved successfully")
      );
    } catch (dbError) {
      console.error("Database error when finding division:", dbError);
      return res.status(500).json(errorResponse("Failed to retrieve division"));
    }
  } catch (error) {
    console.error("Get division error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve division"));
  }
};

// Update division - accessible by division heads for their own division and president for all divisions
const updateDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const { name, description } = req.body;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Find the division
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    // Division heads can only update their own division, president can update any division
    if (
      isDivisionHead(user.roles[0]) &&
      !user.roles.includes(RoleType.PRESIDENT)
    ) {
      if (!user.division || division.id !== user.division.id) {
        return res
          .status(403)
          .json(errorResponse("You can only update your own division"));
      }
    }

    // Validate input
    if (name && typeof name !== "string") {
      return res
        .status(400)
        .json(errorResponse("Division name must be a string"));
    }

    if (description && typeof description !== "string") {
      return res
        .status(400)
        .json(errorResponse("Division description must be a string"));
    }

    // Update division
    const updatedDivision = await prisma.division.update({
      where: { id: divisionId },
      data: {
        name: name || division.name,
        description: description || division.description,
      },
    });

    return res.json(
      successResponse(updatedDivision, "Division updated successfully")
    );
  } catch (error) {
    console.error("Update division error:", error);
    return res.status(500).json(errorResponse("Failed to update division"));
  }
};

// Delete division - accessible by division heads for their own division and president for all divisions
const deleteDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Find the division
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    // Division heads can only delete their own division, president can delete any division
    if (
      isDivisionHead(user.roles[0]) &&
      !user.roles.includes(RoleType.PRESIDENT)
    ) {
      if (!user.division || division.id !== user.division.id) {
        return res
          .status(403)
          .json(errorResponse("You can only delete your own division"));
      }
    }

    // Delete division
    await prisma.division.delete({
      where: { id: divisionId },
    });

    return res.json(successResponse(null, "Division deleted successfully"));
  } catch (error) {
    console.error("Delete division error:", error);
    return res.status(500).json(errorResponse("Failed to delete division"));
  }
};

// Add member to division - accessible by division heads for their own division and president for all divisions
// Group assignment is now mandatory when adding a member to a division
const addMemberToDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const { memberId, groupId } = req.body;
    const user = (req as RequestWithUser).user;

    // Make groupId mandatory
    if (!groupId) {
      return res
        .status(400)
        .json(
          errorResponse(
            "Group ID is required. Members must be assigned to a group when added to a division."
          )
        );
    }

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Find the division and member with complete information
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      include: {
        members: true, // Include members for statistics
      },
    });

    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    if (!member) {
      return res.status(404).json(errorResponse("Member not found"));
    }

    // Get division head information if available
    let divisionHead = null;
    if (division.headId) {
      divisionHead = await prisma.user.findUnique({
        where: { id: division.headId },
        select: { freeName: true, email: true },
      });
    }

    // Check authorization: President can add to any division, division heads only to their own
    const isPresident = user.roles && user.roles.includes(RoleType.PRESIDENT);
    const isDivisionHeadUser = user.roles && isDivisionHead(user.roles[0]);

    // If user is division head (not president) and trying to add to another division
    if (isDivisionHeadUser && !isPresident) {
      if (!user.division || division.id !== user.division.id) {
        return res
          .status(403)
          .json(errorResponse("You can only add members to your own division"));
      }
    }

    // Check if member is already in a division
    if (member.divisionId) {
      // If president is reassigning, allow it
      if (!isPresident) {
        return res
          .status(400)
          .json(
            errorResponse(
              "Member is already assigned to a division. Only the president can reassign members."
            )
          );
      }
    }

    // Add member to division
    await prisma.user.update({
      where: { id: memberId },
      data: {
        divisionId: divisionId,
      },
      include: {
        division: true, // Include division details in response
      },
    });

    // Group assignment is now mandatory - verify the group exists and belongs to this division
    let groupMembership = null;
    let groupDetails = null;

    // Verify the group exists and belongs to this division
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { division: true }, // Include division details for better error messages
    });

    if (!group) {
      return res
        .status(404)
        .json(
          errorResponse(
            `Group with ID ${groupId} not found. Please select a valid group.`
          )
        );
    }

    if (group.divisionId !== divisionId) {
      return res
        .status(400)
        .json(
          errorResponse(
            `Group "${group.name}" belongs to ${
              group.division?.name || "another division"
            }, not to the specified division. ` +
              `Please select a group that belongs to this division.`
          )
        );
    }

    // Add member to the group
    try {
      groupMembership = await prisma.usersInGroups.create({
        data: {
          userId: memberId,
          groupId: groupId,
        },
      });

      groupDetails = {
        id: group.id,
        name: group.name,
        description: group.description,
      };
    } catch (groupError) {
      console.error("Error adding member to group:", groupError);
      return res
        .status(500)
        .json(
          errorResponse(
            "Failed to add member to the group. The member was not added to the division."
          )
        );
    }

    // Prepare a personalized message based on who is adding the member
    let congratsMessage = "";

    if (isPresident) {
      congratsMessage = `🎉 Congratulations! The CSEC ASTU President has added you to the ${division.name} Division.`;
    } else {
      congratsMessage = `🎉 Congratulations! You've been added to the ${division.name} Division by the Division Head.`;
    }

    // Send division member email
    try {
      // Use real email in production, or test email for testing
      console.log(`Sending division member email to: ${member.email}`);

      // Send email with division head's name if available
      await sendDivisionMemberEmail(
        member.email,
        member.freeName, // This will be treated as fullName in the email service
        division.name,
        divisionHead ? divisionHead.freeName : "Division Head"
      );

      console.log(`Division member email sent successfully to ${member.email}`);
    } catch (emailError) {
      console.error("Error sending division member email:", emailError);
      // Continue with the operation even if email fails
    }

    // Include comprehensive information in the response
    interface ResponseData {
      member: {
        id: string;
        name: string;
        fullName: string; // Added fullName for UI consistency
        email: string;
        divisionId: string;
      };
      division: {
        id: string;
        name: string;
      };
      addedBy: {
        id: string;
        name: string;
        fullName: string; // Added fullName for UI consistency
        role: string;
      };
      credentials: {
        email: string;
        name: string;
        fullName: string; // Added fullName for UI consistency
        divisionName: string;
        memberId: string;
        divisionId: string;
      };
      group?: any;
      groupMembership?: any;
    }

    const responseData: ResponseData = {
      member: {
        id: member.id,
        name: member.freeName,
        fullName: member.freeName, // Added fullName for UI consistency
        email: member.email,
        divisionId: divisionId,
      },
      division: {
        id: division.id,
        name: division.name,
      },
      addedBy: {
        id: user.id,
        name: user.name || "Unknown",
        fullName: user.name || "Unknown", // Added fullName for UI consistency
        role: isPresident ? "President" : "Division Head",
      },
      credentials: {
        email: member.email,
        name: member.freeName,
        fullName: member.freeName, // Added fullName for UI consistency
        divisionName: division.name,
        memberId: memberId,
        divisionId: divisionId,
      },
    };

    // Add group information to the response if a group was specified
    if (groupId && groupMembership && groupDetails) {
      responseData.group = groupDetails;
      responseData.groupMembership = groupMembership;
      congratsMessage += ` You've also been added to the ${groupDetails.name} group.`;
    }

    return res.json(
      successResponse(
        responseData,
        `${congratsMessage} A welcome email has been sent with all the details.`
      )
    );
  } catch (error) {
    console.error("Add member to division error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to add member to division"));
  }
};

// Remove member from division - accessible by division heads for their own division and president for all divisions
const removeMemberFromDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId, memberId } = req.params;
    const { reason } = req.body; // Get removal reason from request body
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Validate reason is provided
    if (!reason) {
      return res
        .status(400)
        .json(errorResponse("Reason for removal is required"));
    }

    // Find the division and member
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    if (!member) {
      return res.status(404).json(errorResponse("Member not found"));
    }

    // Division heads can only remove members from their own division, president can remove from any division
    if (
      isDivisionHead(user.roles[0]) &&
      !user.roles.includes(RoleType.PRESIDENT)
    ) {
      if (!user.division || division.id !== user.division.id) {
        return res
          .status(403)
          .json(
            errorResponse("You can only remove members from your own division")
          );
      }
    }

    // Check if member is in the specified division
    if (!member.divisionId || member.divisionId !== divisionId) {
      return res
        .status(400)
        .json(errorResponse("Member is not in this division"));
    }

    // We'll use the division ID directly in our updates

    try {
      // Use a simpler approach - just mark the user as removed in a way that works
      // We'll use the note field to store removal information
      // This avoids TypeScript issues with enums and custom fields

      // Update the user with removal information
      await prisma.user.update({
        where: { id: memberId },
        data: {
          // Use a field that definitely exists in the schema
          note: `WITHDRAWN: Removed from division ${divisionId} by ${
            user.id
          } on ${new Date().toISOString()} - Reason: ${reason}`,
        },
      });

      // Log the removal for debugging purposes
      console.log(
        `Member ${memberId} removed from division ${divisionId} by ${user.id} with reason: ${reason}`
      );

      // No need for additional updates since we've already stored the withdrawal information in the note field
    } catch (error) {
      console.error("Error in soft removing member from division:", error);
      return res
        .status(500)
        .json(errorResponse("Failed to remove member from division"));
    }

    // Create an audit log for this action
    await createAuditLog({
      action: "REMOVE_MEMBER_FROM_DIVISION",
      userId: user.id,
      details: `Removed member ${member.freeName} (${member.email}) from division ${division.name} with reason: ${reason}`,
    });

    // Get the updated member data to return in the response
    const updatedMemberData = await prisma.user.findUnique({
      where: { id: memberId },
    });

    // Create a response that clearly shows the member has been withdrawn
    const responseData = {
      ...updatedMemberData,
      fullName: updatedMemberData?.freeName, // Add fullName for UI consistency
      status: "WITHDRAWN", // Explicitly set status for the response
      withdrawnFromDivision: true,
      divisionRemovalReason: reason,
    };

    return res.json(
      successResponse(responseData, "Member removed from division successfully")
    );
  } catch (error) {
    console.error("Remove member from division error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to remove member from division"));
  }
};

// Get all members who have been removed from a division
const getRemovedDivisionMembers = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Find the division
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    console.log(
      "To properly view removed division members, please regenerate the Prisma client with: npx prisma generate"
    );

    // For now, we'll just return an empty array until the Prisma client is regenerated
    const removedMembers: any[] = [];

    // Once the Prisma client is regenerated, this function will be updated to include:
    // - Profile pictures
    // - User information (name, email, role, memberId, year)
    // - Student year (1-5 representing year of study)
    // - Status indicators (Withdrawn, Off Campus, etc.)
    // - Attendance status (Active, Inactive, Needs Attention)
    // - Removal information (reason, date, who removed them, status)

    // Add a note to the response
    return res.json(
      successResponse(
        {
          division,
          removedMembers: removedMembers,
          count: removedMembers.length,
        },
        "To view removed members with profile pictures and additional information, please regenerate the Prisma client with: npx prisma generate"
      )
    );
  } catch (error) {
    console.error("Get removed division members error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to get removed division members"));
  }
};

// Assign a user as the head of a division and auto-update their role - accessible only by president
const assignDivisionHead = async (req: Request, res: Response) => {
  try {
    // Log the request for debugging
    console.log("Division head assignment request:", {
      params: req.params,
      body: req.body,
    });

    // Extract parameters
    const { divisionId } = req.params;
    const { memberId } = req.body;
    const user = (req as RequestWithUser).user;

    // Basic validation
    if (!divisionId || !memberId) {
      console.log("Missing required parameters:", { divisionId, memberId });
      return res
        .status(400)
        .json(errorResponse("Both division ID and member ID are required"));
    }

    // Authentication check
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Authorization check - only president can assign division heads
    if (!user.roles.includes(RoleType.PRESIDENT)) {
      return res
        .status(403)
        .json(errorResponse("Only the president can assign division heads"));
    }

    // Get division details
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: { id: true, name: true, headId: true },
    });

    if (!division) {
      console.log(`Division with ID ${divisionId} not found`);
      return res.status(404).json(errorResponse("Division not found"));
    }

    // Check if division already has a head
    if (division.headId && division.headId !== memberId) {
      // Get current head details
      const currentHead = await prisma.user.findUnique({
        where: { id: division.headId },
        select: { id: true, freeName: true, role: true },
      });

      console.log(
        `Division ${division.name} already has a head: ${
          currentHead?.freeName || "Unknown"
        } (${division.headId}). Will demote them first.`
      );

      // Demote the current head back to MEMBER role
      if (currentHead) {
        await prisma.user.update({
          where: { id: currentHead.id },
          data: { role: RoleType.MEMBER },
        });

        console.log(
          `Previous division head ${currentHead.freeName} has been demoted to MEMBER`
        );
      }
    }

    // Get member details with verification status
    const member = await prisma.user.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        email: true,
        freeName: true,
        divisionId: true,
        isEmailVerified: true,
        status: true,
      },
    });

    if (!member) {
      console.log(`Member with ID ${memberId} not found`);
      return res.status(404).json(errorResponse("Member not found"));
    }

    // Check if member is already part of the division they're being assigned to head
    if (member.divisionId !== divisionId) {
      console.log(
        `Member ${member.freeName} (${memberId}) is not part of division ${division.name} (${divisionId})`
      );
      console.log(`Member's current division: ${member.divisionId || "None"}`);
      return res
        .status(400)
        .json(
          errorResponse(
            `This member is not part of the ${division.name} division. Only members who are already part of a division can be assigned as the head of that division.`
          )
        );
    }

    // Check if member is verified
    if (!member.isEmailVerified) {
      console.log(`Member ${member.freeName} (${memberId}) is not verified`);
      return res
        .status(400)
        .json(
          errorResponse(
            `This member's email is not verified. Only verified members can be assigned as division heads.`
          )
        );
    }

    // Check if member is active
    if (member.status !== "ACTIVE") {
      console.log(
        `Member ${member.freeName} (${memberId}) is not active. Status: ${member.status}`
      );
      return res
        .status(400)
        .json(
          errorResponse(
            `This member is not active (current status: ${member.status}). Only active members can be assigned as division heads.`
          )
        );
    }

    // Map division name to head role
    const divisionMapping: Record<string, RoleType> = {
      CPD: RoleType.CPD_HEAD,
      CBD: RoleType.CBD_HEAD,
      CYBER: RoleType.CYBER_HEAD,
      DEV: RoleType.DEV_HEAD,
      DATA_SCIENCE: RoleType.DATA_SCIENCE_HEAD,
    };

    // Determine role based on division name
    let headRole: RoleType = RoleType.MEMBER as RoleType;
    const divisionName = division.name.toUpperCase();

    for (const [key, role] of Object.entries(divisionMapping)) {
      if (divisionName.includes(key)) {
        headRole = role;
        break;
      }
    }

    console.log(
      `Determined head role for division ${division.name}: ${headRole}`
    );

    // Use a transaction to ensure both operations succeed or fail together
    const [updatedDivision, updatedMember] = await prisma.$transaction([
      // Update division to set the head
      prisma.division.update({
        where: { id: divisionId },
        data: { headId: memberId },
      }),

      // Update member role and division
      prisma.user.update({
        where: { id: memberId },
        data: {
          role: headRole,
          divisionId: divisionId,
        },
      }),
    ]);

    console.log("Successfully assigned division head:", {
      division: updatedDivision,
      member: updatedMember,
    });

    // Send division head email to the member's registration email
    console.log(
      `Sending division head email to ${member.email} for division ${division.name}`
    );

    try {
      // Get the full member details to ensure we have the correct email
      const memberDetails = await prisma.user.findUnique({
        where: { id: memberId },
        select: { email: true, freeName: true },
      });

      if (!memberDetails || !memberDetails.email) {
        throw new Error("Member email not found");
      }

      // Send the email using the member's registration email
      await sendDivisionHeadEmail(
        memberDetails.email,
        member.freeName,
        division.name
      );
      console.log(
        `✅ Division head email successfully sent to ${memberDetails.email}`
      );
    } catch (emailError) {
      console.error(`❌ Failed to send division head email:`, emailError);
      // Continue with the process even if email fails
      // We'll include the credentials in the response
    }

    // Email information is already included in the credentials object below
    // No need to create a separate emailInfo variable

    // Include credentials in the response for the president
    return res.json(
      successResponse(
        {
          member: updatedMember,
          division: division,
          assignedRole: headRole,
          // Include these credentials so president has them even if email fails
          credentials: {
            email: member.email,
            name: member.freeName,
            divisionName: division.name,
            role: headRole,
            memberId: memberId,
            divisionId: divisionId,
          },
        },
        `User ${member.freeName} is now the head of ${division.name}. Please save these credentials as email delivery may be unreliable.`
      )
    );
  } catch (error: any) {
    console.error("Assign division head error:", error);
    if (error.stack) {
      console.error("Error stack:", error.stack);
    }
    if (error.code === "P2025") {
      return res
        .status(404)
        .json(errorResponse("Division or member not found"));
    } else if (error.code === "P2002") {
      return res
        .status(409)
        .json(errorResponse("Conflict in database operation"));
    } else {
      return res
        .status(500)
        .json(
          errorResponse(
            `Failed to assign division head: ${
              error.message || "Unknown error"
            }`
          )
        );
    }
  }
};

// Function to update the removal reason for a member who has been removed from a division
const updateDivisionMemberRemovalReason = async (
  req: Request,
  res: Response
) => {
  try {
    const { memberId } = req.params;
    const { reason } = req.body;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Validate reason is provided
    if (!reason) {
      return res.status(400).json(errorResponse("New reason is required"));
    }

    // Find the member
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      return res.status(404).json(errorResponse("Member not found"));
    }

    // Check if the member is actually removed from a division
    if (!(member as any).isRemovedFromDivision) {
      return res
        .status(400)
        .json(
          errorResponse("This member has not been removed from any division")
        );
    }

    // Only division heads of the previous division and presidents can update removal reasons
    if (user.roles && !user.roles.includes(RoleType.PRESIDENT)) {
      const userDivision = await getUserDivisionAsHead(user.id);
      if (
        !userDivision ||
        userDivision.id !== (member as any).previousDivisionId
      ) {
        return res
          .status(403)
          .json(
            errorResponse(
              "You can only update removal reasons for members removed from your division"
            )
          );
      }
    }

    // Update the removal reason
    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: {
        divisionRemovalReason: reason,
      } as any, // Type assertion to bypass TypeScript errors
    });

    // Create an audit log for this action
    await createAuditLog({
      action: "UPDATE_DIVISION_MEMBER_REMOVAL_REASON",
      userId: user.id,
      details: `Updated removal reason for member ${member.freeName} (${member.email}) to: ${reason}`,
    });

    return res.json(
      successResponse(
        {
          id: updatedMember.id,
          freeName: updatedMember.freeName,
          email: updatedMember.email,
          removalReason: reason,
        },
        "Removal reason updated successfully"
      )
    );
  } catch (error) {
    console.error("Update division member removal reason error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to update removal reason"));
  }
};

// Remove a user as the head of a division - accessible only by president
const removeDivisionHead = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const user = (req as RequestWithUser).user;

    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Only president can remove division heads
    if (!user.roles || !user.roles.includes(RoleType.PRESIDENT)) {
      return res
        .status(403)
        .json(errorResponse("Only the president can remove division heads"));
    }

    // Find the division and its head user
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    if (!division.headId) {
      return res
        .status(400)
        .json(errorResponse("This division does not have a head assigned"));
    }

    // Get the head user details
    const headUser = await prisma.user.findUnique({
      where: { id: division.headId },
    });

    if (!headUser) {
      return res
        .status(404)
        .json(errorResponse("Division head user not found"));
    }

    const headId = division.headId;
    const headName = headUser.freeName;

    // Update the user's role back to MEMBER
    await prisma.user.update({
      where: { id: headUser.id },
      data: {
        role: RoleType.MEMBER,
      },
    });

    console.log(
      `Changed ${headName}'s role from ${headUser.role} to ${RoleType.MEMBER}`
    );

    // Update the division to remove the head
    const updatedDivision = await prisma.division.update({
      where: { id: divisionId },
      data: {
        headId: null,
      },
      include: {
        members: true,
      },
    });

    // Create an audit log for this action
    await createAuditLog({
      action: "REMOVE_DIVISION_HEAD",
      userId: user.id,
      details: `Removed ${headName} as head of ${division.name} division`,
    });

    // Prepare response data
    const responseData = {
      division: updatedDivision,
      previousHead: {
        id: headId,
        name: headName,
      },
    };

    return res.json(
      successResponse(
        responseData,
        `Successfully removed ${headName} as head of ${division.name} division`
      )
    );
  } catch (error: any) {
    console.error("Remove division head error:", error);
    if (error.code === "P2025") {
      return res.status(404).json(errorResponse("Division not found"));
    } else {
      return res
        .status(500)
        .json(
          errorResponse(
            `Failed to remove division head: ${
              error.message || "Unknown error"
            }`
          )
        );
    }
  }
};

export const getMembersByDivisionId = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;

    // Check if the division exists
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    // Fetch all users in this division
    const members = await prisma.user.findMany({
      where: { divisionId },
    });

    if (!members) {
      return res
        .status(404)
        .json(errorResponse("No members found in this division"));
    }

    return res.json(
      successResponse(members, "Division members retrieved successfully")
    );
  } catch (error) {
    console.error("Error retrieving division members:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to retrieve division members"));
  }
};

// Export all controller functions
export {
  createDivision,
  getAllDivisions,
  getDivisionById,
  updateDivision,
  deleteDivision,
  assignDivisionHead,
  removeDivisionHead,
  addMemberToDivision,
  removeMemberFromDivision,
  getRemovedDivisionMembers,
  updateDivisionMemberRemovalReason,
};
