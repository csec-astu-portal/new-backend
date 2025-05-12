import { Request, Response } from "express";
import { prisma } from "../config/db";
import { authenticateRequest } from "../utils/auth.utils";
import { errorResponse, successResponse } from "../utils/response";
import { uploadToCloudinary } from "../config/cloudinary";
import { MongoClient, ObjectId } from "mongodb";
import { RoleType } from "@prisma/client";
import fs from "fs";
import path from "path";

// Helper function to check if a user is a division head based on role
const isDivisionHeadRole = (role: RoleType): boolean => {
  return (
    role === RoleType.CBD_HEAD ||
    role === RoleType.CYBER_HEAD ||
    role === RoleType.DEV_HEAD ||
    role === RoleType.CPD_HEAD ||
    role === RoleType.DATA_SCIENCE_HEAD
  );
};

// MongoDB setup
const mongoUri = process.env.DATABASE_URL || "";
let articlesCollection: any = null;
let commentsCollection: any = null;
let mongoClient: MongoClient | null = null;

// Article status enum
enum ArticleStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

// Helper function to check if a user is president
const isUserPresident = (user: any): boolean => {
  return user.role === RoleType.PRESIDENT;
};

// Helper function to get MongoDB collections
const getCollections = async () => {
  if (articlesCollection && commentsCollection) {
    return { articlesCollection, commentsCollection };
  }

  await initMongoDB();

  if (!articlesCollection || !commentsCollection) {
    throw new Error("Failed to initialize MongoDB collections");
  }

  return { articlesCollection, commentsCollection };
};

// Initialize MongoDB connection
const initMongoDB = async () => {
  try {
    if (mongoClient) {
      console.log("MongoDB client already initialized");
      return;
    }

    console.log("Connecting to MongoDB...");
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log("Connected to MongoDB successfully");

    const db = mongoClient.db();
    articlesCollection = db.collection("articles");
    commentsCollection = db.collection("comments");
    console.log("MongoDB collections initialized for articles");

    // Ensure upload directories exist
    const uploadsDir = path.join(process.cwd(), "uploads");
    const articleCoversDir = path.join(uploadsDir, "article-covers");

    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("Created uploads directory");
    }

    if (!fs.existsSync(articleCoversDir)) {
      fs.mkdirSync(articleCoversDir, { recursive: true });
      console.log("Created article-covers directory");
    }
  } catch (error) {
    console.error("Failed to initialize MongoDB collections:", error);
    articlesCollection = null;
    commentsCollection = null;
    mongoClient = null;
  }
};

// Call initialization immediately
initMongoDB();

