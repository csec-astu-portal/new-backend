import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { RequestWithUser } from '../types/request.types';

/**
 * Wraps controller functions that expect RequestWithUser to be compatible with Express middleware
 * This provides type safety while allowing us to use our custom request type
 */
export const withUserRequest = <P extends ParamsDictionary = ParamsDictionary, ResBody = any, ReqBody = any>(
  handler: (req: RequestWithUser, res: Response<ResBody>) => Promise<Response<ResBody>> | Response<ResBody>
): RequestHandler<P, ResBody, ReqBody> => {
  return (req: Request, res: Response, _next: NextFunction) => {
    // The authenticateToken middleware has already attached the user to the request
    // So we can safely cast it to RequestWithUser
    return handler(req as unknown as RequestWithUser, res);
  };
};
