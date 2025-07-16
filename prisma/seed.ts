import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
const prisma = new PrismaClient();

async function deleteAllData(orderedFileNames: string[]) {
  const modelNames = orderedFileNames.map((fileName) => {
    const modelName = path.basename(fileName, path.extname(fileName));
    return modelName.charAt(0).toUpperCase() + modelName.slice(1);
  });

  for (const modelName of modelNames) {
    const model: any = prisma[modelName as keyof typeof prisma];
    if (model) {
      await model.deleteMany({});
      console.log(`Cleared data from ${modelName}`);
    } else {
      console.error(
        `Model ${modelName} not found. Please ensure the model name is correctly specified.`
      );
    }
  }
}

async function main() {
  const dataDirectory = path.join(__dirname, "seedData");

  // Delete children first
  const deleteOrder = [
  "timeEntryJobs.json",
  "timeEntryGroups.json",
  "expenseByCategory.json",
  "expenseSummary.json",
  "expenses.json",
  "purchaseSummary.json",
  "purchases.json",
  "salesSummary.json",
  "sales.json",
  "dlrs.json",
  "invoices.json",
  "purchaseOrders.json",
  "users.json",
  "products.json", // last
];

  await deleteAllData(deleteOrder);

  // Then insert parents first
  const insertOrder = [
  "products.json",
  "users.json",
  "dlrs.json",
  "invoices.json",
  "purchaseOrders.json",
  "sales.json",
  "salesSummary.json",
  "purchases.json",
  "purchaseSummary.json",
  "expenses.json",
  "expenseSummary.json",
  "expenseByCategory.json",
  "timeEntryGroups.json",
  "timeEntryJobs.json"
];

  for (const fileName of insertOrder) {
    const filePath = path.join(dataDirectory, fileName);
    const jsonData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    const modelName = path.basename(fileName, path.extname(fileName));
    const model: any = prisma[modelName as keyof typeof prisma];

    if (!model) {
      console.error(`No Prisma model matches the file name: ${fileName}`);
      continue;
    }

    for (const data of jsonData) {
      await model.create({
        data,
      });
    }

    console.log(`Seeded ${modelName} with data from ${fileName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
