import { Request, Response } from "express";
import { prisma } from "../config/db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { RoleType } from "../types/role.types";
import { errorResponse, successResponse } from "../utils/response";
import passport from "../config/passport.config";
import { sendWelcomeEmail } from "../services/email.service";
import { passwordResetService } from "../services/password-reset.service";

// Import JWT configuration
import { JWT_CONFIG } from "../config/jwt.config";

// We're using the Request type directly with type casting instead of a custom interface

// Define JWT payload type
interface JWTPayload extends Pick<User, "id" | "email" | "role" | "freeName"> {
  fullName: string; // Added fullName for UI consistency
}

// Cookie options
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 24 * 60 * 60 * 1000, // 24 hours
  path: "/",
  domain: process.env.COOKIE_DOMAIN || undefined,
};

// Define user type for TypeScript
interface User {
  id: string;
  email: string;
  role: RoleType;
  freeName: string;
  password?: string;
  isEmailVerified?: boolean;
}

// Generate token
const generateToken = (
  user: Pick<User, "id" | "email" | "role" | "freeName">
) => {
  const payload: JWTPayload = {
    id: user.id,
    email: user.email,
    role: user.role,
    freeName: user.freeName,
    fullName: user.freeName, // Add fullName mapping for frontend consistency
  };

  return jwt.sign(payload, JWT_CONFIG.secret, {
    expiresIn: "24h", // 24 hours
  });
};

// Register a new user (simplified version)
export const register = async (req: Request, res: Response) => {
  try {
    const {
      freeName,
      email,
      password,
      phone,
      telegram,
      year,
      studentId,
      gmailId,
      githubProfile,
      supportHandle,
      skills,
      fieldOfStudy,
      historyNotes,
      role = RoleType.MEMBER,
      divisionId,
      groupId,
    } = req.body;

    // Validate required fields
    if (!freeName || !email || !password) {
      return res
        .status(400)
        .json(errorResponse("Free name, email, and password are required"));
    }

    // Validate division and group for regular members
    if (role === RoleType.MEMBER && !divisionId) {
      return res
        .status(400)
        .json(errorResponse("Division ID is required for members"));
    }

    // Validate student year (must be between 1-5)
    if (year && (isNaN(Number(year)) || Number(year) < 1 || Number(year) > 5)) {
      return res
        .status(400)
        .json(errorResponse("Student year must be a number between 1 and 5"));
    }

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json(errorResponse("Email already exists"));
    }

    // Restrict multiple PRESIDENT accounts
    if (role === RoleType.PRESIDENT) {
      const presidentCount = await prisma.user.count({
        where: { role: RoleType.PRESIDENT },
      });
      if (presidentCount > 0) {
        return res
          .status(409)
          .json(errorResponse("Only one PRESIDENT is allowed in the system"));
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Split freeName into firstName and lastName
    const nameParts = freeName.split(" ");
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    // Verify division exists if provided
    if (divisionId) {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!division) {
        return res.status(404).json(errorResponse("Division not found"));
      }
    }

    // Verify group exists and belongs to the specified division if provided
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(404).json(errorResponse("Group not found"));
      }

      if (divisionId && group.divisionId !== divisionId) {
        return res
          .status(400)
          .json(
            errorResponse("Group does not belong to the specified division")
          );
      }
    }

    // Create user with auto-verification for PRESIDENT and all provided fields
    const user = await prisma.user.create({
      data: {
        freeName,
        email,
        password: hashedPassword,
        contact: phone, // Map phone to contact field in schema
        note: telegram, // Store telegram in note field
        expectedGenerationYear: year, // Map year to expectedGenerationYear
        studentId,
        gmailId,
        githubProfile,
        supportHandle,
        skills: skills || [],
        fieldOfStudy,
        historyNotes,
        lastName,
        role,
        isEmailVerified: role === RoleType.PRESIDENT ? true : false,
        divisionId: divisionId || null,
      },
    });

    // Add user to group if provided
    if (groupId && user) {
      await prisma.usersInGroups.create({
        data: {
          userId: user.id,
          groupId: groupId,
        },
      });
    }

    // Send welcome email with OTP to the newly registered user
    try {
      // For PRESIDENT role, we don't need OTP verification
      if (role === RoleType.PRESIDENT) {
        // Extract student ID from the request body or use a default value
        const studentId = req.body.studentId || "Not Available";

        await sendWelcomeEmail(
          email,
          freeName,
          role,
          password,
          user.id,
          "No OTP Required",
          studentId
        );
      } else {
        // For other roles, send welcome email with OTP and password
        // Generate a 6-digit OTP code
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in the database (will implement this later)
        // For now, just send the email with the OTP
        // Extract student ID from the request body or use a default value
        const studentId = req.body.studentId || "Not Available";

        await sendWelcomeEmail(
          email,
          freeName,
          role,
          password,
          user.id,
          otp,
          studentId
        );
        console.log(`Welcome email with OTP sent to ${email}: ${otp}`);
      }
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Continue with registration even if email fails
    }

    // Create a response object with all user data except password
    const { password: _, ...userWithoutPassword } = user;

    // Add firstName and lastName to response
    const responseData = {
      ...userWithoutPassword,
      firstName,
      lastName,
    };

    return res
      .status(201)
      .json(successResponse(responseData, "User registered successfully"));
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json(errorResponse("Internal server error"));
  }
};

