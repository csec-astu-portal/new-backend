import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { errorResponse, successResponse } from '../utils/response';
import { MongoClient, ObjectId } from 'mongodb';
import { uploadToCloudinary } from '../config/cloudinary';
import fs from 'fs';
import path from 'path';

// MongoDB setup
const mongoUri = process.env.DATABASE_URL || '';
let articlesCollection: any = null;
let commentsCollection: any = null;
let mongoClient: MongoClient | null = null;

// Article status enum
enum ArticleStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED'
}

// Initialize MongoDB connection
const initMongoDB = async () => {
  try {
    if (mongoClient) {
      console.log('MongoDB client already initialized');
      return;
    }
    
    console.log('Connecting to MongoDB...');
    mongoClient = new MongoClient(mongoUri);
    await mongoClient.connect();
    console.log('Connected to MongoDB successfully');
    
    const db = mongoClient.db();
    articlesCollection = db.collection('articles');
    commentsCollection = db.collection('comments');
    console.log('MongoDB collections initialized for articles');
    
    // Ensure upload directories exist
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
  } catch (error) {
    console.error('Failed to initialize MongoDB collections:', error);
    articlesCollection = null;
    commentsCollection = null;
    mongoClient = null;
  }
};

// Call initialization immediately
initMongoDB();

// Helper function to get MongoDB collections
const getCollections = async () => {
  if (articlesCollection && commentsCollection) {
    return { articlesCollection, commentsCollection };
  }
  
  await initMongoDB();
  
  if (!articlesCollection || !commentsCollection) {
    throw new Error('Failed to initialize MongoDB collections');
  }
  
  return { articlesCollection, commentsCollection };
};

// 1. Create a new article - Simplified, no authentication required
const createArticle = async (req: Request, res: Response) => {
  try {
    // Extract article data from request
    const { title, content, summary, tags, authorId, divisionId, groupId } = req.body;
    
    // Basic validation
    if (!title || !content) {
      return res.status(400).json(errorResponse('Title and content are required'));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }

    // Process cover image if provided
    let coverImageUrl = null;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path, 'article-covers');
        coverImageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json(errorResponse('Failed to upload cover image'));
      }
    }

    // Get author details if provided
    let authorRole = 'MEMBER';
    if (authorId) {
      const author = await prisma.user.findUnique({
        where: { id: authorId },
        select: { role: true }
      });
      if (author) {
        authorRole = author.role;
      }
    }

    // Create the article
    const newArticle = {
      title,
      content,
      summary: summary || '',
      coverImage: coverImageUrl,
      tags: tags ? (typeof tags === 'string' ? JSON.parse(tags) : tags) : [],
      status: ArticleStatus.PUBLISHED, // All articles are published immediately
      viewCount: 0,
      authorId: authorId || 'anonymous',
      divisionId: divisionId || null,
      groupId: groupId || null,
      authorRole: authorRole,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collections.articlesCollection.insertOne(newArticle);
    
    if (!result.insertedId) {
      return res.status(500).json(errorResponse('Failed to create article'));
    }

    // Return the created article
    return res.status(201).json(successResponse(
      { ...newArticle, _id: result.insertedId },
      'Article created successfully'
    ));
  } catch (error) {
    console.error('Create article error:', error);
    return res.status(500).json(errorResponse('Failed to create article'));
  }
};

