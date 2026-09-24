import { getDb, initDb } from "./client.js";
import {
  users,
  bills,
  transactions,
  mandates,
  reminders,
  auditLogs,
  approvals,
  tasks,
  agentEvents,
} from "./schema.js";
import { eq } from "drizzle-orm";

export async function resetDb() {
  console.log("🔄 Resetting database to clean demo state...");
  await initDb();
  const db = getDb();

  // Clear existing records in reverse foreign key order
  await db.delete(agentEvents).catch(() => {});
  await db.delete(auditLogs).catch(() => {});
  await db.delete(reminders).catch(() => {});
  await db.delete(mandates).catch(() => {});
  await db.delete(transactions).catch(() => {});
  await db.delete(approvals).catch(() => {});
  await db.delete(tasks).catch(() => {});
  await db.delete(bills).catch(() => {});
  await db.delete(users).catch(() => {});

  await seed();
  console.log("✓ Database reset to clean demo state!");
}

export async function seed() {
  console.log("🌱 Initializing and seeding Paytm TaskMate database...");
  await initDb();
  const db = getDb();

  const demoUserId = "demo-user-1";

  // 1. Seed Demo User
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.id, demoUserId));

  if (existingUser.length === 0) {
    await db.insert(users).values({
      id: demoUserId,
      name: "Aarendra Singh",
      phone: "+91 98765 43210",
      email: "aarendra.singh@example.com",
      availableBalance: 25000,
      transactionLimit: 10000,
    });
    console.log("✓ User Aarendra Singh seeded (Balance: ₹25,000, Limit: ₹10,000)");
  } else {
    // Reset balance and limit
    await db.update(users).set({
      availableBalance: 25000,
      transactionLimit: 10000,
    }).where(eq(users.id, demoUserId));
  }

  // 2. Seed Bills
  const initialBills = [
    {
      id: "bill-elec-1",
      userId: demoUserId,
      billerName: "Maharashtra Electricity",
      category: "electricity",
      accountNumber: "MSEB-98721456",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "PENDING",
    },
    {
      id: "bill-net-1",
      userId: demoUserId,
      billerName: "Airtel Broadband",
      category: "internet",
      accountNumber: "AIR-01928374",
      amount: 999,
      dueDate: "25 Sep 2026",
      status: "PENDING",
    },
    {
      id: "bill-mob-1",
      userId: demoUserId,
      billerName: "Jio Postpaid",
      category: "mobile",
      accountNumber: "JIO-9876543210",
      amount: 599,
      dueDate: "30 Sep 2026",
      status: "PENDING",
    },
    {
      id: "bill-water-1",
      userId: demoUserId,
      billerName: "Municipal Water Board",
      category: "water",
      accountNumber: "MWB-44556677",
      amount: 450,
      dueDate: "02 Oct 2026",
      status: "PENDING",
    },
  ];

  for (const bill of initialBills) {
    const existing = await db
      .select()
      .from(bills)
      .where(eq(bills.id, bill.id));
    if (existing.length === 0) {
      await db.insert(bills).values(bill);
    }
  }
  console.log("✓ Bills seeded (Electricity ₹2,450, Internet ₹999, Mobile ₹599, Water ₹450)");

  // 3. Seed Past Transactions
  const initialTransactions = [
    {
      id: "TXN-20260918-091",
      userId: demoUserId,
      idempotencyKey: "idem-seed-091",
      amount: 340,
      payee: "Swiggy Online",
      status: "SUCCESS",
      paymentMethod: "UPI",
      retryCount: 0,
      createdAt: new Date("2026-09-18T19:30:00Z"),
    },
    {
      id: "TXN-20260915-042",
      userId: demoUserId,
      idempotencyKey: "idem-seed-042",
      amount: 1850,
      payee: "D-Mart Supermarket",
      status: "SUCCESS",
      paymentMethod: "UPI",
      retryCount: 0,
      createdAt: new Date("2026-09-15T11:15:00Z"),
    },
    {
      id: "TXN-20260910-018",
      userId: demoUserId,
      idempotencyKey: "idem-seed-018",
      amount: 2000,
      payee: "Shell Petrol Pump",
      status: "SUCCESS",
      paymentMethod: "UPI",
      retryCount: 0,
      createdAt: new Date("2026-09-10T08:45:00Z"),
    },
    {
      id: "TXN-20260828-005",
      userId: demoUserId,
      idempotencyKey: "idem-seed-005",
      amount: 1950,
      payee: "Maharashtra Electricity (Aug)",
      status: "SUCCESS",
      paymentMethod: "UPI",
      retryCount: 0,
      createdAt: new Date("2026-08-28T14:20:00Z"),
    },
  ];

  for (const txn of initialTransactions) {
    const existing = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, txn.id));
    if (existing.length === 0) {
      await db.insert(transactions).values(txn);
    }
  }
  console.log("✓ Past transactions seeded");

  // 4. Seed Mandates / AutoPay
  const initialMandates = [
    {
      id: "mandate-spot-1",
      userId: demoUserId,
      billerName: "Spotify India",
      maxAmount: 119,
      frequency: "MONTHLY",
      nextExecutionDate: "05 Oct 2026",
      status: "ACTIVE",
    },
    {
      id: "mandate-netf-1",
      userId: demoUserId,
      billerName: "Netflix Entertainment",
      maxAmount: 499,
      frequency: "MONTHLY",
      nextExecutionDate: "12 Oct 2026",
      status: "ACTIVE",
    },
  ];

  for (const mandate of initialMandates) {
    const existing = await db
      .select()
      .from(mandates)
      .where(eq(mandates.id, mandate.id));
    if (existing.length === 0) {
      await db.insert(mandates).values(mandate);
    }
  }
  console.log("✓ Recurring payments / mandates seeded");

  // 5. Seed Reminders
  const initialReminders = [
    {
      id: "rem-1",
      userId: demoUserId,
      title: "HDFC Credit Card Bill",
      dueDate: "05 Oct 2026",
      remindBeforeDays: 3,
      status: "SCHEDULED",
    },
  ];

  for (const rem of initialReminders) {
    const existing = await db
      .select()
      .from(reminders)
      .where(eq(reminders.id, rem.id));
    if (existing.length === 0) {
      await db.insert(reminders).values(rem);
    }
  }
  console.log("✓ Reminders seeded");

  // 6. Seed initial audit log
  const existingLogs = await db.select().from(auditLogs);
  if (existingLogs.length === 0) {
    await db.insert(auditLogs).values({
      id: "audit-init-1",
      actor: "SYSTEM",
      action: "DATABASE_INITIALIZED",
      details: { environment: "development", seededUser: demoUserId },
      timestamp: new Date(),
    });
  }

  console.log("✨ Seed completed successfully!");
}

if (process.argv[1]?.endsWith("seed.ts") || process.argv[1]?.endsWith("seed.js")) {
  seed().catch((err) => {
    console.error("Failed to seed database:", err);
    process.exit(1);
  });
}