// 1. Create a new article
const createArticle = async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Check if user is president (for auto-approval of public articles)
    const userIsPresident = isUserPresident(user);

    // Extract article data from request
    const {
      title,
      content,
      summary,
      tags,
      divisionId,
      groupId,
      writerName,
      writerEmail,
      writerDivision,
      writerRole,
      isPublic,
    } = req.body;

    // Convert isPublic to boolean
    const articleIsPublic = isPublic === true || isPublic === "true";

    // Basic validation
    if (!title || !content) {
      return res
        .status(400)
        .json(errorResponse("Title and content are required"));
    }

    // Validate writer information
    if (!writerName || !writerEmail) {
      return res
        .status(400)
        .json(errorResponse("Writer name and email are required"));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(writerEmail)) {
      return res.status(400).json(errorResponse("Invalid email format"));
    }

    // Validate division and role
    if (!writerDivision) {
      return res.status(400).json(errorResponse("Writer division is required"));
    }

    if (!writerRole) {
      return res.status(400).json(errorResponse("Writer role is required"));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Validate user role
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        divisionId: true,
        isEmailVerified: true,
        status: true,
      },
    });

    if (!userDetails) {
      return res.status(404).json(errorResponse("User not found"));
    }

    // Check if user is active and email is verified
    if (userDetails.status !== "ACTIVE") {
      return res
        .status(403)
        .json(
          errorResponse(
            "Your account is not active. Please contact an administrator."
          )
        );
    }

    if (!userDetails.isEmailVerified) {
      return res
        .status(403)
        .json(
          errorResponse("Please verify your email before creating articles.")
        );
    }

    // Validate division if provided
    let validatedDivisionId = divisionId || userDetails.divisionId || null;
    if (validatedDivisionId) {
      const division = await prisma.division.findUnique({
        where: { id: validatedDivisionId },
      });

      if (!division) {
        return res.status(400).json(errorResponse("Invalid division ID"));
      }

      // If user is not president or division head, make sure they belong to this division
      const isUserPresident = userDetails.role === RoleType.PRESIDENT;
      const isUserDivisionHead = isDivisionHeadRole(userDetails.role);

      if (
        !isUserPresident &&
        !isUserDivisionHead &&
        userDetails.divisionId !== validatedDivisionId
      ) {
        return res
          .status(403)
          .json(
            errorResponse("You can only create articles for your own division")
          );
      }
    }

    // Validate group if provided
    let validatedGroupId = null;
    if (groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(400).json(errorResponse("Invalid group ID"));
      }

      // Check if user is a member of this group
      const groupMember = await prisma.usersInGroups.findFirst({
        where: {
          groupId: groupId,
          userId: user.id,
        },
      });

      const isGroupMember = !!groupMember;

      // If not president or division head, user must be a member of the group
      const isUserPresident = userDetails.role === RoleType.PRESIDENT;
      const isUserDivisionHead = isDivisionHeadRole(userDetails.role);

      if (!isUserPresident && !isUserDivisionHead && !isGroupMember) {
        return res
          .status(403)
          .json(
            errorResponse(
              "You can only create articles for groups you are a member of"
            )
          );
      }

      validatedGroupId = groupId;
    }

    // Process cover image if provided
    let coverImageUrl = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(
          req.file.path,
          "article-covers"
        );
        coverImageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res
          .status(500)
          .json(errorResponse("Failed to upload cover image"));
      }
    }

    // Create new article document
    const newArticle = {
      title,
      content,
      summary: summary || "",
      coverImage: coverImageUrl,
      tags: tags
        ? Array.isArray(tags)
          ? tags
          : tags.split(",").map((tag: string) => tag.trim())
        : [],
      status: ArticleStatus.PUBLISHED,
      viewCount: 0,
      likeCount: 0,
      authorId: user.id,
      divisionId: validatedDivisionId,
      groupId: validatedGroupId,
      writerName: writerName || user.freeName || "",
      writerEmail: writerEmail || user.email || "",
      writerDivision: writerDivision || "",
      writerRole: writerRole || "",
      isPublic: articleIsPublic,
      isApproved: articleIsPublic ? userIsPresident : true, // Auto-approve if president or private
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await collections.articlesCollection.insertOne(newArticle);

    if (!result.insertedId) {
      return res.status(500).json(errorResponse("Failed to create article"));
    }

    // Return the created article
    // Determine message based on approval status
    const needsApproval = articleIsPublic && !userIsPresident;
    const message = needsApproval
      ? "Article created successfully and awaiting approval"
      : "Article created successfully";

    return res
      .status(201)
      .json(
        successResponse({ ...newArticle, _id: result.insertedId }, message)
      );
  } catch (error) {
    console.error("Create article error:", error);
    return res.status(500).json(errorResponse("Failed to create article"));
  }
};