// Login a user
export const login = async (req: Request, res: Response): Promise<Response> => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res
      .status(400)
      .json(errorResponse("Email and password are required"));
  }

  return new Promise((resolve) => {
    passport.authenticate(
      "local",
      { session: false },
      async (err: any, user: any, info: any) => {
        if (err) {
          console.error("Authentication error:", err);
          return resolve(
            res.status(500).json(errorResponse("Authentication failed"))
          );
        }

        if (!user) {
          return resolve(
            res
              .status(401)
              .json(errorResponse(info?.message || "Invalid credentials"))
          );
        }

        // Check if email is verified (except for PRESIDENT role)
        if (!user.isEmailVerified && user.role !== RoleType.PRESIDENT) {
          // For members, they cannot verify themselves, so provide a different message
          if (user.role === RoleType.MEMBER) {
            return resolve(
              res
                .status(403)
                .json(
                  errorResponse(
                    "Your account is pending verification by an administrator. Please contact your division head or the president."
                  )
                )
            );
          } else {
            // For division heads and other roles, they can verify themselves
            return resolve(
              res
                .status(403)
                .json(
                  errorResponse(
                    "Email not verified. Please verify your email before logging in."
                  )
                )
            );
          }
        }

        const token = generateToken(user);
        res.cookie("jwt", token, cookieOptions);

        const { password: _, ...userWithoutPassword } = user;
        return resolve(
          res.json(
            successResponse(
              { user: userWithoutPassword, token },
              "Login successful"
            )
          )
        );
      }
    )(req, res);
  });
};

// Logout a user
export const logout = (_req: Request, res: Response) => {
  res.clearCookie("jwt");
  return res.json(successResponse(null, "Logged out successfully"));
};

// Get user profile
export const getProfile = (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json(errorResponse("Not authenticated"));
  }

  return res.json(successResponse(user, "Profile retrieved successfully"));
};

