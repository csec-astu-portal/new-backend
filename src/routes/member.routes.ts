import express from "express";
import memberController from "../controllers/member.controller";
import { authenticateToken } from "../middlewares/auth.middleware";
import path from "path";
import fs from "fs";
import upload from "../config/multer";
import { prisma } from "../config/db";
import { uploadToCloudinary } from "../config/cloudinary";

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Get all members - accessible by president and division heads
router.get("/", memberController.getAllMembers);

// Get all users with advanced filtering, search, and pagination
router.get("/users", memberController.getAllUsers);
router.get("/verified", memberController.getVerifiedUsers);

// Create a new member - accessible by president and division heads
router.post("/", memberController.createMember);

// Get all division heads - accessible by president only
router.get("/division-heads", memberController.getDivisionHeads);

// Simplified member invitation - accessible by president and division heads
router.post("/invite", memberController.inviteMember);

// Generate a random password - accessible by anyone
router.get("/generate-password", memberController.generatePassword);

// Get member by ID - accessible by president, division heads, and the member themselves
router.get("/:memberId", memberController.getMemberById);

// Update member - accessible by president, division heads (their division only), and members (own profile)
router.patch("/:memberId", memberController.updateMember);

// Delete member - accessible by president and division heads (their division only)
router.delete("/:memberId", memberController.deleteMember);

// Assign division head - accessible by president only
router.post("/assign-head", memberController.assignDivisionHead);

// Update own profile - accessible by any authenticated user
// Add multer middleware to handle file uploads
router.patch(
  "/profile",
  authenticateToken,
  upload.single("profileImage"),
  memberController.updateOwnProfile
);

// Update profile picture - accessible by the member themselves or president
router.post(
  "/update-profile-picture/:memberId",
  authenticateToken,
  upload.single("profilepic"),
  memberController.updateProfilePicture
);

// Simple profile picture update endpoint that uses Cloudinary - no authentication required
router.post(
  "/simple-profile-picture/:memberId",
  upload.single("profilepicture"),
  async (req, res) => {
    try {
      const { memberId } = req.params;

      // Validate memberId format (MongoDB ObjectId is 24 hex characters)
      if (
        !memberId ||
        memberId.length !== 24 ||
        !/^[0-9a-fA-F]{24}$/.test(memberId)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid member ID format. Must be a valid MongoDB ObjectId (24 hex characters).",
        });
      }

      // Check if member exists
      let existingMember;
      try {
        existingMember = await prisma.user.findUnique({
          where: { id: memberId },
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        return res.status(400).json({
          success: false,
          message: "Invalid member ID or database error",
          error: dbError.message,
        });
      }

      if (!existingMember) {
        return res
          .status(404)
          .json({ success: false, message: "Member not found" });
      }

      // Check if file was uploaded
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No profile picture uploaded" });
      }

      // Upload to Cloudinary
      const cloudinaryResult = await uploadToCloudinary(
        req.file.path,
        "profile-pictures"
      );

      // Update the member's profile picture URL in the database
      const updatedMember = await prisma.user.update({
        where: { id: memberId },
        data: { profileImage: cloudinaryResult.secure_url },
        select: {
          id: true,
          freeName: true,
          email: true,
          profileImage: true,
        },
      });

      // Return the updated member with the new profile image URL
      return res.json({
        success: true,
        message: "Profile picture updated successfully",
        data: {
          id: updatedMember.id,
          name: updatedMember.freeName,
          email: updatedMember.email,
          profileImage: updatedMember.profileImage,
        },
      });
    } catch (error) {
      console.error("Simple profile picture update error:", error);
      return res
        .status(500)
        .json({ success: false, message: "Failed to update profile picture" });
    }
  }
);

// Remove division head - accessible by president only
router.post("/remove-head", memberController.removeDivisionHead);

// Create a completely separate route for bulk operations to avoid any conflicts
// This route is outside the pattern that might be caught by the :memberId parameter handler
router.post(
  "/admin/bulk-operations/remove-all-except-president",
  memberController.removeAllMembersExceptPresident
);

export default router;
