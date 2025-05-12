import { Request, Response, NextFunction } from "express";

declare module "express" {
  interface Request {
    user?: any;
  }
}

export const authorize = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      throw new Error("un Authorized user");
    }
    next();
    console.log("from authorization");
    console.log(req.user);
  } catch (error) {
    next(error);
  }
};
