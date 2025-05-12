import { Request, Response } from "express";
import { prisma } from "../config/db";
import { ObjectId } from "mongodb";

const isValidObjectId = (id: string) => ObjectId.isValid(id);

export const markAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId, memberId, status } = req.body;
    const userId = (req as any).user?.id;

    // Validate input
    if (!sessionId || !memberId || !status) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    if (!isValidObjectId(sessionId)) {
      res.status(400).json({ error: "Invalid sessionId" });
      return;
    }

    // Fetch the session to get the division
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { division: true },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const division = session.division;

    if (!division) {
      res.status(404).json({ error: "Division not found" });
      return;
    }

    if (division.headId !== userId) {
      res.status(403).json({
        error: "You are not authorized to mark attendance for this division",
      });
      return;
    }

    // Check if attendance already exists
    let attendance = await prisma.attendance.findFirst({
      where: {
        sessionId,
        memberId,
      },
    });

    if (attendance) {
      // Update attendance
      attendance = await prisma.attendance.update({
        where: { id: attendance.id },
        data: {
          status,
          markedById: userId,
        },
      });
    } else {
      // Create new attendance
      attendance = await prisma.attendance.create({
        data: {
          sessionId,
          memberId,
          status,
          markedById: userId,
          date: new Date(),
        },
      });
    }

    res.status(200).json(attendance);
  } catch (error) {
    console.error("Error marking attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSessionAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { sessionId } = req.params;
    const userId = (req as any).user?.id;

    if (!sessionId) {
      res.status(400).json({ error: "Session ID is required" });
      return;
    }

    if (!isValidObjectId(sessionId)) {
      res.status(400).json({ error: "Invalid sessionId" });
      return;
    }

    // Fetch session with division
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        division: true,
      },
    });

    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    if (!session.division) {
      res.status(404).json({ error: "Division not found for this session" });
      return;
    }

    if (session.division.headId !== userId) {
      res.status(403).json({
        error: "You are not authorized to view attendance for this division",
      });
      return;
    }

    // Fetch attendance with member's user, session, and markedBy
    const attendanceRecords = await prisma.attendance.findMany({
      where: { sessionId },
      include: {
        member: true, // includes user since User is the member
        session: {
          include: {
            division: true,
          },
        },
        markedBy: true,
      },
    });

    res.status(200).json({
      session,
      attendance: attendanceRecords,
    });
  } catch (error) {
    console.error("Error fetching session attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getHeadSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = (req as any).user?.id;

  try {
    const divisions = await prisma.division.findMany({
      where: {
        headId: userId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!divisions.length) {
      res
        .status(404)
        .json({ message: "No divisions found for this head user." });
      return;
    }

    const divisionIds = divisions.map((div) => div.id);

    // Get sessions under these divisions
    const sessions = await prisma.session.findMany({
      where: {
        divisionId: { in: divisionIds },
      },
      include: {
        division: {
          select: { name: true },
        },
      },
      orderBy: { startTime: "asc" },
    });

    const now = new Date();

    // Map sessions with status
    const result = sessions.map((session) => {
      let sessionStatus = "upcoming";
      if (session.startTime <= now && session.endTime >= now)
        sessionStatus = "open";
      else if (session.endTime < now) sessionStatus = "closed";

      return {
        ...session,
        sessionStatus,
      };
    });

    res.json(result);
  } catch (error) {
    console.error("Error fetching head sessions:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getPersonAttendance = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { memberId } = req.params;

    // Validate memberId
    if (!memberId || !isValidObjectId(memberId)) {
      res.status(400).json({ error: "Invalid member ID" });
      return;
    }

    // Fetch member details (optional)
    const member = await prisma.user.findUnique({
      where: { id: memberId },
    });

    if (!member) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    // Fetch attendance for the member
    const attendanceRecords = await prisma.attendance.findMany({
      where: { memberId },
      include: {
        session: {
          include: {
            division: true,
          },
        },
        markedBy: true,
      },
    });

    if (!attendanceRecords.length) {
      res
        .status(404)
        .json({ error: "No attendance records found for this member" });
      return;
    }

    res.status(200).json(attendanceRecords);
  } catch (error) {
    console.error("Error fetching person's attendance:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
