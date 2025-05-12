import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if the request body is empty
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      res.status(400).json({
        success: false,
        message: "Validation failed",
        errors,
      });
      return;
    }
    req.body = result.data;
    next();
  };
}