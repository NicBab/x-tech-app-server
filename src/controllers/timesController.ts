import { Request, Response } from "express";
import prisma from "../prisma/client";
import { EntryStatus } from "@prisma/client";

/** Normalize any incoming status to the Prisma enum (defaults to DRAFT) */
const toEntryStatus = (s: unknown): EntryStatus => {
  if (typeof s === "string") {
    const up = s.toUpperCase();
    if (up === "SUBMITTED") return EntryStatus.SUBMITTED;
    return EntryStatus.DRAFT;
  }
  return (s as EntryStatus) ?? EntryStatus.DRAFT;
};

/** GET /times?userId=&role=&status= */
export const getTimeEntryGroups = async (req: Request, res: Response) => {
  try {
    const { userId, role, status } = req.query as {
      userId?: string;
      role?: string;
      status?: string;
    };

    const whereClause: any = {
      ...(role !== "admin" && userId ? { userId: String(userId) } : {}),
      ...(status ? { status: toEntryStatus(status) } : {}),
    };

    const groups = await prisma.timeEntryGroup.findMany({
      where: whereClause,
      include: { user: { select: { name: true } }, jobs: true },
      orderBy: { date: "desc" },
    });

    res.json(groups);
  } catch (err) {
    console.error("Error fetching time entry groups:", err);
    res.status(500).json({ error: "Failed to fetch time entries" });
  }
};

/** GET /times/:id */
export const getTimeEntryGroupById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const group = await prisma.timeEntryGroup.findUnique({
      where: { id },
      include: { user: { select: { name: true } }, jobs: true },
    });
    if (!group) return res.status(404).json({ error: "Not found" });
    res.json(group);
  } catch (err) {
    console.error("Error fetching time entry by id:", err);
    res.status(500).json({ error: "Failed to fetch time entry" });
  }
};

/**
 * POST /times
 * Create new or (if id provided) update existing DRAFT; also supports direct submit by sending status SUBMITTED
 */
export const upsertTimeEntryGroup = async (req: Request, res: Response) => {
  try {
    const {
      id,
      userId,
      date,
      weekEndingDate,
      status,
      notes,
      jobs,
    } = req.body as {
      id?: string;
      userId: string;
      date: string | Date;
      weekEndingDate: string | Date;
      status?: EntryStatus | "DRAFT" | "SUBMITTED";
      notes?: string | null;
      jobs: Array<{
        id?: string;
        jobNumber: string;
        hoursWorked: number;
        comments?: string;
        mileage?: number;
        extraExpenses?: string;
      }>;
    };

    if (!userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const statusEnum = toEntryStatus(status);

    // UPDATE existing (allowed only if still DRAFT; can also flip to SUBMITTED)
    if (id) {
      const existing = await prisma.timeEntryGroup.findUnique({
        where: { id },
        include: { jobs: true },
      });
      if (!existing) return res.status(404).json({ error: "Not found" });
      if (existing.status !== EntryStatus.DRAFT) {
        return res.status(409).json({ error: "Only DRAFT entries can be edited" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.timeEntryJob.deleteMany({ where: { groupId: id } });
        return tx.timeEntryGroup.update({
          where: { id },
          data: {
            userId,
            date: new Date(date),
            weekEndingDate: new Date(weekEndingDate),
            status: { set: statusEnum }, // enum-safe update
            notes: notes ?? null,
            jobs: {
              create: jobs.map((j) => ({
                jobNumber: j.jobNumber,
                hoursWorked: Number(j.hoursWorked ?? 0),
                comments: j.comments ?? null,
                mileage: j.mileage == null ? null : Number(j.mileage),
                extraExpenses: j.extraExpenses ?? null,
              })),
            },
          },
          include: { jobs: true, user: { select: { name: true } } },
        });
      });

      return res.status(200).json(updated);
    }

    // CREATE new
    const created = await prisma.timeEntryGroup.create({
      data: {
        userId,
        date: new Date(date),
        weekEndingDate: new Date(weekEndingDate),
        status: statusEnum, // enum-safe create
        notes: notes ?? null,
        jobs: {
          create: jobs.map((j) => ({
            jobNumber: j.jobNumber,
            hoursWorked: Number(j.hoursWorked ?? 0),
            comments: j.comments ?? null,
            mileage: j.mileage == null ? null : Number(j.mileage),
            extraExpenses: j.extraExpenses ?? null,
          })),
        },
      },
      include: { jobs: true, user: { select: { name: true } } },
    });

    return res.status(201).json(created);
  } catch (err) {
    console.error("Error upserting time entry:", err);
    return res.status(500).json({ error: "Failed to save time entry" });
  }
};

/** PATCH /times/:id  (edit an existing DRAFT) */
export const updateDraftTimeEntryGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, date, weekEndingDate, status, notes, jobs } = req.body as {
      userId: string;
      date: string | Date;
      weekEndingDate: string | Date;
      status?: EntryStatus | "DRAFT" | "SUBMITTED";
      notes?: string | null;
      jobs: Array<{
        jobNumber: string;
        hoursWorked: number;
        comments?: string;
        mileage?: number;
        extraExpenses?: string;
      }>;
    };

    if (!id || !userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const existing = await prisma.timeEntryGroup.findUnique({
      where: { id },
      include: { jobs: true },
    });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== EntryStatus.DRAFT) {
      return res.status(409).json({ error: "Only DRAFT entries can be edited" });
    }

    const statusEnum = toEntryStatus(status);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.timeEntryJob.deleteMany({ where: { groupId: id } });
      return tx.timeEntryGroup.update({
        where: { id },
        data: {
          userId,
          date: new Date(date),
          weekEndingDate: new Date(weekEndingDate),
          status: { set: statusEnum }, // enum-safe update
          notes: notes ?? null,
          jobs: {
            create: jobs.map((j) => ({
              jobNumber: j.jobNumber,
              hoursWorked: Number(j.hoursWorked ?? 0),
              comments: j.comments ?? null,
              mileage: j.mileage == null ? null : Number(j.mileage),
              extraExpenses: j.extraExpenses ?? null,
            })),
          },
        },
        include: { jobs: true, user: { select: { name: true } } },
      });
    });

    return res.status(200).json(updated);
  } catch (err) {
    console.error("Error updating draft time entry:", err);
    return res.status(500).json({ error: "Failed to update time entry" });
  }
};

/** PATCH /times/:id/submit  (DRAFT -> SUBMITTED) */
export const submitTimeEntryGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.timeEntryGroup.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (existing.status === EntryStatus.SUBMITTED) {
      return res.status(200).json(existing); // idempotent
    }

    const submitted = await prisma.timeEntryGroup.update({
      where: { id },
      data: { status: { set: EntryStatus.SUBMITTED } }, // enum-safe update
      include: { jobs: true, user: { select: { name: true } } },
    });

    return res.json(submitted);
  } catch (err) {
    console.error("Error submitting time entry:", err);
    return res.status(500).json({ error: "Failed to submit time entry" });
  }
};

/** DELETE /times/:id  (only if DRAFT) */
export const deleteDraftTimeEntryGroup = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.timeEntryGroup.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== EntryStatus.DRAFT) {
      return res.status(409).json({ error: "Only DRAFT entries can be deleted" });
    }

    await prisma.timeEntryGroup.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) {
    console.error("Error deleting draft:", err);
    return res.status(500).json({ error: "Failed to delete draft" });
  }
};
