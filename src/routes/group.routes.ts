import { Router, Request, Response, NextFunction } from "express";
import { 
  createGroup,
  getGroups,
  getGroupsByDivision,
  getGroup,
  updateGroup,
  deleteGroup
} from "../controllers/group.controller";
import groupMemberController from "../controllers/group-member.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import { RequestWithUser } from "../types/request.types";

const router = Router();

// Type assertion to make controller functions compatible with Express
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

// Public routes (still require authentication)
router.get("/", authenticateToken, getGroups as RequestHandler);
router.get("/division/:divisionId", authenticateToken, getGroupsByDivision as RequestHandler);
router.get("/:id", authenticateToken, getGroup as RequestHandler);

// Protected routes (require authentication and specific roles or division head status)
router.post("/", authenticateToken, createGroup as RequestHandler);
router.put("/:id", authenticateToken, updateGroup as RequestHandler);
router.delete("/:id", authenticateToken, deleteGroup as RequestHandler);

// Group Member Routes
// Test route to check if group member routes are working
router.get("/members/test", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Group member routes are working!",
    path: req.path,
    method: req.method
  });
});

// Get members of a group
router.get("/:groupId/members", authenticateToken, (req, res) => {
  return groupMemberController.getGroupMembers(req as RequestWithUser, res);
});

// Get removed members of a group with removal reasons
router.get("/:groupId/members/removed", authenticateToken, (req, res) => {
  return groupMemberController.getRemovedGroupMembers(req as RequestWithUser, res);
});

// Add a member to a group
router.post("/members/add", authenticateToken, (req, res) => {
  return groupMemberController.addMemberToGroup(req as RequestWithUser, res);
});

// Remove a member from a group
router.delete("/:groupId/members/:memberId", authenticateToken, (req, res) => {
  return groupMemberController.removeMemberFromGroup(req as RequestWithUser, res);
});

// Update removal reason for a removed group member
router.patch("/members/:membershipId/removal-reason", authenticateToken, (req, res) => {
  return groupMemberController.updateGroupMemberRemovalReason(req as RequestWithUser, res);
});

export default router;
