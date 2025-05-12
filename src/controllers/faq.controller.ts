import { Request, Response } from "express";
import { authenticateRequest, isPresident } from "../utils/auth.utils";
import { errorResponse } from "../utils/response";

import { prisma } from "../config/db";

export const listFaqs = async (req: Request, res: Response): Promise<void> => {
  req;
  try {
    const faqs = await prisma.faq.findMany({
      orderBy: { createdAt: "asc" }, // Optional: sort by oldest first
    });
    res.status(200).json(faqs);
  } catch (err) {
    res.status(500).json(errorResponse((err as Error).message));
  }
};

export const createFaq = async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json(errorResponse("Authentication required"));
    return;
  }
  if (!isPresident(user)) {
    res
      .status(403)
      .json(errorResponse("Only the president can assign division heads"));
    return;
  }

  const { question, answer } = req.body;
  try {
    const faq = await prisma.faq.create({ data: { question, answer } });
    res.status(201).json(faq);
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};

export const deleteFaq = async (req: Request, res: Response): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json(errorResponse("Authentication required"));
    return;
  }
  if (!isPresident(user)) {
    res
      .status(403)
      .json(errorResponse("Only the president can assign division heads"));
    return;
  }

  try {
    await prisma.faq.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "FAQ deleted" });
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};
