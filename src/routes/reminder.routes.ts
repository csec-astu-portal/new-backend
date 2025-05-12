import { Router, Request, Response, NextFunction } from "express";
import { 
  createReminder,
  getReminders,
  getReminder,
  updateReminder,
  deleteReminder
} from "../controllers/reminder.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const router = Router();

// All reminder routes require authentication
router.use(authenticateToken);

// Type assertion to make controller functions compatible with Express
type RequestHandler = (req: Request, res: Response, next: NextFunction) => Promise<any> | any;

// Reminder routes
router.post("/", createReminder as RequestHandler);
router.get("/", getReminders as RequestHandler);
router.get("/:id", getReminder as RequestHandler);
router.put("/:id", updateReminder as RequestHandler);
router.delete("/:id", deleteReminder as RequestHandler);

export default router;