// 2. Get all articles with pagination
const getAllArticles = async (req: Request, res: Response) => {
  try {
    // Check if user is authenticated (optional)
    let user;
    try {
      user = await authenticateRequest(req, res);
    } catch (e) {
      user = null;
    }
    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = (req.query.search as string) || "";
    const divisionId = req.query.divisionId as string;
    const groupId = req.query.groupId as string;
    const authorRole = req.query.authorRole as string;
    const authorId = req.query.authorId as string;
    const sortBy = (req.query.sortBy as string) || "createdAt";
    const sortOrder = (req.query.sortOrder as string) === "asc" ? 1 : -1;
    const status = req.query.status as string;

    // Authenticate the request (optional) - we don't need the result
    await authenticateRequest(req, res);

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Build query
    const query: any = { status: ArticleStatus.PUBLISHED };

    // Handle public vs private articles
    if (req.query.public === "true") {
      // Public articles for landing page - only show approved ones
      query.isPublic = true;
      query.isApproved = true;
    } else if (req.query.public === "false") {
      // Private articles for portal - only visible to logged-in users
      query.isPublic = false;

      // Make sure user is authenticated for private articles
      if (!user) {
        return res
          .status(401)
          .json(
            errorResponse("Authentication required to view private articles")
          );
      }
    } else if (!user) {
      // If no user is logged in and no filter specified, only show approved public articles
      query.isPublic = true;
      query.isApproved = true;
    }

    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { summary: { $regex: search, $options: "i" } },
      ];

      // Search in tags (which is an array)
      query.$or.push({ tags: { $in: [new RegExp(search, "i")] } });
    }

    // Filter by division if provided
    if (divisionId) {
      // Validate division
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!division) {
        return res.status(400).json(errorResponse("Invalid division ID"));
      }

      query.divisionId = divisionId;
    }

    // Filter by group if provided
    if (groupId) {
      // Validate group
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(400).json(errorResponse("Invalid group ID"));
      }

      query.groupId = groupId;
    }

    // Filter by author role if provided
    if (authorRole) {
      // Validate role
      const validRoles = Object.values(RoleType);
      if (!validRoles.includes(authorRole as RoleType)) {
        return res.status(400).json(errorResponse("Invalid author role"));
      }

      query.authorRole = authorRole;
    }

    // Filter by author if provided
    if (authorId) {
      // Validate author
      const author = await prisma.user.findUnique({
        where: { id: authorId },
      });

      if (!author) {
        return res.status(400).json(errorResponse("Invalid author ID"));
      }

      query.authorId = authorId;
    }

    // Filter by status if provided
    if (status) {
      query.status = status;
    }

    // Get total count for pagination
    const total = await collections.articlesCollection.countDocuments(query);

    // Create sort object
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;

    // Get articles with pagination
    const articles = await collections.articlesCollection
      .find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Enhance articles with author information
    const articlesWithAuthors = await Promise.all(
      articles.map(async (article: any) => {
        const author = await prisma.user.findUnique({
          where: { id: article.authorId },
          select: { id: true, freeName: true, profileImage: true, role: true },
        });

        // Get division information if article has a division
        let division = null;
        if (article.divisionId) {
          division = await prisma.division.findUnique({
            where: { id: article.divisionId },
            select: { id: true, name: true },
          });
        }

        // Get group information if article has a group
        let group = null;
        if (article.groupId) {
          group = await prisma.group.findUnique({
            where: { id: article.groupId },
            select: { id: true, name: true },
          });
        }

        return {
          ...article,
          author: author || {
            id: article.authorId,
            freeName: "Unknown",
            profileImage: null,
          },
          division,
          group,
        };
      })
    );

    // Return articles with pagination info
    return res.json(
      successResponse(
        {
          articles: articlesWithAuthors,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
        "Articles retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Get all articles error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve articles"));
  }
};

// 3. Get article by ID
const getArticleById = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse("Invalid article ID"));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({
      _id: new ObjectId(articleId),
      status: ArticleStatus.PUBLISHED,
    });

    if (!article) {
      return res.status(404).json(errorResponse("Article not found"));
    }

    // Increment view count
    await collections.articlesCollection.updateOne(
      { _id: new ObjectId(articleId) },
      { $inc: { viewCount: 1 } }
    );

    // Get author information
    const author = await prisma.user.findUnique({
      where: { id: article.authorId },
      select: { id: true, freeName: true, profileImage: true, role: true },
    });

    // Get division information if article has a division
    let division = null;
    if (article.divisionId) {
      division = await prisma.division.findUnique({
        where: { id: article.divisionId },
        select: { id: true, name: true },
      });
    }

    // Return article with author and division info
    return res.json(
      successResponse(
        {
          ...article,
          author: author || {
            id: article.authorId,
            freeName: "Unknown",
            profileImage: null,
          },
          division,
        },
        "Article retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Get article by ID error:", error);
    return res.status(500).json(errorResponse("Failed to retrieve article"));
  }
};

