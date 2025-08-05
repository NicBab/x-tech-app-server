import { Request, Response } from "express";
import prisma from "../prisma/client";

export const getTimeEntryGroups = async (req: Request, res: Response) => {
  try {
    const { userId, role, status } = req.query;

    const whereClause: any = {
      ...(role !== "admin" && userId ? { userId: String(userId) } : {}),
      ...(status ? { status: status.toString().toUpperCase() } : {}),
    };

    const groups = await prisma.timeEntryGroup.findMany({
      where: whereClause,
      include: {
        user: { select: { name: true } },
        jobs: true,
      },
      orderBy: { date: "desc" },
    });

    res.json(groups);
  } catch (err) {
    console.error("Error fetching time entry groups:", err);
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
};
