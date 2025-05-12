import Router from "express";

import {
  createSession,
  getAllSessions,
  getSessionById,
  getSessionsByDivisionId,
} from "../controllers/sessions.controller";

import { authenticateToken } from "../middlewares/auth.middleware";

const sessionRouter = Router();
sessionRouter.get("/", authenticateToken, getAllSessions);
sessionRouter.post("/new", authenticateToken, createSession);
sessionRouter.get("/:id", getSessionById);
sessionRouter.get("/divisions/:id", getSessionsByDivisionId);

export default sessionRouter;
