import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

// SMTP Update Schema (Gmail: just require email and non-empty password)
const SMTPUpdateSchema = z.object({
  user: z.string().email('Invalid email format'),
  key: z.string().min(8, 'Password must be at least 8 characters')
});

// Rate limiter for SMTP updates
export const smtpRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 attempts per hour
  message: {
    success: false,
    message: '❌ Too many SMTP update attempts. Please try again in an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin role check middleware
export const isAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const user = (req as any).user;
  
  if (!user || !user.roles || !user.roles.includes('admin')) {
    res.status(403).json({
      success: false,
      message: '❌ Admin access required'
    });
    return;
  }
  
  next();
};

// SMTP input validation middleware
export const validateSMTPInput = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await SMTPUpdateSchema.parseAsync(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        message: '❌ Invalid SMTP credentials format',
        errors: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      return;
    }
    next(error);
  }
}; 