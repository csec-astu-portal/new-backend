import { Request, Response } from "express";
import { prisma } from "../config/db";

export const createResource = async (req: Request, res: Response) => {
  try {
    const { name, url, type = "LINK", description, divisionId } = req.body;
    const userId = (req as any).user?.id;

    // ✅ Basic validation
    if (!name || !url || !divisionId) {
      return res
        .status(400)
        .json({ success: false, error: "Name and URL are required." });
    }

    if (divisionId) {
      const division = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!division) {
        return res
          .status(404)
          .json({ success: false, error: "Division not found." });
      }

      // ✅ Authorization: Only head of division can create resource under it
      if (division.headId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You are not authorized to add resources to this division.",
        });
      }
    }

    // ✅ Create resource
    const resource = await prisma.resource.create({
      data: {
        name,
        url,
        type,
        description: description || null,
        divisionId: divisionId || null,
        ownerId: userId || null,
      },
    });

    return res.status(201).json({ success: true, resource });
  } catch (error) {
    console.error("Create resource error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

export const getResourcesByDivision = async (req: Request, res: Response) => {
  try {
    const { divisionId } = req.params;
    const { page = "1", limit = "20", search = "", sort = "desc" } = req.query;

    if (!divisionId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid or missing divisionId." });
    }

    const division = await prisma.division.findUnique({
      where: { id: divisionId },
    });

    if (!division) {
      return res
        .status(404)
        .json({ success: false, error: "Division not found." });
    }

    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filters: any = {
      divisionId,
    };

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
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where: filters,
        include: {
          owner: {
            select: {
              id: true,
              freeName: true,
              email: true,
              lastName: true,
            },
          },
        },
        skip,
        take: limitNumber,
        orderBy: { createdAt: sort === "asc" ? "asc" : "desc" },
      }),
      prisma.resource.count({
        where: filters,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: resources,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get resources by division error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error." });
  }
};

export const getAllResources = async (req: Request, res: Response) => {
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
      ];
    }

    const [resources, total] = await Promise.all([
      prisma.resource.findMany({
        where: filters,
        include: {
          division: true,
          owner: true,
        },
        skip,
        take: limitNumber,
        orderBy: { createdAt: sort === "asc" ? "asc" : "desc" },
      }),
      prisma.resource.count({
        where: filters,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: resources,
      meta: {
        total,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(total / limitNumber),
      },
    });
  } catch (error) {
    console.error("Get all resources error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

export const deleteResource = async (req: Request, res: Response) => {
  try {
    const resourceId = req.params.id;
    const userId = (req as any).user?.id;

    if (!resourceId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid resource ID" });
    }

    const resource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        division: true,
        owner: true,
      },
    });

    if (!resource) {
      return res
        .status(404)
        .json({ success: false, error: "Resource not found" });
    }

    const division = resource.division;

    const isOwner = resource.ownerId === userId;
    const isDivisionHead = division?.headId === userId;

    if (!isOwner && !isDivisionHead) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to delete this resource",
      });
    }

    await prisma.resource.delete({ where: { id: resourceId } });

    return res
      .status(200)
      .json({ success: true, message: "Resource deleted successfully" });
  } catch (error) {
    console.error("Delete resource error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};

export const updateResource = async (req: Request, res: Response) => {
  try {
    const resourceId = req.params.id;
    const userId = (req as any).user?.id;

    const { name, url, type, description, divisionId } = req.body;

    if (!resourceId) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid resource ID" });
    }

    const existingResource = await prisma.resource.findUnique({
      where: { id: resourceId },
      include: {
        division: true,
        owner: true,
      },
    });

    if (!existingResource) {
      return res
        .status(404)
        .json({ success: false, error: "Resource not found" });
    }

    const isOwner = existingResource.ownerId === userId;
    const isDivisionHead = existingResource.division?.headId === userId;

    if (!isOwner && !isDivisionHead) {
      return res.status(403).json({
        success: false,
        error: "You are not authorized to update this resource",
      });
    }

    if (divisionId && divisionId !== existingResource.divisionId) {
      const newDivision = await prisma.division.findUnique({
        where: { id: divisionId },
      });

      if (!newDivision) {
        return res
          .status(404)
          .json({ success: false, error: "New division not found" });
      }

      if (newDivision.headId !== userId) {
        return res.status(403).json({
          success: false,
          error: "You can only assign the resource to divisions you lead",
        });
      }
    }

    const updatedResource = await prisma.resource.update({
      where: { id: resourceId },
      data: {
        name,
        url,
        type,
        description,
        divisionId,
      },
    });

    return res.status(200).json({ success: true, data: updatedResource });
  } catch (error) {
    console.error("Update resource error:", error);
    return res
      .status(500)
      .json({ success: false, error: "Internal server error" });
  }
};
