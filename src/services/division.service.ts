import { Prisma } from "@prisma/client";
import { RoleType } from "../types/role.types";
import { Division } from "../types/division.types";

import { prisma } from "../config/db";
import { DivisionWithDetails } from "../types/division.types";
import { mapFreeNameToFullName, mapArrayFreeNameToFullName } from "../utils/name-mapper";

// Helper function to map database division to our TypeScript Division type
function mapDivisionToType(division: any): Division {
  return mapFreeNameToFullName({
    ...division,
    freeName: division.freeName
  });
}

// Helper function to map database division with details to our TypeScript DivisionWithDetails type
function mapDivisionWithDetailsToType(division: any): DivisionWithDetails {
  // Map the division itself
  const mappedDivision = mapFreeNameToFullName({
    ...division,
    freeName: division.freeName
  });
  
  // Map the head if it exists
  const mappedHead = division.head ? mapFreeNameToFullName({
    ...division.head,
    freeName: division.head.freeName || division.head.freeName
  }) : null;
  
  // Map all members
  const mappedMembers = division.members ? 
    mapArrayFreeNameToFullName(division.members.map((member: any) => ({
      ...member,
      freeName: member.freeName || member.freeName
    }))) : [];
  
  return {
    ...mappedDivision,
    head: mappedHead,
    members: mappedMembers
  };
}

export class DivisionService {
  async createDivision(name: string, description?: string): Promise<Division> {
    try {
      if (!name || typeof name !== 'string') {
        throw new Error('Division name is required and must be a string');
      }
      const divisionName = name.trim();

      // Workaround for MongoDB: fetch all and check in JS
      const allDivisions = await prisma.division.findMany({});
      const exists = allDivisions.some(
        d => d.name.trim().toLowerCase() === divisionName.toLowerCase()
      );
      if (exists) {
        throw new Error('Division name already exists');
      }

      const division = await prisma.division.create({
        data: {
          name: divisionName,
          description,
        },
      });

      // Use the helper function to map database division to our TypeScript type
      return mapDivisionToType(division);
    } catch (error) {
      throw error;
    }
  }

  async getAllDivisions(): Promise<DivisionWithDetails[]> {
    try {
      const divisions = await prisma.division.findMany();
      
      // For each division, get its head and members
      const divisionsWithDetails = await Promise.all(divisions.map(async (division) => {
        const [head, members] = await Promise.all([
          division.headId ? prisma.user.findUnique({
            where: { id: division.headId },
            select: {
              id: true,
              freeName: true,
              email: true,
            },
          }) : null,
          prisma.user.findMany({
            where: { divisionId: division.id },
            select: {
              id: true,
              freeName: true,
              email: true,
              role: true,
            },
          }),
        ]);

        // Use the helper function to map database division with details to our TypeScript type
        return mapDivisionWithDetailsToType({
          ...division,
          head,
          members,
        });
      }));

      return divisionsWithDetails;
    } catch (error) {
      throw new Error("Failed to fetch divisions");
    }
  }

  async getDivisionById(id: string): Promise<DivisionWithDetails | null> {
    try {
      const division = await prisma.division.findUnique({
        where: { id },
      });

      if (!division) return null;

      // Get head and members
      const [head, members] = await Promise.all([
        division.headId ? prisma.user.findUnique({
          where: { id: division.headId },
          select: {
            id: true,
            freeName: true,
            email: true,
          },
        }) : null,
        prisma.user.findMany({
          where: { divisionId: division.id },
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
          },
        }),
      ]);

      return {
        ...division,
        head,
        members,
      } as DivisionWithDetails;
    } catch (error) {
      throw new Error("Failed to fetch division");
    }
  }

  async updateDivision(id: string, name: string, description?: string): Promise<DivisionWithDetails> {
    try {
      const division = await prisma.division.update({
        where: { id },
        data: {
          name,
          description,
        },
      });

      // Get head and members
      const [head, members] = await Promise.all([
        division.headId ? prisma.user.findUnique({
          where: { id: division.headId },
          select: {
            id: true,
            freeName: true,
            email: true,
          },
        }) : null,
        prisma.user.findMany({
          where: { divisionId: division.id },
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
          },
        }),
      ]);

      return {
        ...division,
        head,
        members,
      } as DivisionWithDetails;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new Error("Division name already exists");
      }
      throw new Error("Failed to update division");
    }
  }

  async deleteDivision(id: string): Promise<void> {
    try {
      await prisma.division.delete({
        where: { id },
      });
    } catch (error) {
      throw new Error("Failed to delete division");
    }
  }

  async assignDivisionHead(divisionId: string, userId: string): Promise<DivisionWithDetails> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new Error("User not found");
      }

      if (user.role !== RoleType.CPD_HEAD && 
          user.role !== RoleType.CBD_HEAD && 
          user.role !== RoleType.CYBER_HEAD && 
          user.role !== RoleType.DEV_HEAD && 
          user.role !== RoleType.DATA_SCIENCE_HEAD) {
        throw new Error("User must be a division head");
      }

      const division = await prisma.division.update({
        where: { id: divisionId },
        data: {
          headId: userId,
        },
      });

      // Get head and members
      const [head, members] = await Promise.all([
        division.headId ? prisma.user.findUnique({
          where: { id: division.headId },
          select: {
            id: true,
            freeName: true,
            email: true,
          },
        }) : null,
        prisma.user.findMany({
          where: { divisionId: division.id },
          select: {
            id: true,
            freeName: true,
            email: true,
            role: true,
          },
        }),
      ]);

      return {
        ...division,
        head,
        members,
      } as DivisionWithDetails;
    } catch (error) {
      throw new Error("Failed to assign division head");
    }
  }

  async removeDivisionHead(divisionId: string): Promise<DivisionWithDetails> {
    try {
      const division = await prisma.division.update({
        where: { id: divisionId },
        data: {
          headId: null,
        },
      });

      // Get members (no head since we just removed it)
      const members = await prisma.user.findMany({
        where: { divisionId: division.id },
        select: {
          id: true,
          freeName: true,
          email: true,
        },
      });

      return {
        ...division,
        head: null,
        members,
      } as DivisionWithDetails;
    } catch (error) {
      throw new Error("Failed to remove division head");
    }
  }
}