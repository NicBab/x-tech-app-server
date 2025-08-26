"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteDraftDLR = exports.submitDLR = exports.updateDLR = exports.createDLR = exports.getDLRById = exports.getDLRs = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
/** Normalize any incoming status to the Prisma enum (defaults to DRAFT) */
const toDLRStatus = (s) => {
    if (typeof s === "string") {
        const up = s.toUpperCase();
        if (Object.values(client_2.DLRStatus).includes(up))
            return up;
    }
    return client_2.DLRStatus.DRAFT;
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
// in dlrController.ts, replace getDLRs with:
const getDLRs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { search, userId, role, status } = req.query;
    try {
        const term = search === null || search === void 0 ? void 0 : search.toString().trim();
        const roleIsAdmin = role === "admin";
        const statusEnum = typeof status === "string" && Object.values(client_2.DLRStatus).includes(status.toUpperCase())
            ? status.toUpperCase()
            : undefined;
        const where = {};
        if (roleIsAdmin) {
            // Admin: never return drafts
            where.status = statusEnum && statusEnum !== client_2.DLRStatus.DRAFT ? statusEnum : { not: client_2.DLRStatus.DRAFT };
        }
        else {
            if (!userId)
                return res.status(400).json({ error: "userId is required for employee queries." });
            where.userId = String(userId);
            if (statusEnum)
                where.status = statusEnum;
        }
        if (term) {
            where.OR = [
                { dlrNumber: { contains: term, mode: "insensitive" } },
                { jobNumber: { contains: term, mode: "insensitive" } },
                { customer: { contains: term, mode: "insensitive" } },
                { notes: { contains: term, mode: "insensitive" } },
            ];
        }
        const dlrs = yield client_1.default.dLR.findMany({
            where,
            orderBy: { date: "desc" },
            include: { user: true, invoice: true, po: true },
        });
        res.json(dlrs);
    }
    catch (err) {
        console.error("GET /dlrs error", err);
        res.status(500).json({ error: "Failed to fetch DLRs" });
    }
});
exports.getDLRs = getDLRs;
/** GET /dlrs/:id */
const getDLRById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const row = yield client_1.default.dLR.findUnique({
            where: { dlrId: req.params.id },
            include: {
                user: true,
                invoice: true,
                po: true,
            },
        });
        if (!row)
            return res.status(404).json({ error: "Not found" });
        res.json(row);
    }
    catch (e) {
        console.error("GET /dlrs/:id error", e);
        res.status(500).json({ error: "Failed to fetch DLR" });
    }
});
exports.getDLRById = getDLRById;
/** POST /dlrs — create new (Save Draft or Submit new) */
const createDLR = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { dlrNumber, jobNumber, date, userId, customer, notes, status, // "DRAFT" | "PENDING" | ...
        totalHours, // drafts can send 0
        fuel, hotel, mileage, otherExpenses, fileUrl, signedUrl, invoiceId, poId, } = req.body;
        // Basic required fields
        if (!jobNumber || !date || !userId) {
            return res.status(400).json({ error: "Missing required fields: jobNumber, date, userId" });
        }
        // Ensure user exists (avoid FK error P2003)
        const user = yield client_1.default.users.findUnique({ where: { userId } });
        if (!user) {
            return res.status(400).json({ error: `Invalid userId: ${userId}` });
        }
        const statusEnum = toDLRStatus(status);
        const cust = (customer !== null && customer !== void 0 ? customer : "").trim();
        // Enforce customer only when not draft
        if (statusEnum !== client_2.DLRStatus.DRAFT && !cust) {
            return res.status(400).json({ error: "Customer is required to submit a DLR" });
        }
        // Normalize numbers
        const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
        // Accept JSON string or object for otherExpenses
        const otherExpStr = typeof otherExpenses === "string"
            ? otherExpenses
            : otherExpenses
                ? JSON.stringify(otherExpenses)
                : null;
        const created = yield client_1.default.dLR.create({
            data: {
                dlrNumber: (dlrNumber === null || dlrNumber === void 0 ? void 0 : dlrNumber.trim()) || genDLRNumber(),
                jobNumber: jobNumber.trim(),
                date: new Date(date),
                userId,
                customer: cust, // empty string OK for drafts (non-null column)
                notes: notes !== null && notes !== void 0 ? notes : null,
                status: statusEnum,
                totalHours: Number(totalHours !== null && totalHours !== void 0 ? totalHours : 0),
                fuel: numOrNull(fuel),
                hotel: numOrNull(hotel),
                mileage: numOrNull(mileage),
                otherExpenses: otherExpStr,
                fileUrl: fileUrl !== null && fileUrl !== void 0 ? fileUrl : null,
                signedUrl: signedUrl !== null && signedUrl !== void 0 ? signedUrl : null,
                invoiceId: invoiceId !== null && invoiceId !== void 0 ? invoiceId : null,
                poId: poId !== null && poId !== void 0 ? poId : null,
            },
            include: { user: true, invoice: true, po: true },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        // Surface Prisma errors clearly to the client/toast
        if (err instanceof client_2.Prisma.PrismaClientKnownRequestError) {
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
});
exports.createDLR = createDLR;
/** PATCH /dlrs/:id — edit existing DRAFT (can remain DRAFT or become PENDING) */
const updateDLR = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const existing = yield client_1.default.dLR.findUnique({ where: { dlrId: id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status !== client_2.DLRStatus.DRAFT) {
            return res.status(409).json({ error: "Only DRAFT can be edited" });
        }
        const { dlrNumber, jobNumber, date, userId, customer, notes, status, totalHours, fuel, hotel, mileage, otherExpenses, fileUrl, signedUrl, invoiceId, poId, } = req.body;
        const statusEnum = toDLRStatus(status);
        const cust = customer !== undefined ? String(customer).trim() : existing.customer;
        // If editing into non-draft, enforce required fields
        const nextHours = Number((_a = totalHours !== null && totalHours !== void 0 ? totalHours : existing.totalHours) !== null && _a !== void 0 ? _a : 0);
        if (statusEnum !== client_2.DLRStatus.DRAFT) {
            if (!cust)
                return res.status(400).json({ error: "Customer is required to submit a DLR" });
            if (nextHours <= 0) {
                return res.status(400).json({ error: "totalHours must be > 0 to submit" });
            }
        }
        const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
        const otherExpStr = typeof otherExpenses === "string"
            ? otherExpenses
            : otherExpenses
                ? JSON.stringify(otherExpenses)
                : null;
        const updated = yield client_1.default.dLR.update({
            where: { dlrId: id },
            data: {
                dlrNumber: dlrNumber || existing.dlrNumber,
                jobNumber: jobNumber !== null && jobNumber !== void 0 ? jobNumber : existing.jobNumber,
                date: date ? new Date(date) : existing.date,
                userId: userId !== null && userId !== void 0 ? userId : existing.userId,
                customer: cust,
                notes: notes !== null && notes !== void 0 ? notes : null,
                status: { set: statusEnum },
                totalHours: nextHours,
                fuel: numOrNull(fuel),
                hotel: numOrNull(hotel),
                mileage: numOrNull(mileage),
                otherExpenses: otherExpStr,
                fileUrl: fileUrl !== null && fileUrl !== void 0 ? fileUrl : null,
                signedUrl: signedUrl !== null && signedUrl !== void 0 ? signedUrl : null,
                invoiceId: invoiceId !== null && invoiceId !== void 0 ? invoiceId : null,
                poId: poId !== null && poId !== void 0 ? poId : null,
            },
            include: {
                user: true,
                invoice: true,
                po: true,
            },
        });
        res.json(updated);
    }
    catch (e) {
        console.error("PATCH /dlrs/:id error", e);
        res.status(500).json({ error: "Failed to update DLR" });
    }
});
exports.updateDLR = updateDLR;
/** PATCH /dlrs/:id/submit — DRAFT -> PENDING (basic validation) */
const submitDLR = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id } = req.params;
        const existing = yield client_1.default.dLR.findUnique({ where: { dlrId: id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (!existing.customer || existing.customer.trim() === "") {
            return res.status(400).json({ error: "Customer is required to submit a DLR" });
        }
        if (((_a = existing.totalHours) !== null && _a !== void 0 ? _a : 0) <= 0) {
            return res.status(400).json({ error: "totalHours must be > 0 to submit" });
        }
        if (existing.status === client_2.DLRStatus.PENDING) {
            return res.status(200).json(existing); // idempotent
        }
        const submitted = yield client_1.default.dLR.update({
            where: { dlrId: id },
            data: { status: { set: client_2.DLRStatus.PENDING } },
            include: { user: true, invoice: true, po: true },
        });
        res.json(submitted);
    }
    catch (e) {
        console.error("PATCH /dlrs/:id/submit error", e);
        res.status(500).json({ error: "Failed to submit DLR" });
    }
});
exports.submitDLR = submitDLR;
/** DELETE /dlrs/:id — only if DRAFT */
const deleteDraftDLR = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield client_1.default.dLR.findUnique({ where: { dlrId: id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status !== client_2.DLRStatus.DRAFT) {
            return res.status(409).json({ error: "Only DRAFT can be deleted" });
        }
        yield client_1.default.dLR.delete({ where: { dlrId: id } });
        res.status(204).send();
    }
    catch (e) {
        console.error("DELETE /dlrs/:id error", e);
        res.status(500).json({ error: "Failed to delete DLR" });
    }
});
exports.deleteDraftDLR = deleteDraftDLR;
