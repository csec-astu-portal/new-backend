import { Request, Response } from "express";
import { prisma } from "../config/db";
import { EventType } from "@prisma/client";
import { authenticateRequest, isPresident } from "../utils/auth.utils";

export const getAllEvents = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { page = "1", limit = "20", search = "", sort = "desc" } = req.query;

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filters: any = {};

    if (search) {
      filters.OR = [
        {
          title: {
            contains: search as string,
            mode: "insensitive",
          },
        },
        {
          description: {
            contains: search as string,
            mode: "insensitive",
          },
        },
        {
          location: {
            contains: search as string,
            mode: "insensitive",
          },
        },
      ];
    }

    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where: filters,
        skip,
        take: limitNumber,
        orderBy: {
          date: sort === "asc" ? "asc" : "desc",
        },
      }),
      prisma.event.count({
        where: filters,
      }),
    ]);

    res.status(200).json({
      data: events,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to retrieve events", error });
  }
};

export const getEventById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  try {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      res.status(404).json({ message: "Event not found" });
      return;
    }

    res.status(200).json(event);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving event", error });
  }
};

export const createEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json({ success: false, message: "Not Authorized" });
    return;
  }

  // Check if user is president
  if (!isPresident(user)) {
    res
      .status(403)
      .json({ success: false, message: "Only President Can Create an Event" });
  }
  const { title, description, location, date, status } = req.body;

  if (status && !Object.values(EventType).includes(status)) {
    res.status(400).json({ message: "Invalid event status" });
    return;
  }

  try {
    const newEvent = await prisma.event.create({
      data: {
        title,
        description,
        location,
        date: new Date(date),
        status: status || EventType.PRIVATE,
      },
    });
    res.status(201).json(newEvent);
  } catch (error) {
    res.status(400).json({ message: "Failed to create event", error });
  }
};

export const updateEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json({ success: false, message: "Not Authorized" });
    return;
  }

  // Check if user is president
  if (!isPresident(user)) {
    res
      .status(403)
      .json({ success: false, message: "Only President Can Create an Event" });
  }
  const { id } = req.params;
  const { title, description, location, date, status } = req.body;

  if (status && !Object.values(EventType).includes(status)) {
    res.status(400).json({ message: "Invalid event status" });
    return;
  }

  try {
    const updatedEvent = await prisma.event.update({
      where: { id },
      data: {
        title,
        description,
        location,
        date: date ? new Date(date) : undefined,
        status,
      },
    });
    res.status(200).json(updatedEvent);
  } catch (error) {
    res.status(400).json({ message: "Failed to update event", error });
  }
};

export const deleteEvent = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await authenticateRequest(req, res);
  if (!user) {
    res.status(401).json({ success: false, message: "Not Authorized" });
    return;
  }

  // Check if user is president
  if (!isPresident(user)) {
    res
      .status(403)
      .json({ success: false, message: "Only President Can Create an Event" });
  }
  const { id } = req.params;
  try {
    await prisma.event.delete({
      where: { id },
    });
    res.status(204).send();
  } catch (error) {
    res.status(400).json({ message: "Failed to delete event", error });
  }
};