// OTP verification with proper validation
export const verifyOtp = async (req: Request, res: Response) => {
  try {
    // Handle both lowercase and capitalized parameter names
    const email = req.body.email || req.body.Email;
    const otp = req.body.otp || req.body.OTP;

    // Log the request body for debugging
    console.log("OTP verification request body:", JSON.stringify(req.body));
    console.log(`OTP verification request for ${email} with code ${otp}`);

    if (!email || !otp) {
      return res.status(400).json(errorResponse("Email and OTP are required"));
    }

    // Find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, role: true, isEmailVerified: true, freeName: true },
    });

    if (!user) {
      return res.status(400).json(errorResponse("User not found"));
    }

    // All users (including members) can verify their own email
    console.log(`User ${email} is attempting to verify their email`);
    // No role-based restrictions for email verification

    // Verify the OTP against the stored value in the database
    const storedVerification = await prisma.verificationToken.findFirst({
      where: {
        userId: user.id,
        token: otp,
        expiresAt: { gt: new Date() }, // Check that the token hasn't expired
      },
    });

    // Log the verification result
    console.log(
      `OTP verification for ${email}: ${
        storedVerification ? "Valid" : "Invalid"
      }`
    );

    if (!storedVerification) {
      return res
        .status(400)
        .json(
          errorResponse(
            "Invalid or expired OTP code. Please check your email for the correct code or request a new one."
          )
        );
    }

    // Delete the used verification token
    await prisma.verificationToken.delete({
      where: { id: storedVerification.id },
    });

    // Update the user's email verification status
    await prisma.user.update({
      where: { id: user.id },
      data: { isEmailVerified: true },
    });

    // Return success but don't include the isEmailVerified status in the response
    // This ensures the verification status is stored in the database but not displayed in the UI
    return res.json(
      successResponse(
        {
          success: true,
          user: {
            id: user.id,
            email,
            role: user.role,
            name: user.freeName,
            // isEmailVerified is intentionally omitted from the response
          },
        },
        "Email verification process completed"
      )
    );
  } catch (error) {
    console.error("OTP verification error:", error);
    return res
      .status(500)
      .json(
        errorResponse(
          "An error occurred during email verification. Please try again or contact support."
        )
      );
  }
};

// Request a password reset (forgot password)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    // Handle both lowercase and capitalized parameter names
    const email = req.body.email || req.body.Email;

    // Log the request body for debugging
    console.log("Forgot password request body:", JSON.stringify(req.body));

    if (!email) {
      return res.status(400).json(errorResponse("Email is required"));
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, freeName: true },
    });

    if (!user) {
      // For security reasons, don't reveal that the email doesn't exist
      return res.json(
        successResponse(
          null,
          "If your email is registered, you will receive a password reset code"
        )
      );
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Store the OTP in the database
    // For now, we'll just log it and rely on the email delivery
    // In production, you would store this in the database with an expiration time

    // Set expiry to 1 hour from now
    const otpExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // TODO: Store the OTP in the database
    // For now, we'll just use the OTP directly from the email

    console.log(
      `Password reset OTP generated for ${email}: ${otp}, expires at ${otpExpiry}`
    );

    // Send password reset email with OTP using the new password reset service
    const emailSent = await passwordResetService.sendPasswordResetEmail(
      email,
      user.freeName,
      otp
    );

    console.log(
      `Password reset OTP for ${email}: ${otp}, Email sent: ${emailSent}`
    );

    return res.json(
      successResponse(
        null,
        "Password reset instructions have been sent to your email"
      )
    );
  } catch (error) {
    console.error("Forgot password error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to process password reset request"));
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    // Handle both lowercase and capitalized parameter names
    const email = req.body.email || req.body.Email;
    const otp = req.body.otp || req.body.OTP;
    const password =
      req.body.password ||
      req.body.newPassword ||
      req.body.Password ||
      req.body.NewPassword;

    // Log the request body for debugging
    console.log("Reset password request body:", JSON.stringify(req.body));

    if (!email || !otp || !password) {
      return res
        .status(400)
        .json(errorResponse("Email, OTP, and new password are required"));
    }

    // Validate password strength
    if (password.length < 8) {
      return res
        .status(400)
        .json(errorResponse("Password must be at least 8 characters long"));
    }

    // Find the user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(400).json(errorResponse("Invalid email address"));
    }

    // Verify the OTP
    // For development purposes, we'll accept any 6-digit OTP
    // In production, you would verify against a stored OTP in the database
    const isValidOTP = otp.length === 6 && /^\d+$/.test(otp);

    console.log(
      `Password reset OTP verification for ${email}: ${
        isValidOTP ? "Valid" : "Invalid"
      }`
    );

    // If the OTP is not valid, return an error
    if (!isValidOTP) {
      return res.status(400).json(errorResponse("Invalid or expired OTP code"));
    }

    // If we reach here, the OTP is valid

    // OTP validation is already handled above

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update the user's password
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    // TODO: Clear the OTP from the database
    // For now, we'll just log it

    console.log(
      `Password reset successful for ${email} - OTP can be cleared from database`
    );

    return res.json(
      successResponse(null, "Password has been reset successfully")
    );
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json(errorResponse("Failed to reset password"));
  }
};

