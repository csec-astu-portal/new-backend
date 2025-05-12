import { Request, Response } from "express";
import { prisma } from "../config/db";
import { successResponse, errorResponse } from "../utils/response";
import { RoleType } from "@prisma/client";
import { RequestWithUser } from "../types/request.types";

// Check if user is a division head
const isDivisionHead = async (userId: string) => {
  const division = await prisma.division.findFirst({
    where: { headId: userId },
  });
  return !!division;
};

// Get the division where the user is head
const getUserDivisionAsHead = async (userId: string) => {
  return await prisma.division.findFirst({
    where: { headId: userId },
  });
};

/**
 * Create a new group within a division
 * - PRESIDENT can create groups in any division
 * - Division Heads can only create groups in their own division
 */
const createGroup = async (req: RequestWithUser, res: Response) => {
  try {
    const { name, description, divisionId } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    if (!name) {
      return res.status(400).json(errorResponse("Group name is required"));
    }

    if (!divisionId) {
      return res.status(400).json(errorResponse("Division ID is required"));
    }

    // Get the user from the database to ensure we have the correct role
    const userFromDb = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (!userFromDb) {
      return res.status(404).json(errorResponse("User not found"));
    }

    const dbRole = userFromDb.role;

    // Check if user is president
    const isPresident = String(dbRole).toUpperCase() === "PRESIDENT";

    // If not president, verify they're the head of the specified division
    if (!isPresident) {
      const divisionWithHead = await prisma.division.findFirst({
        where: {
          id: divisionId,
          headId: userId,
        },
      });

      if (!divisionWithHead) {
        return res
          .status(403)
          .json(
            errorResponse(
              "You can only create groups in divisions where you are the head"
            )
          );
      }
    }

    // Verify the division exists
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
      select: { id: true, name: true },
    });

    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }

    // Create the group
    const group = await prisma.group.create({
      data: {
        name,
        description: description || "",
        divisionId,
        createdById: userId,
      },
    });

    return res.status(201).json(
      successResponse(
        {
          group,
          division: {
            id: division.id,
            name: division.name,
          },
        },
        `Group "${name}" created successfully in ${division.name} division`
      )
    );
  } catch (error) {
    return res.status(500).json(errorResponse("Failed to create group"));
  }
};

// Get all groups
const getGroups = async (_req: Request, res: Response) => {
  try {
    const groups = await prisma.group.findMany();
    return res.json(successResponse(groups, "Groups retrieved successfully"));
  } catch (error) {
    console.error("Get groups error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve groups"));
  }
};

// Get groups by division
const getGroupsByDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });
    if (!division) {
      return res.status(404).json(errorResponse("Division not found"));
    }
    const groups = await prisma.group.findMany({ where: { divisionId } });
    return res.json(
      successResponse(groups, "Division groups retrieved successfully")
    );
  } catch (error) {
    console.error("Get division groups error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to retrieve division groups"));
  }
};

// Get a specific group
const getGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const group = await prisma.group.findUnique({ where: { id } });
    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }
    return res.json(successResponse(group, "Group retrieved successfully"));
  } catch (error) {
    console.error("Get group error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve group"));
  }
};

// Update a group
const updateGroup = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const userId = req.user?.id;
    const userRoles = req.user?.roles || [];

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Find the group first
    const group = await prisma.group.findUnique({
      where: { id },
      include: { division: true },
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Check permissions
    const isPresident = userRoles.includes(RoleType.PRESIDENT);
    if (!isPresident) {
      const isHead = await isDivisionHead(userId);
      if (!isHead) {
        return res
          .status(403)
          .json(
            errorResponse(
              "Only division heads or the president can update groups"
            )
          );
      }

      const headDivision = await getUserDivisionAsHead(userId);
      if (!headDivision || headDivision.id !== group.divisionId) {
        return res
          .status(403)
          .json(
            errorResponse(
              "Division heads can only update groups in their own division"
            )
          );
      }
    }

    // Update the group
    const updatedGroup = await prisma.group.update({
      where: { id },
      data: { name, description },
    });

    return res.json(
      successResponse(updatedGroup, "Group updated successfully")
    );
  } catch (error) {
    console.error("Update group error:", error);
    return res.status(500).json(errorResponse("Failed to update group"));
  }
};

// Delete a group
const deleteGroup = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRoles = req.user?.roles || [];

    if (!userId) {
      return res.status(401).json(errorResponse("User not authenticated"));
    }

    // Find the group first
    const group = await prisma.group.findUnique({
      where: { id },
      include: { division: true },
    });

    if (!group) {
      return res.status(404).json(errorResponse("Group not found"));
    }

    // Check permissions
    const isPresident = userRoles.includes(RoleType.PRESIDENT);
    if (!isPresident) {
      const isHead = await isDivisionHead(userId);
      if (!isHead) {
        return res
          .status(403)
          .json(
            errorResponse(
              "Only division heads or the president can delete groups"
            )
          );
      }

      const headDivision = await getUserDivisionAsHead(userId);
      if (!headDivision || headDivision.id !== group.divisionId) {
        return res
          .status(403)
          .json(
            errorResponse(
              "Division heads can only delete groups in their own division"
            )
          );
      }
    }

    // Delete the group
    await prisma.group.delete({ where: { id } });

    return res.json(successResponse(null, "Group deleted successfully"));
  } catch (error) {
    console.error("Delete group error:", error);
    return res.status(500).json(errorResponse("Failed to delete group"));
  }
};

export {
  createGroup,
  getGroups,
  getGroupsByDivision,
  getGroup,
  updateGroup,
  deleteGroup,
};
