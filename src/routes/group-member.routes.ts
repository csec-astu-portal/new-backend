import { Router } from "express";
import groupMemberController from "../controllers/group-member.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { withUserRequest } from "../utils/middleware-wrapper";

const router = Router();

// Test route to check if any routes are being recognized
router.get("/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Group member routes are working!",
    path: req.path,
    method: req.method
  });
});

// Get members of a group
router.get("/:groupId", authenticateToken, withUserRequest((req, res) => {
  return groupMemberController.getGroupMembers(req, res);
}));

// Get removed members of a group with removal reasons
router.get("/:groupId/removed", authenticateToken, withUserRequest((req, res) => {
  return groupMemberController.getRemovedGroupMembers(req, res);
}));

// Add a member to a group
router.post("/add", authenticateToken, withUserRequest((req, res) => {
  return groupMemberController.addMemberToGroup(req, res);
}));

// Remove a member from a group
router.delete("/:groupId/members/:memberId", authenticateToken, withUserRequest((req, res) => {
  return groupMemberController.removeMemberFromGroup(req, res);
}));

// Update removal reason for a removed group member
router.patch("/membership/:membershipId/removal-reason", authenticateToken, withUserRequest((req, res) => {
  return groupMemberController.updateGroupMemberRemovalReason(req, res);
}));

export default router;