// 4. Update an article
const updateArticle = async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    const { articleId } = req.params;
    const { title, content, summary, tags, divisionId, groupId } = req.body;

    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse("Invalid article ID"));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({
      _id: new ObjectId(articleId),
    });

    if (!article) {
      return res.status(404).json(errorResponse("Article not found"));
    }

    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        divisionId: true,
        isEmailVerified: true,
        status: true,
      },
    });

    if (!userDetails) {
      return res.status(404).json(errorResponse("User not found"));
    }

    // Check if user is active
    if (userDetails.status !== "ACTIVE") {
      return res
        .status(403)
        .json(
          errorResponse(
            "Your account is not active. Please contact an administrator."
          )
        );
    }

    // Check authorization - only author, division heads, or president can update
    const isAuthor = article.authorId === user.id;
    const isUserPresident = userDetails.role === RoleType.PRESIDENT;
    const isUserDivisionHead = isDivisionHeadRole(userDetails.role);

    // If article has a division, check if user is head of that division
    let isDivisionHeadOfArticle = false;
    if (article.divisionId && isUserDivisionHead) {
      const division = await prisma.division.findUnique({
        where: { id: article.divisionId },
        select: { headId: true },
      });

      isDivisionHeadOfArticle = division?.headId === user.id;
    }

    // Authorization check
    if (!isAuthor && !isUserPresident && !isDivisionHeadOfArticle) {
      return res
        .status(403)
        .json(
          errorResponse("You do not have permission to update this article")
        );
    }

    // Validate division if changing
    let validatedDivisionId = article.divisionId;
    if (divisionId && divisionId !== article.divisionId) {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!division) {
        return res.status(400).json(errorResponse("Invalid division ID"));
      }

      // If user is not president or division head, make sure they belong to this division
      if (
        !isUserPresident &&
        !isUserDivisionHead &&
        userDetails.divisionId !== divisionId
      ) {
        return res
          .status(403)
          .json(
            errorResponse("You can only assign articles to your own division")
          );
      }

      validatedDivisionId = divisionId;
    }

    // Validate group if changing
    let validatedGroupId = article.groupId;
    if (groupId && groupId !== article.groupId) {
      const group = await prisma.group.findUnique({
        where: { id: groupId },
      });

      if (!group) {
        return res.status(400).json(errorResponse("Invalid group ID"));
      }

      // Check if user is a member of this group
      const groupMember = await prisma.usersInGroups.findFirst({
        where: {
          groupId: groupId,
          userId: user.id,
        },
      });

      const isGroupMember = !!groupMember;

      // If not president or division head, user must be a member of the group
      if (!isUserPresident && !isUserDivisionHead && !isGroupMember) {
        return res
          .status(403)
          .json(
            errorResponse(
              "You can only assign articles to groups you are a member of"
            )
          );
      }

      validatedGroupId = groupId;
    }

    // Process cover image if provided
    let coverImageUrl = article.coverImage;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(
          req.file.path,
          "article-covers"
        );
        coverImageUrl = result.secure_url;
      } catch (uploadError) {
        console.error("Image upload error:", uploadError);
        return res
          .status(500)
          .json(errorResponse("Failed to upload cover image"));
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (tags) updateData.tags = JSON.parse(tags);
    if (coverImageUrl) updateData.coverImage = coverImageUrl;
    if (validatedDivisionId !== article.divisionId)
      updateData.divisionId = validatedDivisionId;
    if (validatedGroupId !== article.groupId)
      updateData.groupId = validatedGroupId;

    // Update the article
    const result = await collections.articlesCollection.updateOne(
      { _id: new ObjectId(articleId) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json(errorResponse("Failed to update article"));
    }

    // Get the updated article
    const updatedArticle = await collections.articlesCollection.findOne({
      _id: new ObjectId(articleId),
    });

    // Get author information
    const author = await prisma.user.findUnique({
      where: { id: updatedArticle.authorId },
      select: { id: true, freeName: true, profileImage: true, role: true },
    });

    // Get division information if article has a division
    let division = null;
    if (updatedArticle.divisionId) {
      division = await prisma.division.findUnique({
        where: { id: updatedArticle.divisionId },
        select: { id: true, name: true },
      });
    }

    // Get group information if article has a group
    let group = null;
    if (updatedArticle.groupId) {
      group = await prisma.group.findUnique({
        where: { id: updatedArticle.groupId },
        select: { id: true, name: true },
      });
    }

    // Return the updated article with additional information
    const enrichedArticle = {
      ...updatedArticle,
      author: author || {
        id: updatedArticle.authorId,
        freeName: "Unknown",
        profileImage: null,
      },
      division,
      group,
    };

    return res.json(
      successResponse(enrichedArticle, "Article updated successfully")
    );
  } catch (error) {
    console.error("Update article error:", error);
    return res.status(500).json(errorResponse("Failed to update article"));
  }
};

