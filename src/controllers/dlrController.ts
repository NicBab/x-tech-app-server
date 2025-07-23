// src/controllers/dlrController.ts
import { Request, Response } from "express";
import prisma from "../prisma/client";

// src/controllers/dlrController.ts
export const getDLRs = async (req: Request, res: Response) => {
  const search = req.query.search?.toString().toLowerCase();

  try {
    const dlrs = await prisma.dLR.findMany({
      where: search
        ? {
            OR: [
              { dlrNumber: { contains: search, mode: "insensitive" } },
              { jobNumber: { contains: search, mode: "insensitive" } },
              { customer: { contains: search, mode: "insensitive" } },
              { notes: { contains: search, mode: "insensitive" } },
              // 👇 You can't search by `user.name` without a nested relation.
              // If needed, you can `include: { user: true }` and filter manually.
            ],
          }
        : undefined,
      orderBy: { date: "desc" },
      include: {
        user: true, // to get employee name
        invoice: true,
        po: true,
      },
    });

    res.json(dlrs);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch DLRs" });
  }
};


// POST /dlrs
export const createDLR = async (req: Request, res: Response) => {
  const {
    dlrNumber,
    jobNumber,
    date,
    userId,
    customer,
    notes,
    status,
    totalHours,
    fuel,
    hotel,
    mileage,
    otherExpenses,
    fileUrl,
    signedUrl,
    invoiceId,
    poId,
  } = req.body;

  try {
    const newDLR = await prisma.dLR.create({
      data: {
        dlrNumber,
        jobNumber,
        date: new Date(date), // ensure Date object
        userId,
        customer,
        notes,
        status,
        totalHours,
        fuel,
        hotel,
        mileage,
        otherExpenses,
        fileUrl,
        signedUrl,
        invoiceId,
        poId,
      },
    });

    res.status(201).json(newDLR);
  } catch (err) {
    res.status(500).json({ error: "Failed to create DLR", details: err });
  }
};

