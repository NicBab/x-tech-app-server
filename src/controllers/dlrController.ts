// src/controllers/dlrController.ts
import { Request, Response } from "express";
import prisma from "../prisma/client";
import { DLRStatus, Prisma } from "@prisma/client";

/** Normalize any incoming status to the Prisma enum (defaults to DRAFT) */
const toDLRStatus = (s: unknown): DLRStatus => {
  if (typeof s === "string") {
    const up = s.toUpperCase();
    if ((Object.values(DLRStatus) as string[]).includes(up)) return up as DLRStatus;
  }
  return DLRStatus.DRAFT;
};

/** Simple dlrNumber generator if client doesn't supply one */
const genDLRNumber = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const n = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DLR-${y}${m}${dd}-${n}`;
};

/** GET /dlrs?search=&userId=&role=(admin|employee)&status= */
export const getDLRs = async (req: Request, res: Response) => {
  const { search, userId, role, status } = req.query as {
    search?: string;
    userId?: string;
    role?: "admin" | "employee";
    status?: string;
  };

  try {
    const term = search?.toString().trim();
    const where: any = {
      ...(role !== "admin" && userId ? { userId: String(userId) } : {}),
      ...(status ? { status: toDLRStatus(status) } : {}),
      ...(term
        ? {
            OR: [
              { dlrNumber: { contains: term, mode: "insensitive" } },
              { jobNumber: { contains: term, mode: "insensitive" } },
              { customer: { contains: term, mode: "insensitive" } },
              { notes: { contains: term, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const dlrs = await prisma.dLR.findMany({
      where,
      orderBy: { date: "desc" },
      include: {
        user: true,
        invoice: true,
        po: true,
      },
    });

    res.json(dlrs);
  } catch (err) {
    console.error("GET /dlrs error", err);
    res.status(500).json({ error: "Failed to fetch DLRs" });
  }
};

/** GET /dlrs/:id */
export const getDLRById = async (req: Request, res: Response) => {
  try {
    const row = await prisma.dLR.findUnique({
      where: { dlrId: req.params.id },
      include: {
        user: true,
        invoice: true,
        po: true,
      },
    });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(row);
  } catch (e) {
    console.error("GET /dlrs/:id error", e);
    res.status(500).json({ error: "Failed to fetch DLR" });
  }
};



/** POST /dlrs — create new (Save Draft or Submit new) */
export const createDLR = async (req: Request, res: Response) => {
  try {
    const {
      dlrNumber,
      jobNumber,
      date,
      userId,
      customer,
      notes,
      status,       // "DRAFT" | "PENDING" | ...
      totalHours,   // drafts can send 0
      fuel,
      hotel,
      mileage,
      otherExpenses,
      fileUrl,
      signedUrl,
      invoiceId,
      poId,
    } = req.body as {
      dlrNumber?: string;
      jobNumber: string;
      date: string | Date;
      userId: string;
      customer?: string;
      notes?: string | null;
      status?: string;
      totalHours?: number;
      fuel?: number | null;
      hotel?: number | null;
      mileage?: number | null;
      otherExpenses?: string | Record<string, number> | null;
      fileUrl?: string | null;
      signedUrl?: string | null;
      invoiceId?: string | null;
      poId?: string | null;
    };

    // Basic required fields
    if (!jobNumber || !date || !userId) {
      return res.status(400).json({ error: "Missing required fields: jobNumber, date, userId" });
    }

    // Ensure user exists (avoid FK error P2003)
    const user = await prisma.users.findUnique({ where: { userId } });
    if (!user) {
      return res.status(400).json({ error: `Invalid userId: ${userId}` });
    }

    const statusEnum = toDLRStatus(status);
    const cust = (customer ?? "").trim();

    // Enforce customer only when not draft
    if (statusEnum !== DLRStatus.DRAFT && !cust) {
      return res.status(400).json({ error: "Customer is required to submit a DLR" });
    }

    // Normalize numbers
    const numOrNull = (v: any) => (v === "" || v == null ? null : Number(v));

    // Accept JSON string or object for otherExpenses
    const otherExpStr =
      typeof otherExpenses === "string"
        ? otherExpenses
        : otherExpenses
        ? JSON.stringify(otherExpenses)
        : null;

    const created = await prisma.dLR.create({
      data: {
        dlrNumber: dlrNumber?.trim() || genDLRNumber(),
        jobNumber: jobNumber.trim(),
        date: new Date(date),
        userId,
        customer: cust, // empty string OK for drafts (non-null column)
        notes: notes ?? null,
        status: statusEnum,
        totalHours: Number(totalHours ?? 0),
        fuel: numOrNull(fuel),
        hotel: numOrNull(hotel),
        mileage: numOrNull(mileage),
        otherExpenses: otherExpStr,
        fileUrl: fileUrl ?? null,
        signedUrl: signedUrl ?? null,
        invoiceId: invoiceId ?? null,
        poId: poId ?? null,
      },
      include: { user: true, invoice: true, po: true },
    });

    return res.status(201).json(created);
  } catch (err: any) {
    // Surface Prisma errors clearly to the client/toast
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint failed
        return res.status(409).json({ error: "Duplicate DLR number" });
      }
      if (err.code === "P2003") {
        // FK constraint failed
        return res.status(400).json({ error: "Foreign key constraint failed (check userId/invoiceId/poId)" });
      }
      if (err.code === "P2025") {
        // Record not found
        return res.status(404).json({ error: "Related record not found" });
      }
    }
    console.error("POST /dlrs error", err);
    return res.status(500).json({ error: "Failed to create DLR" });
  }
};




/** PATCH /dlrs/:id — edit existing DRAFT (can remain DRAFT or become PENDING) */
export const updateDLR = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dLR.findUnique({ where: { dlrId: id } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== DLRStatus.DRAFT) {
      return res.status(409).json({ error: "Only DRAFT can be edited" });
    }

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
    } = req.body as any;

    const statusEnum = toDLRStatus(status);
    const cust = customer !== undefined ? String(customer).trim() : existing.customer;

    // If editing into non-draft, enforce required fields
    const nextHours = Number(totalHours ?? existing.totalHours ?? 0);
    if (statusEnum !== DLRStatus.DRAFT) {
      if (!cust) return res.status(400).json({ error: "Customer is required to submit a DLR" });
      if (nextHours <= 0) {
        return res.status(400).json({ error: "totalHours must be > 0 to submit" });
      }
    }

    const numOrNull = (v: any) => (v === "" || v == null ? null : Number(v));
    const otherExpStr =
      typeof otherExpenses === "string"
        ? otherExpenses
        : otherExpenses
        ? JSON.stringify(otherExpenses)
        : null;

    const updated = await prisma.dLR.update({
      where: { dlrId: id },
      data: {
        dlrNumber: dlrNumber || existing.dlrNumber,
        jobNumber: jobNumber ?? existing.jobNumber,
        date: date ? new Date(date) : existing.date,
        userId: userId ?? existing.userId,
        customer: cust,
        notes: notes ?? null,
        status: { set: statusEnum },
        totalHours: nextHours,
        fuel: numOrNull(fuel),
        hotel: numOrNull(hotel),
        mileage: numOrNull(mileage),
        otherExpenses: otherExpStr,
        fileUrl: fileUrl ?? null,
        signedUrl: signedUrl ?? null,
        invoiceId: invoiceId ?? null,
        poId: poId ?? null,
      },
      include: {
        user: true,
        invoice: true,
        po: true,
      },
    });

    res.json(updated);
  } catch (e) {
    console.error("PATCH /dlrs/:id error", e);
    res.status(500).json({ error: "Failed to update DLR" });
  }
};


/** PATCH /dlrs/:id/submit — DRAFT -> PENDING (basic validation) */
export const submitDLR = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dLR.findUnique({ where: { dlrId: id } });
    if (!existing) return res.status(404).json({ error: "Not found" });

    if (!existing.customer || existing.customer.trim() === "") {
      return res.status(400).json({ error: "Customer is required to submit a DLR" });
    }
    if ((existing.totalHours ?? 0) <= 0) {
      return res.status(400).json({ error: "totalHours must be > 0 to submit" });
    }
    if (existing.status === DLRStatus.PENDING) {
      return res.status(200).json(existing); // idempotent
    }

    const submitted = await prisma.dLR.update({
      where: { dlrId: id },
      data: { status: { set: DLRStatus.PENDING } },
      include: { user: true, invoice: true, po: true },
    });

    res.json(submitted);
  } catch (e) {
    console.error("PATCH /dlrs/:id/submit error", e);
    res.status(500).json({ error: "Failed to submit DLR" });
  }
};


/** DELETE /dlrs/:id — only if DRAFT */
export const deleteDraftDLR = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.dLR.findUnique({ where: { dlrId: id } });
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status !== DLRStatus.DRAFT) {
      return res.status(409).json({ error: "Only DRAFT can be deleted" });
    }

    await prisma.dLR.delete({ where: { dlrId: id } });
    res.status(204).send();
  } catch (e) {
    console.error("DELETE /dlrs/:id error", e);
    res.status(500).json({ error: "Failed to delete DLR" });
  }
};
