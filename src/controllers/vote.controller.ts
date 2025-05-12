import { Request, Response, NextFunction } from "express";
import { authenticateRequest } from "src/utils/auth.utils";
import { prisma } from "src/config/db";

export const createVote = async function (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const user = await authenticateRequest(req, res);
    if (!user) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }

    const { electionId, candidateId } = req.body;

    if (!electionId || !candidateId) {
      res
        .status(400)
        .json({
          success: false,
          error: "electionId and candidateId are required",
        });
      return;
    }

    // Fetch election with eligibility and status info
    const election = await prisma.election.findUnique({
      where: { id: electionId },
      include: {
        eligibleRoles: true,
        nominations: {
          where: {
            status: "APPROVED",
          },
        },
      },
    });

    if (!election) {
      res.status(404).json({ success: false, error: "Election not found" });
      return;
    }

    if (election.status !== "VOTING") {
      res.status(400).json({ success: false, error: "Voting is not active" });
      return;
    }

    // Check if user is eligible based on roles
    const userRoleIds = user.roles.map((role) => role.id);
    const eligible = election.eligibleRoles.some((role) =>
      userRoleIds.includes(role.id)
    );

    if (!eligible) {
      res.status(403).json({
        success: false,
        error: "You are not eligible to vote in this election",
      });
      return;
    }

    // Check if the user has already voted
    const existingVote = await prisma.vote.findUnique({
      where: {
        electionId_voterId: {
          electionId,
          voterId: user.id,
        },
      },
    });

    if (existingVote) {
      res.status(409).json({ success: false, error: "You have already voted" });
      return;
    }

    // Validate candidate: must be one of the approved nominations
    const validCandidate = election.nominations.find(
      (nomination) => nomination.nomineeId === candidateId
    );

    if (!validCandidate) {
      res
        .status(400)
        .json({ success: false, error: "Invalid or unapproved candidate" });
      return;
    }

    // Create vote
    await prisma.vote.create({
      data: {
        electionId,
        voterId: user.id,
        candidateId,
      },
    });

    // Optionally add to election history
    await prisma.electionHistory.create({
      data: {
        electionId,
        changedById: user.id,
        action: "vote_cast",
        details: `User ${user.id} voted for ${candidateId}`,
      },
    });

    res.status(201).json({ success: true, message: "Vote cast successfully" });
  } catch (error) {
    console.error("Error casting vote:", error);
    next(error);
  }
};
