import { Router } from "express";
import {
  createTestimonial,
  deleteTestimonial,
  listTestimonials,
} from "../controllers/testimonials.controller";

const testimonialRouter = Router();

// POST /api/testimonials
testimonialRouter.get("/", listTestimonials);
testimonialRouter.post("/", createTestimonial);

// DELETE /api/testimonials/:id
testimonialRouter.delete("/:id", deleteTestimonial);

export default testimonialRouter;
