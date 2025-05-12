import { Request, Response } from "express";
import { authenticateRequest, isPresident } from "../utils/auth.utils";
import { errorResponse } from "../utils/response";

import { prisma } from "../config/db";

export const createRule = async (
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

  const { title, description } = req.body;
  try {
    const rule = await prisma.rule.create({ data: { title, description } });
    res.status(201).json(rule);
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};

export const deleteRule = async (
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
    await prisma.rule.delete({ where: { id: req.params.id } });
    res.status(200).json({ message: "Rule deleted" });
  } catch (err) {
    res.status(400).json(errorResponse((err as Error).message));
  }
};
