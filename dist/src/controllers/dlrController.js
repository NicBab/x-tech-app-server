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
exports.createDLR = exports.getDLRs = void 0;
const client_1 = __importDefault(require("../prisma/client"));
// src/controllers/dlrController.ts
const getDLRs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const search = (_a = req.query.search) === null || _a === void 0 ? void 0 : _a.toString().toLowerCase();
    try {
        const dlrs = yield client_1.default.dLR.findMany({
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to fetch DLRs" });
    }
});
exports.getDLRs = getDLRs;
// POST /dlrs
const createDLR = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { dlrNumber, jobNumber, date, userId, customer, notes, status, totalHours, fuel, hotel, mileage, otherExpenses, fileUrl, signedUrl, invoiceId, poId, } = req.body;
    try {
        const newDLR = yield client_1.default.dLR.create({
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
    }
    catch (err) {
        res.status(500).json({ error: "Failed to create DLR", details: err });
    }
});
exports.createDLR = createDLR;
