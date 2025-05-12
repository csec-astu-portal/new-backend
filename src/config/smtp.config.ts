import dotenv from 'dotenv';

dotenv.config();

export const config = {
  smtp: {
    host: process.env.EMAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: false,
    user: process.env.EMAIL_USER || '',
    key: process.env.EMAIL_PASS || '',
    authMethod: 'LOGIN',
    tls: {
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2'
    },
    socketTimeout: 30000
  }
} as const;

export const validateSMTPKey = (key: string): boolean => {
  // For Gmail, just check non-empty
  return typeof key === 'string' && key.length > 0;
};