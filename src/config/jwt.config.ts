import dotenv from 'dotenv';
import { Algorithm } from 'jsonwebtoken';

dotenv.config();

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'csec-astu-portal-secret-key-2024';

export const JWT_CONFIG = {
  secret: JWT_SECRET,
  expiresIn: '24h',
  algorithms: ['HS256'] as Algorithm[]
};