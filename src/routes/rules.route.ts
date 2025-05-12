import { Router } from "express";
import { createRule, deleteRule } from "../controllers/rules.controller";

const rulesRouter = Router();

// POST /api/rules
rulesRouter.post("/", createRule);

// DELETE /api/rules/:id
rulesRouter.delete("/:id", deleteRule);

export default rulesRouter;
