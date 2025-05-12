import express from "express";
import {
  getAllDivisions,
  getDivisionById,
  createDivision,
  updateDivision,
  deleteDivision,
  assignDivisionHead,
  removeDivisionHead,
  addMemberToDivision,
  removeMemberFromDivision,
  getRemovedDivisionMembers,
  updateDivisionMemberRemovalReason,
  getMembersByDivisionId,
} from "../controllers/division.controller";
import { createGroup } from "../controllers/group.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { RequestWithUser } from "../types/request.types";

const router = express.Router();

// Get all divisions - accessible by all authenticated users
router.get("/", authenticateToken, getAllDivisions);

// Get division by ID - accessible by all authenticated users
router.get("/:divisionId", authenticateToken, getDivisionById);

router.get("/:divisionId/members", authenticateToken, getMembersByDivisionId);

// Create division - accessible by president only
router.post("/", authenticateToken, createDivision);

// Get removed division members - accessible by president and division heads
router.get(
  "/:divisionId/removed-members",
  authenticateToken,
  getRemovedDivisionMembers
);

// Keep the old route for backward compatibility
router.get(
  "/removed/:divisionId",
  authenticateToken,
  getRemovedDivisionMembers
);

// Update division - accessible by president and division heads
router.patch("/:divisionId", authenticateToken, updateDivision);

// Delete division - accessible by president only
router.delete("/:divisionId", authenticateToken, deleteDivision);

// Add member to division - accessible by president and division heads
router.post("/:divisionId/members", authenticateToken, addMemberToDivision);

// Remove member from division - accessible by president and division heads
router.delete(
  "/:divisionId/members/:memberId",
  authenticateToken,
  removeMemberFromDivision
);

// Assign division head - accessible by president only
router.post("/:divisionId/head", authenticateToken, assignDivisionHead);

// Remove division head - accessible by president only
router.delete("/:divisionId/head", authenticateToken, removeDivisionHead);

// Additional route for assigning division head (for compatibility)
router.post("/:divisionId/assign-head", authenticateToken, assignDivisionHead);

// Update removal reason for a division member - accessible by president and division heads
router.patch(
  "/:divisionId/members/:memberId/removal-reason",
  authenticateToken,
  updateDivisionMemberRemovalReason
);

// Create a group within a division - accessible by president and division heads
router.post("/:divisionId/groups", authenticateToken, (req, res) => {
  // Add the divisionId from the URL params to the request body
  req.body.divisionId = req.params.divisionId;
  return createGroup(req as RequestWithUser, res);
});

export default router;
