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
exports.resubmitTimeEntryGroup = exports.deleteDraftTimeEntryGroup = exports.submitTimeEntryGroup = exports.updateDraftTimeEntryGroup = exports.upsertTimeEntryGroup = exports.getTimeEntryGroupById = exports.getTimeEntryGroups = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
/** Normalize any incoming status to the Prisma enum (defaults to DRAFT) */
const toEntryStatus = (s) => {
    var _a;
    if (typeof s === "string") {
        const up = s.toUpperCase();
        if (up === "SUBMITTED")
            return client_2.EntryStatus.SUBMITTED;
        return client_2.EntryStatus.DRAFT;
    }
    return (_a = s) !== null && _a !== void 0 ? _a : client_2.EntryStatus.DRAFT;
};
const numOrNull = (v) => (v === "" || v == null ? null : Number(v));
/********************************************************************************************** */
/** GET /times?userId=&role=&status= */
const getTimeEntryGroups = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, role, status } = req.query;
        const whereClause = Object.assign(Object.assign({}, (role !== "admin" && userId ? { userId: String(userId) } : {})), (status ? { status: toEntryStatus(status) } : {}));
        const groups = yield client_1.default.timeEntryGroup.findMany({
            where: whereClause,
            include: { user: { select: { name: true } }, jobs: true },
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
/********************************************************************************************** */
/** GET /times/:id */
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
/********************************************************************************************** */
/**
 * POST /times
 * Create new or (if id provided) update existing DRAFT; also supports direct submit by sending status SUBMITTED
 */
const upsertTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id, userId, date, weekEndingDate, status, notes, jobs, } = req.body;
        if (!userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const statusEnum = toEntryStatus(status);
        /********************************* */
        // UPDATE existing (allowed only if still DRAFT; can also flip to SUBMITTED)
        if (id) {
            const existing = yield client_1.default.timeEntryGroup.findUnique({
                where: { id },
                include: { jobs: true },
            });
            if (!existing)
                return res.status(404).json({ error: "Not found" });
            if (existing.status !== client_2.EntryStatus.DRAFT) {
                return res.status(409).json({ error: "Only DRAFT entries can be edited" });
            }
            const updated = yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
                yield tx.timeEntryJob.deleteMany({ where: { groupId: id } });
                return tx.timeEntryGroup.update({
                    where: { id },
                    data: {
                        userId,
                        date: new Date(date),
                        weekEndingDate: new Date(weekEndingDate),
                        status: { set: statusEnum }, // enum-safe update
                        notes: notes !== null && notes !== void 0 ? notes : null,
                        jobs: {
                            create: jobs.map((j) => {
                                var _a, _b, _c;
                                return ({
                                    jobNumber: j.jobNumber,
                                    hoursWorked: Number((_a = j.hoursWorked) !== null && _a !== void 0 ? _a : 0),
                                    comments: (_b = j.comments) !== null && _b !== void 0 ? _b : null,
                                    mileage: numOrNull(j.mileage),
                                    extraExpenses: (_c = j.extraExpenses) !== null && _c !== void 0 ? _c : null,
                                });
                            }),
                        },
                    },
                    include: { jobs: true, user: { select: { name: true } } },
                });
            }));
            return res.status(200).json(updated);
        }
        /********************************************************************************************** */
        // CREATE new
        const created = yield client_1.default.timeEntryGroup.create({
            data: {
                userId,
                date: new Date(date),
                weekEndingDate: new Date(weekEndingDate),
                status: statusEnum, // enum-safe create
                notes: notes !== null && notes !== void 0 ? notes : null,
                jobs: {
                    create: jobs.map((j) => {
                        var _a, _b, _c;
                        return ({
                            jobNumber: j.jobNumber,
                            hoursWorked: Number((_a = j.hoursWorked) !== null && _a !== void 0 ? _a : 0),
                            comments: (_b = j.comments) !== null && _b !== void 0 ? _b : null,
                            mileage: numOrNull(j.mileage),
                            extraExpenses: (_c = j.extraExpenses) !== null && _c !== void 0 ? _c : null,
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
/********************************************************************************************** */
/** PATCH /times/:id  (edit an existing DRAFT) */
const updateDraftTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { userId, date, weekEndingDate, status, notes, jobs } = req.body;
        if (!id || !userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const existing = yield client_1.default.timeEntryGroup.findUnique({
            where: { id },
            include: { jobs: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status !== client_2.EntryStatus.DRAFT) {
            return res.status(409).json({ error: "Only DRAFT entries can be edited" });
        }
        const statusEnum = toEntryStatus(status);
        const updated = yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            yield tx.timeEntryJob.deleteMany({ where: { groupId: id } });
            return tx.timeEntryGroup.update({
                where: { id },
                data: {
                    userId,
                    date: new Date(date),
                    weekEndingDate: new Date(weekEndingDate),
                    status: { set: statusEnum }, // enum-safe update
                    notes: notes !== null && notes !== void 0 ? notes : null,
                    jobs: {
                        create: jobs.map((j) => {
                            var _a, _b, _c;
                            return ({
                                jobNumber: j.jobNumber,
                                hoursWorked: Number((_a = j.hoursWorked) !== null && _a !== void 0 ? _a : 0),
                                comments: (_b = j.comments) !== null && _b !== void 0 ? _b : null,
                                mileage: numOrNull(j.mileage),
                                extraExpenses: (_c = j.extraExpenses) !== null && _c !== void 0 ? _c : null,
                            });
                        }),
                    },
                },
                include: { jobs: true, user: { select: { name: true } } },
            });
        }));
        return res.status(200).json(updated);
    }
    catch (err) {
        console.error("Error updating draft time entry:", err);
        return res.status(500).json({ error: "Failed to update time entry" });
    }
});
exports.updateDraftTimeEntryGroup = updateDraftTimeEntryGroup;
/********************************************************************************************** */
/** PATCH /times/:id/submit  (DRAFT -> SUBMITTED) */
const submitTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield client_1.default.timeEntryGroup.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status === client_2.EntryStatus.SUBMITTED) {
            return res.status(200).json(existing); // idempotent
        }
        const submitted = yield client_1.default.timeEntryGroup.update({
            where: { id },
            data: { status: { set: client_2.EntryStatus.SUBMITTED } }, // enum-safe update
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
/********************************************************************************************** */
/** DELETE /times/:id  (only if DRAFT) */
const deleteDraftTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const existing = yield client_1.default.timeEntryGroup.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        if (existing.status !== client_2.EntryStatus.DRAFT) {
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
/********************************************************************************************** */
/**
 * POST /times/:id/resubmit
 * For an existing SUBMITTED entry, replace it with a NEW SUBMITTED entry built from request payload.
 * (Deletes the old group and its jobs, then creates a fresh group.)
 */
const resubmitTimeEntryGroup = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { userId, date, weekEndingDate, notes, jobs, } = req.body;
        // find existing
        const existing = yield client_1.default.timeEntryGroup.findUnique({
            where: { id },
            include: { jobs: true },
        });
        if (!existing)
            return res.status(404).json({ error: "Not found" });
        // only allow resubmit for previously SUBMITTED entries
        if (existing.status !== client_2.EntryStatus.SUBMITTED) {
            return res
                .status(409)
                .json({ error: "Only SUBMITTED entries can be re-submitted (replaced)" });
        }
        if (!userId || !date || !weekEndingDate || !Array.isArray(jobs)) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        const created = yield client_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // delete old record (and its jobs)
            yield tx.timeEntryJob.deleteMany({ where: { groupId: id } });
            yield tx.timeEntryGroup.delete({ where: { id } });
            // create a brand-new SUBMITTED group with the edited data
            const newGroup = yield tx.timeEntryGroup.create({
                data: {
                    userId,
                    date: new Date(date),
                    weekEndingDate: new Date(weekEndingDate),
                    status: client_2.EntryStatus.SUBMITTED,
                    notes: notes !== null && notes !== void 0 ? notes : null,
                    jobs: {
                        create: jobs.map((j) => {
                            var _a, _b, _c;
                            return ({
                                jobNumber: j.jobNumber,
                                hoursWorked: Number((_a = j.hoursWorked) !== null && _a !== void 0 ? _a : 0),
                                comments: (_b = j.comments) !== null && _b !== void 0 ? _b : null,
                                mileage: numOrNull(j.mileage),
                                extraExpenses: (_c = j.extraExpenses) !== null && _c !== void 0 ? _c : null,
                            });
                        }),
                    },
                },
                include: { jobs: true, user: { select: { name: true } } },
            });
            return newGroup;
        }));
        return res.status(201).json(created);
    }
    catch (err) {
        console.error("Error resubmitting time entry:", err);
        return res.status(500).json({ error: "Failed to re-submit time entry" });
    }
});
exports.resubmitTimeEntryGroup = resubmitTimeEntryGroup;
