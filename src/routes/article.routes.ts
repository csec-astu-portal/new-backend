import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import articleController from "../controllers/article.controller";

const router = Router();

// Ensure upload directory exists
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, "uploads/article-covers");
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed"
        ) as any
      );
    }
  },
});

// Article routes - Basic CRUD operations
router.post("/", upload.single("coverimage"), articleController.createArticle);
router.get("/", articleController.getAllArticles);
router.get("/best", articleController.getBestArticles); // Get best articles

// Get articles pending approval (president only)
router.get("/pending-approval", articleController.getArticlesForApproval);

// Get public articles (for landing page)
router.get("/public", (req, res) => {
  req.query.public = "true";
  return articleController.getAllArticles(req, res);
});

// Get private articles (for portal)
router.get("/private", (req, res) => {
  req.query.public = "false";
  return articleController.getAllArticles(req, res);
});

// Approve or reject an article (president only)
router.patch("/:articleId/approve", articleController.approveArticle);

// Standard article routes
router.get("/:articleId", articleController.getArticleById);
router.put(
  "/:articleId",
  upload.single("coverimage"),
  articleController.updateArticle
);
router.delete("/:articleId", articleController.deleteArticle);

export default router;
