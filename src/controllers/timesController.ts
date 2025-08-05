import { Request, Response } from "express";
import prisma from "../prisma/client";

export const getTimeEntryGroups = async (req: Request, res: Response) => {
  try {
    const { userId, role } = req.query;

    const whereClause =
      role === "admin"
        ? {}
        : {
            userId: String(userId),
          };

    const groups = await prisma.timeEntryGroup.findMany({
      where: {
        ...whereClause,
        status: "SUBMITTED", // Only submitted times
      },
      include: {
        user: { select: { name: true } },
        jobs: true,
      },
      orderBy: { date: "desc" },
    });

    res.json(groups);
  } catch (err) {
    console.error("Error fetching time entry groups:", err);
    res.status(500).json({ error: "Failed to fetch submitted time entries" });
  }
};
