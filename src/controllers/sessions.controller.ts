import { Request, Response } from "express";
import { prisma } from "../config/db";

interface CreateSessionRequest {
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  divisionId: string;
  userIds: string[];
  location: string;
}

export const createSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const {
      title,
      description,
      startTime,
      endTime,
      divisionId,
      location,
      userIds,
    }: CreateSessionRequest = req.body;

    const userId = (req as any).user?.id;

    // Validate required fields
    if (!title || !startTime || !endTime || !divisionId || !location) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    // Check if division exists
    const divisionExists = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!divisionExists) {
      res.status(404).json({ error: "Division not found" });
      return;
    }

    // Check if current user is the head of the division
    if (divisionExists.headId !== userId) {
      res.status(403).json({
        error:
          "You are not the head of this division and cannot create a session",
      });
      return;
    }

    // Validate userIds array
    if (userIds && userIds.length === 0) {
      res.status(400).json({
        error: "Zero users selected. Please select at least one user.",
      });
      return;
    }

    // Create session
    const session = await prisma.session.create({
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        divisionId,
        location,
      },
    });

    // Handle session memberships and attendance
    if (userIds && userIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: userIds } },
      });

      if (users.length !== userIds.length) {
        const foundIds = users.map((user) => user.id);
        const missingIds = userIds.filter((id) => !foundIds.includes(id));
        console.warn(`Some users not found: ${missingIds.join(", ")}`);
      }

      console.log(users);

      users.map(async (user) => {
        await prisma.sessionMembership.create({
          data: {
            userId: user.id,
            sessionId: session.id,
          },
        });

        await prisma.attendance.create({
          data: {
            memberId: user.id,
            markedById: userId || "681bde0651a3e7b3ffb52880",
            status: "NOT_RECORDED",
            date: new Date(),
            sessionId: session.id,
          },
        });
      });
    }

    // Return the created session with related data
    const createdSession = await prisma.session.findUnique({
      where: { id: session.id },
      include: {
        userMemberships: {
          include: {
            user: true,
          },
        },
        attendance: true,
        division: true,
      },
    });

    res.status(201).json(createdSession);
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

//  TODO: Controller to get all sessions
export const getAllSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "20", search = "", sort = "desc" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filters: any = {};

    if (search) {
      filters.OR = [
        {
          title: {
            contains: search as string,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search as string,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: search as string,
            mode: "insensitive",
          },
        },
      ];
    }

    const [sessions, total] = await Promise.all([
      prisma.session.findMany({
        where: filters,
        skip,
        take: limitNumber,
        orderBy: {
          startTime: sort === "asc" ? "asc" : "desc",
        },
        include: {
          division: true,
          userMemberships: {
            include: {
              user: true,
            },
          },
        },
      }),
      prisma.session.count({
        where: filters,
      }),
    ]);

    res.status(200).json({
      data: sessions,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Error fetching sessions: ", error);
    res.status(500).json({ message: "Failed to retrieve sessions", error });
  }
};

// Controller to get a session by ID
export const getSessionById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
      include: {
        division: true,
        userMemberships: {
          include: {
            user: true, // This will include the user details
          },
        },
      },
    });

    if (!session) {
      res.status(404).json({ message: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    console.error("Error fetching session: ", error);
    res.status(500).json({ message: "Error fetching session" });
  }
};

// Controller to create or update a session
export const updateSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { title, description, startTime, endTime, divisionId } = req.body;

  try {
    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      res.status(404).json({ message: "Session not found" });
    }

    const updatedSession = await prisma.session.update({
      where: { id },
      data: {
        title,
        description,
        startTime,
        endTime,
        divisionId,
      },
      include: {
        division: true,
        userMemberships: {
          include: {
            user: true, // This will include the user details
          },
        },
      },
    });

    res.status(200).json(updatedSession);
  } catch (error) {
    console.error("Error updating session: ", error);
    res.status(500).json({ message: "Error updating session" });
  }
};

// Controller to delete a session
export const deleteSession = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  try {
    const session = await prisma.session.findUnique({
      where: { id },
    });

    if (!session) {
      res.status(404).json({ message: "Session not found" });
    }

    await prisma.session.delete({
      where: { id },
    });

    res.status(200).json({ message: "Session deleted successfully" });
  } catch (error) {
    console.error("Error deleting session: ", error);
    res.status(500).json({ message: "Error deleting session" });
  }
};

export const getSessionsByDivisionId = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { divisionId } = req.body;

    if (!divisionId) {
      res
        .status(400)
        .json({ message: "divisionId is required in the request body." });
      return;
    }

    const sessions = await prisma.session.findMany({
      where: {
        divisionId,
      },
      include: {
        division: true,
        userMemberships: {
          include: {
            user: true,
          },
        },
      },
    });

    res.status(200).json({ data: sessions });
  } catch (error) {
    console.error("Error fetching sessions by divisionId:", error);
    res.status(500).json({ message: "Failed to retrieve sessions", error });
  }
};
