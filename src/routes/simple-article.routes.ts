import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import simpleArticleController from '../controllers/simple-article.controller';

const router = Router();

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
const articleCoversDir = path.join(uploadsDir, 'article-covers');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory');
}

if (!fs.existsSync(articleCoversDir)) {
  fs.mkdirSync(articleCoversDir, { recursive: true });
  console.log('Created article-covers directory');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/article-covers');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed') as any);
    }
  },
});

// Test endpoint to verify the route is working
router.get('/test', (_req, res) => {
  return res.status(200).json({
    success: true,
    message: 'Simple article routes are working!'
  });
});

// Article routes - Basic CRUD operations without authentication
router.post('/', upload.single('coverImage'), simpleArticleController.createArticle);
router.get('/', simpleArticleController.getAllArticles);
router.get('/best', simpleArticleController.getBestArticles); // Get best articles
router.get('/:articleId', simpleArticleController.getArticleById);
router.put('/:articleId', upload.single('coverImage'), simpleArticleController.updateArticle);
router.delete('/:articleId', simpleArticleController.deleteArticle);

export default router;
