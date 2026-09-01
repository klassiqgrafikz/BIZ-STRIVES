import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding BIZ-STRIVES...");

  // Owner user
  const passwordHash = await bcrypt.hash("Klassiq123!", 10);
  const user = await prisma.user.upsert({
    where: { email: "owner@klassiqgrafikz.com" },
    update: {},
    create: {
      email: "owner@klassiqgrafikz.com",
      passwordHash,
      name: "Klassiq Owner",
      emailVerifiedAt: new Date(),
      timezone: "Africa/Lagos",
      dateFormat: "DD/MM/YYYY",
    },
  });

  // Business
  const business = await prisma.business.upsert({
    where: { slug: "klassiq-grafikz" },
    update: {},
    create: {
      slug: "klassiq-grafikz",
      name: "Klassiq Grafikz",
      email: "hello@klassiqgrafikz.com",
      phone: "+234 800 000 0000",
      address: "Lagos, Nigeria",
      description: "Creative agency — branding, web, graphics & photography",
      timezone: "Africa/Lagos",
      baseCurrency: "NGN",
      currencySymbol: "₦",
      dateFormat: "DD/MM/YYYY",
    },
  });

  await prisma.businessMember.upsert({
    where: { userId_businessId: { userId: user.id, businessId: business.id } },
    update: {},
    create: { userId: user.id, businessId: business.id, role: "Owner" },
  });

  // Categories per Phase 5 spec
  const incomeCats = ["Website Development","Graphic Design","Branding","Video Editing","Photography","Consulting","Other Services","Other Income"];
  const expenseCats = ["Internet","Hosting","Domain","Software","Advertising","Equipment","Transport","Electricity","Office","Communication","Maintenance","Other"];
  const personalCats = ["Food","Transport","Shopping","Family","Entertainment","Bills","Personal","Other"];

  for (const name of incomeCats) {
    await prisma.category.upsert({
      where: { businessId_type_name: { businessId: business.id, type: "INCOME", name } },
      update: {},
      create: { businessId: business.id, type: "INCOME", name, isSystem: true },
    });
  }
  for (const name of expenseCats) {
    await prisma.category.upsert({
      where: { businessId_type_name: { businessId: business.id, type: "BUSINESS_EXPENSE", name } },
      update: {},
      create: { businessId: business.id, type: "BUSINESS_EXPENSE", name, isSystem: true },
    });
  }
  for (const name of personalCats) {
    await prisma.category.upsert({
      where: { businessId_type_name: { businessId: business.id, type: "PERSONAL_SPENDING", name } },
      update: {},
      create: { businessId: business.id, type: "PERSONAL_SPENDING", name, isSystem: true },
    });
  }

  // Accounts per Phase 3
  const accounts = [
    { name: "GTBank", type: "Bank" as const, currency: "NGN", openingBalance: 50000 },
    { name: "OPay", type: "MobileMoney" as const, currency: "NGN", openingBalance: 20000 },
    { name: "Cash", type: "Cash" as const, currency: "NGN", openingBalance: 10000 },
    { name: "Business Savings", type: "Savings" as const, currency: "NGN", openingBalance: 0 },
  ];
  for (const a of accounts) {
    await prisma.account.upsert({
      where: { businessId_name: { businessId: business.id, name: a.name } },
      update: {},
      create: { businessId: business.id, name: a.name, type: a.type, currency: a.currency, openingBalance: a.openingBalance, currentBalance: a.openingBalance },
    });
  }

  // Demo customer + project
  const customer = await prisma.customer.upsert({
    where: { id: "seed-customer-1" },
    update: {},
    create: {
      id: "seed-customer-1",
      businessId: business.id,
      fullName: "John Doe",
      email: "john@example.com",
      phone: "+234 801 234 5678",
      company: "Doe Enterprises",
      address: "Lagos, Nigeria",
      notes: "Seed customer",
    },
  }).catch(async () => {
    return await prisma.customer.create({
      data: { businessId: business.id, fullName: "John Doe", email: "john@example.com", phone: "+234 801 234 5678", company: "Doe Enterprises", address: "Lagos" },
    });
  });

  // Savings goal
  await prisma.savingsGoal.upsert({
    where: { businessId_name: { businessId: business.id, name: "Emergency Fund" } },
    update: {},
    create: { businessId: business.id, name: "Emergency Fund", targetAmount: 500000, currentAmount: 0, currency: "NGN", frequency: "Monthly" },
  });

  console.log("Seed complete:", { user: user.email, business: business.name });
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