// 5. Delete an article
const deleteArticle = async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    const { articleId } = req.params;

    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse("Invalid article ID"));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({
      _id: new ObjectId(articleId),
    });

    if (!article) {
      return res.status(404).json(errorResponse("Article not found"));
    }

    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        role: true,
        divisionId: true,
        isEmailVerified: true,
        status: true,
      },
    });

    if (!userDetails) {
      return res.status(404).json(errorResponse("User not found"));
    }

    // Check if user is active
    if (userDetails.status !== "ACTIVE") {
      return res
        .status(403)
        .json(
          errorResponse(
            "Your account is not active. Please contact an administrator."
          )
        );
    }

    // Check authorization - only author, division heads, or president can delete
    const isAuthor = article.authorId === user.id;
    const isUserPresident = userDetails.role === RoleType.PRESIDENT;
    const isUserDivisionHead = isDivisionHeadRole(userDetails.role);

    // If article has a division, check if user is head of that division
    let isDivisionHeadOfArticle = false;
    if (article.divisionId && isUserDivisionHead) {
      const division = await prisma.division.findUnique({
        where: { id: article.divisionId },
        select: { headId: true },
      });

      isDivisionHeadOfArticle = division?.headId === user.id;
    }

    // Authorization check
    if (!isAuthor && !isUserPresident && !isDivisionHeadOfArticle) {
      return res
        .status(403)
        .json(
          errorResponse("You do not have permission to delete this article")
        );
    }

    // Get article information before deletion for logging
    const articleInfo = {
      id: article._id,
      title: article.title,
      authorId: article.authorId,
      divisionId: article.divisionId,
      groupId: article.groupId,
      deletedBy: {
        id: user.id,
        role: userDetails.role,
      },
    };

    // Delete the article
    const result = await collections.articlesCollection.deleteOne({
      _id: new ObjectId(articleId),
    });

    if (result.deletedCount === 0) {
      return res
        .status(500)
        .json(errorResponse("Failed to delete the article"));
    }

    // Delete all comments related to this article
    await collections.commentsCollection.deleteMany({ articleId });

    // Log the deletion for audit purposes
    console.log(`Article deleted: ${JSON.stringify(articleInfo)}`);

    return res.json(successResponse(null, "Article deleted successfully"));
  } catch (error) {
    console.error("Delete article error:", error);
    return res
      .status(500)
      .json(errorResponse("An error occurred while deleting the article"));
  }
};

