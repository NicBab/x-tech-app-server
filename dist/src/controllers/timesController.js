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
exports.getTimeEntryGroupById = exports.deleteDraftTimeEntryGroup = exports.submitTimeEntryGroup = exports.upsertTimeEntryGroup = exports.getTimeEntryGroups = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const getTimeEntryGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role, status } = req.query;
        const whereClause = Object.assign(Object.assign({}, (role !== "admin" && userId ? { userId: String(userId) } : {})), (status ? { status: status.toString().toUpperCase() } : {}));
        const groups = yield client_1.default.timeEntryGroup.findMany({
            where: whereClause,
            include: {
                user: { select: { name: true } },
                jobs: true,
            },
            orderBy: { date: "desc" },
        });
        res.json(groups);
    }
    catch (err) {
        console.error("Error fetching time entry groups:", err);
        res.status(500).json({ error: "Failed to fetch time entries" });
    }
});
exports.getTimeEntryGroups = getTimeEntryGroups;
/**
 * Create new or update existing DRAFT (also supports direct submit)
 */
const upsertTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, userId, date, weekEndingDate, status, // "DRAFT" | "SUBMITTED"
        notes, jobs, } = req.body;
        if (!userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // UPDATE existing (allowed only if still DRAFT; can also flip to SUBMITTED)
        if (id) {
            const existing = yield client_1.default.timeEntryGroup.findUnique({
                where: { id },
                include: { jobs: true },
            });
            if (!existing)
                return res.status(404).json({ error: "Not found" });
            if (existing.status !== "DRAFT") {
                return res.status(409).json({ error: "Only DRAFT entries can be edited" });
            }
            const updated = yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                yield tx.timeEntryJob.deleteMany({ where: { groupId: id } });
                const group = yield tx.timeEntryGroup.update({
                    where: { id },
                    data: {
                        userId,
                        date: new Date(date),
                        weekEndingDate: new Date(weekEndingDate),
                        status,
                        notes: notes !== null && notes !== void 0 ? notes : null,
                        jobs: {
                            create: jobs.map((j) => {
                                var _a, _b;
                                return ({
                                    jobNumber: j.jobNumber,
                                    hoursWorked: Number(j.hoursWorked || 0),
                                    comments: (_a = j.comments) !== null && _a !== void 0 ? _a : null,
                                    mileage: j.mileage == null ? null : Number(j.mileage),
                                    extraExpenses: (_b = j.extraExpenses) !== null && _b !== void 0 ? _b : null,
                                });
                            }),
                        },
                    },
                    include: { jobs: true, user: { select: { name: true } } },
                });
                return group;
            }));
            return res.status(200).json(updated);
        }
        // CREATE new
        const created = yield client_1.default.timeEntryGroup.create({
            data: {
                userId,
                date: new Date(date),
                weekEndingDate: new Date(weekEndingDate),
                status,
                notes: notes !== null && notes !== void 0 ? notes : null,
                jobs: {
                    create: jobs.map((j) => {
                        var _a, _b;
                        return ({
                            jobNumber: j.jobNumber,
                            hoursWorked: Number(j.hoursWorked || 0),
                            comments: (_a = j.comments) !== null && _a !== void 0 ? _a : null,
                            mileage: j.mileage == null ? null : Number(j.mileage),
                            extraExpenses: (_b = j.extraExpenses) !== null && _b !== void 0 ? _b : null,
                        });
                    }),
                },
            },
            include: { jobs: true, user: { select: { name: true } } },
        });
        return res.status(201).json(created);
    }
    catch (err) {
        console.error("Error upserting time entry:", err);
        return res.status(500).json({ error: "Failed to save time entry" });
    }
});
exports.upsertTimeEntryGroup = upsertTimeEntryGroup;
/**
 * Submit an existing draft (status -> SUBMITTED)
 */
const submitTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield client_1.default.timeEntryGroup.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status === "SUBMITTED") {
            return res.status(200).json(existing); // idempotent
        }
        const submitted = yield client_1.default.timeEntryGroup.update({
            where: { id },
            data: { status: "SUBMITTED" },
            include: { jobs: true, user: { select: { name: true } } },
        });
        return res.json(submitted);
    }
    catch (err) {
        console.error("Error submitting time entry:", err);
        return res.status(500).json({ error: "Failed to submit time entry" });
    }
});
exports.submitTimeEntryGroup = submitTimeEntryGroup;
/**
 * Delete a DRAFT
 */
const deleteDraftTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield client_1.default.timeEntryGroup.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status !== "DRAFT") {
            return res.status(409).json({ error: "Only DRAFT entries can be deleted" });
        }
        yield client_1.default.timeEntryGroup.delete({ where: { id } });
        return res.status(204).send();
    }
    catch (err) {
        console.error("Error deleting draft:", err);
        return res.status(500).json({ error: "Failed to delete draft" });
    }
});
exports.deleteDraftTimeEntryGroup = deleteDraftTimeEntryGroup;
const getTimeEntryGroupById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const group = yield client_1.default.timeEntryGroup.findUnique({
            where: { id },
            include: { user: { select: { name: true } }, jobs: true },
        });
        if (!group)
            return res.status(404).json({ error: "Not found" });
        res.json(group);
    }
    catch (err) {
        console.error("Error fetching time entry by id:", err);
        res.status(500).json({ error: "Failed to fetch time entry" });
    }
});
exports.getTimeEntryGroupById = getTimeEntryGroupById;
