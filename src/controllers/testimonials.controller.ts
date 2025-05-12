import { Request, Response } from "express";
import { authenticateRequest, isPresident } from "../utils/auth.utils";
import { errorResponse } from "../utils/response";

import { prisma } from "../config/db";

export const listTestimonials = async (
  req: Request,
  res: Response
): Promise<void> => {
  req;
  try {
    const testimonials = await prisma.testimonial.findMany({
      orderBy: { createdAt: 'desc' }, // optional: sorts by latest first
    });
    res.status(200).json(testimonials);
  } catch (err) {
    res.status(500).json(errorResponse((err as Error).message));
  }
};


export const createTestimonial = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json(errorResponse("Authentication required"));
    return;
  }
  if (!isPresident(user))
    res
      .status(403)
      .json(errorResponse("Only the president can assign division heads"));

  const { name, role, description } = req.body;
  try {
    const testimonial = await prisma.testimonial.create({
      data: { name, role, description },
    });
    res.status(201).json(testimonial);
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};

export const deleteTestimonial = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json(errorResponse("Authentication required"));
    return;
  }
  if (!isPresident(user))
    res
      .status(403)
      .json(errorResponse("Only the president can assign division heads"));

  try {
    await prisma.testimonial.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Testimonial deleted" });
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};