// 6. Get best articles - Featured or most popular articles
const getBestArticles = async (req: Request, res: Response) => {
  try {
    // Get limit parameter (default to 5)
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    // Find articles that are published and have a high view count or are featured
    // You can customize this query based on what makes an article "best" in your application
    const bestArticles = await collections.articlesCollection
      .find({
        status: "PUBLISHED",
        $or: [
          { isFeatured: true },
          { viewCount: { $gte: 10 } }, // Articles with at least 10 views
        ],
      })
      .sort({ viewCount: -1, createdAt: -1 }) // Sort by view count (descending) and then by creation date
      .limit(limit)
      .toArray();

    // If no articles found, return empty array
    if (bestArticles.length === 0) {
      return res.json(successResponse([], "No best articles found"));
    }

    // Get author information for each article
    const enrichedArticles = await Promise.all(
      bestArticles.map(async (article: any) => {
        // Get author information
        let author = null;
        if (article.authorId && article.authorId !== "anonymous") {
          author = await prisma.user.findUnique({
            where: { id: article.authorId },
            select: {
              id: true,
              freeName: true,
              profileImage: true,
              role: true,
            },
          });
        }

        // Get division information if article has a division
        let division = null;
        if (article.divisionId) {
          division = await prisma.division.findUnique({
            where: { id: article.divisionId },
            select: { id: true, name: true },
          });
        }

        // Return enriched article
        return {
          ...article,
          author: author || {
            id: article.authorId,
            freeName: "Anonymous",
            profileImage: null,
          },
          division,
        };
      })
    );

    return res.json(
      successResponse(enrichedArticles, "Best articles retrieved successfully")
    );
  } catch (error) {
    console.error("Get best articles error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to retrieve best articles"));
  }
};

// Get articles pending approval (president only)
const getArticlesForApproval = async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Check if user is president
    if (!isUserPresident(user)) {
      return res
        .status(403)
        .json(
          errorResponse("Only the president can view articles pending approval")
        );
    }

    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error("Failed to get MongoDB collections:", error);
      return res.status(500).json(errorResponse("Database connection failed"));
    }

    const { articlesCollection } = collections;

    // Get articles pending approval (public but not approved)
    const articles = await articlesCollection
      .find({ isPublic: true, isApproved: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count for pagination
    const total = await articlesCollection.countDocuments({
      isPublic: true,
      isApproved: false,
    });

    return res.json(
      successResponse(
        {
          articles,
          pagination: {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit),
          },
        },
        "Articles pending approval retrieved successfully"
      )
    );
  } catch (error) {
    console.error("Get approval articles error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to retrieve articles pending approval"));
  }
};

// Approve or reject an article (president only)
const approveArticle = async (req: Request, res: Response) => {
  try {
    // Authenticate the request
    const user = await authenticateRequest(req, res);
    if (!user) {
      return res.status(401).json(errorResponse("Authentication required"));
    }

    // Check if user is president
    if (!isUserPresident(user)) {
      return res
        .status(403)
        .json(errorResponse("Only the president can approve articles"));
    }

    const { articleId } = req.params;
    const { approved } = req.body;

    // Validate required fields
    if (approved === undefined) {
      return res.status(400).json(errorResponse("Approved status is required"));
    }

    // Get MongoDB collection
    const { articlesCollection } = await getCollections();

    // Find article
    const article = await articlesCollection.findOne({
      _id: new ObjectId(articleId),
    });

    if (!article) {
      return res.status(404).json(errorResponse("Article not found"));
    }

    // Update article approval status
    // When approved, also make the article public
    const updateFields: Record<string, any> = {
      isApproved: Boolean(approved),
      updatedAt: new Date(),
    };

    // If approved, make it public (visible on landing page)
    if (Boolean(approved)) {
      updateFields.isPublic = true;
    }

    const result = await articlesCollection.updateOne(
      { _id: new ObjectId(articleId) },
      { $set: updateFields }
    );

    if (result.modifiedCount === 0) {
      return res
        .status(400)
        .json(errorResponse("Article approval status could not be updated"));
    }

    // Get the updated article
    const updatedArticle = await articlesCollection.findOne({
      _id: new ObjectId(articleId),
    });

    return res.json(
      successResponse(
        updatedArticle || null,
        approved
          ? "Article approved successfully"
          : "Article rejected successfully"
      )
    );
  } catch (error) {
    console.error("Approve article error:", error);
    return res
      .status(500)
      .json(errorResponse("Failed to update article approval status"));
  }
};

// Export controller functions
const articleController = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getBestArticles,
  getArticlesForApproval,
  approveArticle,
};

export default articleController;
