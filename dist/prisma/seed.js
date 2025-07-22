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
const client_1 = require("@prisma/client");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const prisma = new client_1.PrismaClient();
const seedDir = path_1.default.join(__dirname, "seedData");
function load(file) {
    return __awaiter(this, void 0, void 0, function* () {
        return JSON.parse(fs_1.default.readFileSync(path_1.default.join(seedDir, file), "utf-8"));
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // DELETE in FK-safe order
        yield prisma.timeEntryJob.deleteMany();
        yield prisma.timeEntryGroup.deleteMany();
        yield prisma.expenseByCategory.deleteMany();
        yield prisma.expenseSummary.deleteMany();
        yield prisma.expenses.deleteMany();
        yield prisma.purchaseSummary.deleteMany();
        yield prisma.purchases.deleteMany();
        yield prisma.salesSummary.deleteMany();
        yield prisma.sales.deleteMany();
        yield prisma.dLR.deleteMany();
        yield prisma.purchaseOrder.deleteMany();
        yield prisma.invoice.deleteMany();
        yield prisma.users.deleteMany();
        yield prisma.products.deleteMany();
        console.log("All tables cleared");
        // INSERT in safe order (adjust filenames if needed)
        yield prisma.users.createMany({ data: yield load("users.json"), skipDuplicates: true });
        yield prisma.invoice.createMany({ data: yield load("invoice.json"), skipDuplicates: true });
        yield prisma.purchaseOrder.createMany({ data: yield load("purchaseOrder.json"), skipDuplicates: true });
        yield prisma.timeEntryGroup.createMany({ data: yield load("timeEntryGroup.json"), skipDuplicates: true });
        yield prisma.timeEntryJob.createMany({ data: yield load("timeEntryJob.json"), skipDuplicates: true });
        yield prisma.dLR.createMany({ data: yield load("dLR.json"), skipDuplicates: true });
        yield prisma.products.createMany({ data: yield load("products.json"), skipDuplicates: true });
        yield prisma.sales.createMany({ data: yield load("sales.json"), skipDuplicates: true });
        yield prisma.salesSummary.createMany({ data: yield load("salesSummary.json"), skipDuplicates: true });
        const products = yield prisma.products.findMany({ select: { productId: true } });
        const productIdSet = new Set(products.map((p) => p.productId));
        const purchasesRaw = yield load("purchases.json");
        const purchases = purchasesRaw.filter((p) => productIdSet.has(p.productId));
        yield prisma.purchases.createMany({ data: purchases, skipDuplicates: true });
        yield prisma.purchaseSummary.createMany({ data: yield load("purchaseSummary.json"), skipDuplicates: true });
        yield prisma.expenses.createMany({ data: yield load("expenses.json"), skipDuplicates: true });
        yield prisma.expenseSummary.createMany({ data: yield load("expenseSummary.json"), skipDuplicates: true });
        yield prisma.expenseByCategory.createMany({ data: yield load("expenseByCategory.json"), skipDuplicates: true });
        console.log("Seeding complete");
    });
}
main()
    .catch((err) => {
    console.error("Seed failed:", err);
})
    .finally(() => prisma.$disconnect());
