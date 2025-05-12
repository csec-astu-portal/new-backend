import { prisma } from "../config/db";
import { RoleType } from "../types/role.types";

/**
 * Check if a user can update a profile
 * Users can only update their own profile unless they are the PRESIDENT
 * Division heads can only update profiles of members in their division
 */
export const canUpdateProfile = async (
  currentUserId: string,
  targetUserId: string,
  currentUserRole: RoleType
): Promise<boolean> => {
  // Users can always update their own profile
  if (currentUserId === targetUserId) {
    return true;
  }

  // President can update any profile
  if (currentUserRole === RoleType.PRESIDENT) {
    return true;
  }

  // Division heads can only update profiles of members in their division
  const divisionHeadRoles = ['CPD_HEAD', 'CBD_HEAD', 'CYBER_HEAD', 'DEV_HEAD', 'DATA_SCIENCE_HEAD'];
  const isDivisionHead = divisionHeadRoles.includes(currentUserRole);

  if (isDivisionHead) {
    // Get the division where the current user is head
    const division = await prisma.division.findFirst({
      where: { headId: currentUserId }
    });

    if (!division) {
      return false;
    }

    // Check if the target user is in this division
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId }
    });

    if (!targetUser || targetUser.divisionId !== division.id) {
      return false;
    }

    return true;
  }

  // Regular members can only update their own profile
  return false;
};

/**
 * Check if a user is in a specific division
 */
export const isUserInDivision = async (userId: string, divisionId: string): Promise<boolean> => {
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  return !!user && user.divisionId === divisionId;
};

/**
 * Get the division where a user is head
 */
export const getUserDivisionAsHead = async (userId: string) => {
  return await prisma.division.findFirst({
    where: { headId: userId }
  });
};
