import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();
const seedDir = path.join(__dirname, "seedData");

async function load(file: string) {
  return JSON.parse(fs.readFileSync(path.join(seedDir, file), "utf-8"));
}

async function main() {
  // DELETE in FK-safe order
  await prisma.timeEntryJob.deleteMany();
  await prisma.timeEntryGroup.deleteMany();
  await prisma.expenseByCategory.deleteMany();
  await prisma.expenseSummary.deleteMany();
  await prisma.expenses.deleteMany();
  await prisma.purchaseSummary.deleteMany();
  await prisma.purchases.deleteMany();
  await prisma.salesSummary.deleteMany();
  await prisma.sales.deleteMany();
  await prisma.dLR.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.users.deleteMany();
  await prisma.products.deleteMany();

  console.log("All tables cleared");

  // INSERT in safe order (adjust filenames if needed)
  await prisma.users.createMany({ data: await load("users.json"), skipDuplicates: true });
  await prisma.invoice.createMany({ data: await load("invoice.json"), skipDuplicates: true });
  await prisma.purchaseOrder.createMany({ data: await load("purchaseOrder.json"), skipDuplicates: true });
  await prisma.timeEntryGroup.createMany({ data: await load("timeEntryGroup.json"), skipDuplicates: true });
  await prisma.timeEntryJob.createMany({ data: await load("timeEntryJob.json"), skipDuplicates: true });
  await prisma.dLR.createMany({ data: await load("dlr.json"), skipDuplicates: true });
  await prisma.products.createMany({ data: await load("products.json"), skipDuplicates: true });
  await prisma.sales.createMany({ data: await load("sales.json"), skipDuplicates: true });
  await prisma.salesSummary.createMany({ data: await load("salesSummary.json"), skipDuplicates: true });

  const products = await prisma.products.findMany({ select: { productId: true } });
  const productIdSet = new Set(products.map((p) => p.productId));
  const purchasesRaw = await load("purchases.json");
  const purchases = purchasesRaw.filter((p: any) => productIdSet.has(p.productId));

  await prisma.purchases.createMany({ data: purchases, skipDuplicates: true });
  await prisma.purchaseSummary.createMany({ data: await load("purchaseSummary.json"), skipDuplicates: true });
  await prisma.expenses.createMany({ data: await load("expenses.json"), skipDuplicates: true });
  await prisma.expenseSummary.createMany({ data: await load("expenseSummary.json"), skipDuplicates: true });
  await prisma.expenseByCategory.createMany({ data: await load("expenseByCategory.json"), skipDuplicates: true });

  console.log("Seeding complete");
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
  })
  .finally(() => prisma.$disconnect());
