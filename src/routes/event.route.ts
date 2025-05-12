import { Router } from "express";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from "../controllers/event.controller";

const eventRouter = Router();

eventRouter.get("/", getAllEvents);
eventRouter.get("/:id", getEventById);
eventRouter.post("/", createEvent);
eventRouter.put("/:id", updateEvent);
eventRouter.delete("/:id", deleteEvent);

export default eventRouter;