// 2. Get all articles with pagination
const getAllArticles = async (req: Request, res: Response) => {
  try {
    // Extract query parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const search = req.query.search as string || '';
    const divisionId = req.query.divisionId as string;
    const groupId = req.query.groupId as string;
    const authorRole = req.query.authorRole as string;
    const authorId = req.query.authorId as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string === 'asc' ? 1 : -1;
    
    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }

    // Build query
    const query: any = { status: ArticleStatus.PUBLISHED };
    
    // Add search functionality
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
        { summary: { $regex: search, $options: 'i' } }
      ];
      
      // Search in tags (which is an array)
      query.$or.push({ tags: { $in: [new RegExp(search, 'i')] } });
    }
    
    // Filter by division if provided
    if (divisionId) {
      query.divisionId = divisionId;
    }
    
    // Filter by group if provided
    if (groupId) {
      query.groupId = groupId;
    }
    
    // Filter by author role if provided
    if (authorRole) {
      query.authorRole = authorRole;
    }
    
    // Filter by author if provided
    if (authorId) {
      query.authorId = authorId;
    }

    // Get total count for pagination
    const total = await collections.articlesCollection.countDocuments(query);
    
    // Create sort object
    const sortOptions: any = {};
    sortOptions[sortBy] = sortOrder;
    
    // Get articles with pagination
    const articles = await collections.articlesCollection.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .toArray();
    
    // Enhance articles with author information
    const articlesWithAuthors = await Promise.all(articles.map(async (article: any) => {
      let author = null;
      if (article.authorId && article.authorId !== 'anonymous') {
        author = await prisma.user.findUnique({
          where: { id: article.authorId },
          select: { id: true, freeName: true, profileImage: true, role: true }
        });
      }
      
      // Get division information if article has a division
      let division = null;
      if (article.divisionId) {
        division = await prisma.division.findUnique({
          where: { id: article.divisionId },
          select: { id: true, name: true }
        });
      }
      
      // Get group information if article has a group
      let group = null;
      if (article.groupId) {
        group = await prisma.group.findUnique({
          where: { id: article.groupId },
          select: { id: true, name: true }
        });
      }
      
      return {
        ...article,
        author: author || { id: article.authorId, freeName: 'Anonymous', profileImage: null },
        division,
        group
      };
    }));

    // Return articles with pagination info
    return res.json(successResponse({
      articles: articlesWithAuthors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    }, 'Articles retrieved successfully'));
  } catch (error) {
    console.error('Get all articles error:', error);
    return res.status(500).json(errorResponse('Failed to retrieve articles'));
  }
};

// 3. Get article by ID
const getArticleById = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    
    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse('Invalid article ID'));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({ 
      _id: new ObjectId(articleId),
      status: ArticleStatus.PUBLISHED
    });
    
    if (!article) {
      return res.status(404).json(errorResponse('Article not found'));
    }

    // Increment view count
    await collections.articlesCollection.updateOne(
      { _id: new ObjectId(articleId) },
      { $inc: { viewCount: 1 } }
    );

    // Get author information
    let author = null;
    if (article.authorId && article.authorId !== 'anonymous') {
      author = await prisma.user.findUnique({
        where: { id: article.authorId },
        select: { id: true, freeName: true, profileImage: true, role: true }
      });
    }

    // Get division information if article has a division
    let division = null;
    if (article.divisionId) {
      division = await prisma.division.findUnique({
        where: { id: article.divisionId },
        select: { id: true, name: true }
      });
    }

    // Return article with author and division info
    return res.json(successResponse({
      ...article,
      author: author || { id: article.authorId, freeName: 'Anonymous', profileImage: null },
      division
    }, 'Article retrieved successfully'));
  } catch (error) {
    console.error('Get article by ID error:', error);
    return res.status(500).json(errorResponse('Failed to retrieve article'));
  }
};

// 4. Update an article - Simplified, no authentication required
const updateArticle = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;
    const { title, content, summary, tags, divisionId, groupId } = req.body;
    
    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse('Invalid article ID'));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({ _id: new ObjectId(articleId) });
    
    if (!article) {
      return res.status(404).json(errorResponse('Article not found'));
    }

    // Process cover image if provided
    let coverImageUrl = article.coverImage;
    if (req.file) {
      try {
        const result = await uploadToCloudinary(req.file.path, 'article-covers');
        coverImageUrl = result.secure_url;
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
        return res.status(500).json(errorResponse('Failed to upload cover image'));
      }
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date()
    };

    if (title) updateData.title = title;
    if (content) updateData.content = content;
    if (summary !== undefined) updateData.summary = summary;
    if (tags) {
      updateData.tags = typeof tags === 'string' ? JSON.parse(tags) : tags;
    }
    if (coverImageUrl) updateData.coverImage = coverImageUrl;
    if (divisionId) updateData.divisionId = divisionId;
    if (groupId) updateData.groupId = groupId;

    // Update the article
    const result = await collections.articlesCollection.updateOne(
      { _id: new ObjectId(articleId) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json(errorResponse('Failed to update article'));
    }

    // Get the updated article
    const updatedArticle = await collections.articlesCollection.findOne({ _id: new ObjectId(articleId) });
    
    // Get author information
    let author = null;
    if (updatedArticle.authorId && updatedArticle.authorId !== 'anonymous') {
      author = await prisma.user.findUnique({
        where: { id: updatedArticle.authorId },
        select: { id: true, freeName: true, profileImage: true, role: true }
      });
    }
    
    // Get division information if article has a division
    let division = null;
    if (updatedArticle.divisionId) {
      division = await prisma.division.findUnique({
        where: { id: updatedArticle.divisionId },
        select: { id: true, name: true }
      });
    }
    
    // Get group information if article has a group
    let group = null;
    if (updatedArticle.groupId) {
      group = await prisma.group.findUnique({
        where: { id: updatedArticle.groupId },
        select: { id: true, name: true }
      });
    }
    
    // Return the updated article with additional information
    const enrichedArticle = {
      ...updatedArticle,
      author: author || { id: updatedArticle.authorId, freeName: 'Anonymous', profileImage: null },
      division,
      group
    };

    return res.json(successResponse(enrichedArticle, 'Article updated successfully'));
  } catch (error) {
    console.error('Update article error:', error);
    return res.status(500).json(errorResponse('Failed to update article'));
  }
};

