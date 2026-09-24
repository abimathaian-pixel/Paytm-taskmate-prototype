import { describe, it, expect, beforeAll } from "vitest";
import { initDb, getDb, bills, approvals, users, tasks } from "@taskmate/db";
import {
  getBillTool,
  initiatePaymentTool,
  getTransactionsTool,
} from "@taskmate/tools";
import { eq } from "drizzle-orm";

describe("Payment Tools & Deterministic Gates", () => {
  beforeAll(async () => {
    await initDb();
    const db = getDb();

    // Ensure demo user exists
    const userRows = await db.select().from(users).where(eq(users.id, "demo-user-1"));
    if (userRows.length === 0) {
      await db.insert(users).values({
        id: "demo-user-1",
        name: "Aarendra Singh",
        phone: "+91 98765 43210",
        email: "aarendra.singh@example.com",
        availableBalance: 25000,
        transactionLimit: 10000,
      });
    }

    // Ensure electricity bill exists
    const billRows = await db.select().from(bills).where(eq(bills.id, "test-bill-elec"));
    if (billRows.length === 0) {
      await db.insert(bills).values({
        id: "test-bill-elec",
        userId: "demo-user-1",
        billerName: "Maharashtra Electricity",
        category: "electricity",
        accountNumber: "MSEB-TEST-01",
        amount: 2450,
        dueDate: "28 Sep 2026",
        status: "PENDING",
      });
    }

    // Ensure test task exists
    const taskRows = await db.select().from(tasks).where(eq(tasks.id, "test-task-1"));
    if (taskRows.length === 0) {
      await db.insert(tasks).values({
        id: "test-task-1",
        userId: "demo-user-1",
        title: "Test Task",
        status: "RUNNING",
        prompt: "Handle electricity bill",
      });
    }
  });

  it("retrieves verified bill data from database", async () => {
    const result = await getBillTool(
      { userId: "demo-user-1", category: "electricity" },
      { allowedScopes: ["READ_BILLS"] }
    );
    expect(result.found).toBe(true);
    expect(result.bill).toBeDefined();
    expect(result.bill?.amount).toBe(2450);
    expect(result.bill?.billerName).toBe("Maharashtra Electricity");
  });

  it("blocks payment without valid APPROVED approval status", async () => {
    const db = getDb();
    // Create pending approval
    await db.insert(approvals).values({
      id: "appr-pending-test",
      taskId: "test-task-1",
      billId: "test-bill-elec",
      billerName: "Maharashtra Electricity",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "PENDING", // Not approved yet!
      paymentMethod: "UPI",
    });

    await expect(
      initiatePaymentTool(
        {
          approvalId: "appr-pending-test",
          idempotencyKey: "test-idem-001",
          demoScenario: "SUCCESS",
        },
        { allowedScopes: ["INITIATE_PAYMENT"] }
      )
    ).rejects.toThrow(/Deterministic Approval Gate Violation/);
  });

  it("enforces transaction limit of ₹10,000", async () => {
    const db = getDb();
    // Insert an approved payment that exceeds limit (₹15,000)
    await db.insert(approvals).values({
      id: "appr-overlimit-test",
      taskId: "test-task-1",
      billId: "test-bill-elec",
      billerName: "Luxury Solar Project",
      amount: 15000,
      dueDate: "28 Sep 2026",
      status: "APPROVED",
      paymentMethod: "UPI",
    });

    await expect(
      initiatePaymentTool(
        {
          approvalId: "appr-overlimit-test",
          idempotencyKey: "test-idem-overlimit",
          demoScenario: "SUCCESS",
        },
        { allowedScopes: ["INITIATE_PAYMENT"] }
      )
    ).rejects.toThrow(/Transaction Limit Exceeded/);
  });

  it("successfully initiates payment and guarantees idempotency", async () => {
    const db = getDb();
    // Create approved approval
    await db.insert(approvals).values({
      id: "appr-approved-test",
      taskId: "test-task-1",
      billId: "test-bill-elec",
      billerName: "Maharashtra Electricity",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "APPROVED",
      paymentMethod: "UPI",
    });

    const idempotencyKey = "test-idem-unique-999";

    // 1st attempt: should succeed
    const res1 = await initiatePaymentTool(
      {
        approvalId: "appr-approved-test",
        idempotencyKey,
        demoScenario: "SUCCESS",
      },
      { allowedScopes: ["INITIATE_PAYMENT"] }
    );

    expect(res1.status).toBe("SUCCESS");
    expect(res1.amount).toBe(2450);

    // 2nd attempt with same idempotency key: should return the same transaction without duplicate debit
    const res2 = await initiatePaymentTool(
      {
        approvalId: "appr-approved-test",
        idempotencyKey,
        demoScenario: "SUCCESS",
      },
      { allowedScopes: ["INITIATE_PAYMENT"] }
    );

    expect(res2.transactionId).toBe(res1.transactionId);
    expect(res2.status).toBe("SUCCESS");
  });

  it("handles technical failure and 1-time retry policy with same idempotency key", async () => {
    const db = getDb();
    await db.insert(approvals).values({
      id: "appr-retry-test",
      taskId: "test-task-1",
      billId: "test-bill-elec",
      billerName: "Maharashtra Electricity",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "APPROVED",
      paymentMethod: "UPI",
    });

    const idempotencyKey = "test-idem-retry-777";

    // First attempt fails with technical error
    const firstAttempt = await initiatePaymentTool(
      {
        approvalId: "appr-retry-test",
        idempotencyKey,
        demoScenario: "TECHNICAL_FAILURE",
      },
      { allowedScopes: ["INITIATE_PAYMENT"] }
    );
    expect(firstAttempt.status).toBe("FAILED");
    expect(firstAttempt.failureReason).toContain("Gateway Timeout");

    // Retry with the SAME idempotency key recovers safely
    const retryAttempt = await initiatePaymentTool(
      {
        approvalId: "appr-retry-test",
        idempotencyKey,
      },
      { allowedScopes: ["INITIATE_PAYMENT"] }
    );
    expect(retryAttempt.status).toBe("SUCCESS");
    expect(retryAttempt.retryCount).toBe(1);
  });
});
