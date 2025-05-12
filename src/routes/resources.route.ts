// routes/resource.ts
import { Router } from "express";
import {
  createResource,
  getAllResources,
  updateResource,
  deleteResource,
  getResourcesByDivision,
} from "../controllers/resources.controller";
import { authenticateToken } from "../middlewares/auth.middleware";

const resourcesRouter = Router();

resourcesRouter.get("/", getAllResources);
resourcesRouter.get("/:divisionId", getResourcesByDivision);
resourcesRouter.post("/", authenticateToken, createResource);
resourcesRouter.put("/:id", authenticateToken, updateResource);
resourcesRouter.delete("/:id", authenticateToken, deleteResource);

export default resourcesRouter;