// 5. Delete an article - Simplified, no authentication required
const deleteArticle = async (req: Request, res: Response) => {
  try {
    const { articleId } = req.params;

    // Validate article ID
    if (!articleId || !ObjectId.isValid(articleId)) {
      return res.status(400).json(errorResponse('Invalid article ID'));
    }

    // Ensure MongoDB connection is established
    let collections;
    try {
      collections = await getCollections();
    } catch (error) {
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }

    // Find the article
    const article = await collections.articlesCollection.findOne({ _id: new ObjectId(articleId) });
    
    if (!article) {
      return res.status(404).json(errorResponse('Article not found'));
    }

    // Delete the article
    const result = await collections.articlesCollection.deleteOne({ _id: new ObjectId(articleId) });

    if (result.deletedCount === 0) {
      return res.status(500).json(errorResponse('Failed to delete the article'));
    }

    // Delete all comments related to this article
    await collections.commentsCollection.deleteMany({ articleId });

    return res.json(successResponse(null, 'Article deleted successfully'));
  } catch (error) {
    console.error('Delete article error:', error);
    return res.status(500).json(errorResponse('An error occurred while deleting the article'));
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
      console.error('Failed to get MongoDB collections:', error);
      return res.status(500).json(errorResponse('Database connection failed'));
    }
    
    // Find articles that are published and have a high view count or are featured
    // You can customize this query based on what makes an article "best" in your application
    const bestArticles = await collections.articlesCollection.find({
      status: 'PUBLISHED',
      $or: [
        { isFeatured: true },
        { viewCount: { $gte: 10 } } // Articles with at least 10 views
      ]
    })
    .sort({ viewCount: -1, createdAt: -1 }) // Sort by view count (descending) and then by creation date
    .limit(limit)
    .toArray();
    
    // If no articles found, return empty array
    if (bestArticles.length === 0) {
      return res.json(successResponse([], 'No best articles found'));
    }
    
    // Get author information for each article
    const enrichedArticles = await Promise.all(bestArticles.map(async (article) => {
      // Get author information
      let author = null;
      if (article.authorId && article.authorId !== 'anonymous') {
        author = await prisma.user.findUnique({
          where: { id: article.authorId },
          select: { id: true, freeName: true, profileImage: true, role: true }
        });
      }
      
      // Get division information if article has a division
      let division = null;
      if (article.divisionId) {
        division = await prisma.division.findUnique({
          where: { id: article.divisionId },
          select: { id: true, name: true }
        });
      }
      
      // Return enriched article
      return {
        ...article,
        author: author || { id: article.authorId, freeName: 'Anonymous', profileImage: null },
        division
      };
    }));
    
    return res.json(successResponse(enrichedArticles, 'Best articles retrieved successfully'));
  } catch (error) {
    console.error('Get best articles error:', error);
    return res.status(500).json(errorResponse('Failed to retrieve best articles'));
  }
};

// Export controller functions
const simpleArticleController = {
  createArticle,
  getAllArticles,
  getArticleById,
  updateArticle,
  deleteArticle,
  getBestArticles
};

export default simpleArticleController;
