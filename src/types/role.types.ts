// Import the RoleType enum directly from Prisma to ensure compatibility
import { RoleType as PrismaRoleType } from '@prisma/client';

// Re-export the Prisma RoleType to maintain compatibility
export type RoleType = PrismaRoleType;

// Export the enum values for convenience
export const RoleType = PrismaRoleType;