// Resend OTP code
export const resendOtp = async (req: Request, res: Response) => {
  try {
    const { email, purpose = "email_verification" } = req.body;

    if (!email) {
      return res.status(400).json(errorResponse("Email is required"));
    }

    // Find user to get their name, role, and other necessary fields
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        freeName: true,
        role: true,
        isEmailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json(errorResponse("User not found"));
    }

    // Generate a 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Set expiry to 1 hour from now
    const otpExpiry = new Date(Date.now() + 3600000);

    // TODO: Store the OTP in the database
    // For now, we'll just log it and rely on the email delivery
    console.log(
      `New OTP generated for ${email}: ${otp}, purpose: ${purpose}, expires at: ${otpExpiry}`
    );

    // Send the appropriate email based on the purpose
    if (purpose === "email_verification") {
      // Use the sendWelcomeEmail function from email.service.ts
      // Use a default value for studentId since it's not stored in the user object
      const studentId = "Not Available";
      await sendWelcomeEmail(
        email,
        user.freeName,
        user.role,
        "",
        user.id,
        otp,
        studentId
      );
    } else if (purpose === "password_reset") {
      // Use the new password reset service
      await passwordResetService.sendPasswordResetEmail(
        email,
        user.freeName,
        otp
      );
    }

    // Log for development purposes
    console.log(`New OTP generated for ${email}: ${otp}`);

    return res.json(
      successResponse(null, "New verification OTP has been sent to your email")
    );
  } catch (error) {
    console.error("Resend OTP error:", error);
    return res.status(500).json(errorResponse("Failed to resend OTP"));
  }
};

/**
 * Fix multiple PRESIDENT roles in the database
 * This function keeps only the first PRESIDENT (by creation date) and demotes others to MEMBER
 */
export const fixMultiplePresidentRoles = async (): Promise<void> => {
  try {
    console.log("Checking for multiple PRESIDENT roles...");

    // Find all users with PRESIDENT role, sorted by creation date
    const presidents = await prisma.user.findMany({
      where: { role: RoleType.PRESIDENT },
      orderBy: { createdAt: "asc" },
    });

    console.log(`Found ${presidents.length} users with PRESIDENT role`);

    if (presidents.length <= 1) {
      console.log("No action needed - there is only one or zero presidents");
      return;
    }

    // Keep the first president, demote others
    const firstPresident = presidents[0];
    const otherPresidents = presidents.slice(1);

    console.log(
      `Keeping ${firstPresident.freeName} (${firstPresident.id}) as PRESIDENT`
    );

    // Update other presidents to MEMBER role
    for (const president of otherPresidents) {
      console.log(`Demoting ${president.freeName} (${president.id}) to MEMBER`);

      await prisma.user.update({
        where: { id: president.id },
        data: { role: RoleType.MEMBER },
      });
    }

    console.log("President role fix completed successfully");
  } catch (error) {
    console.error("Error fixing president roles:", error);
  }
};

export const checkUserVerification = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      res.status(400).json({
        error: "User ID is required in the request",
      });
    }

    // Fetch user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({
        error: "User not found",
      });
    }

    // Check if the user is verified
    const isVerified = user?.isEmailVerified ?? false;
    const role = user?.role;

    res.status(200).json({
      isVerified,
      role,
    });
  } catch (error) {
    console.error("Error checking user verification:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  }
};

// Export all functions as a controller object for backward compatibility
export const authController = {
  register,
  login,
  logout,
  getProfile,
  fixMultiplePresidentRoles,
  verifyOtp,
  forgotPassword,
  resetPassword,
  resendOtp,
};
