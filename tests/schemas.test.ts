import { describe, it, expect } from "vitest";
import {
  UserSchema,
  BillSchema,
  TransactionSchema,
  TaskSchema,
  ApprovalSchema,
  PaymentSchema,
  MandateSchema,
  ReminderSchema,
  AuditLogSchema,
  AgentEventSchema,
  PaymentStatusEnum,
  InitiatePaymentInputSchema,
  MockAuthenticateSchema,
} from "./packages/shared/src/index.js";

describe("Zod Schemas Verification", () => {
  it("validates UserSchema", () => {
    const validUser = {
      id: "demo-user-1",
      name: "Aarendra Singh",
      phone: "+91 98765 43210",
      email: "aarendra.singh@example.com",
      availableBalance: 25000,
      transactionLimit: 10000,
      createdAt: new Date().toISOString(),
    };
    expect(() => UserSchema.parse(validUser)).not.toThrow();

    // Negative balance check
    expect(() =>
      UserSchema.parse({ ...validUser, availableBalance: -100 })
    ).toThrow();
  });

  it("validates BillSchema", () => {
    const validBill = {
      id: "bill-elec-1",
      userId: "demo-user-1",
      billerName: "Maharashtra Electricity",
      category: "electricity",
      accountNumber: "MSEB-98721456",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    expect(() => BillSchema.parse(validBill)).not.toThrow();

    // Invalid category check
    expect(() =>
      BillSchema.parse({ ...validBill, category: "crypto_mining" })
    ).toThrow();
  });

  it("validates TransactionSchema and PaymentStatus", () => {
    const validTxn = {
      id: "TXN-20260922-001",
      userId: "demo-user-1",
      idempotencyKey: "idem-12345",
      amount: 2450,
      payee: "Maharashtra Electricity",
      status: "SUCCESS",
      paymentMethod: "UPI",
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    expect(() => TransactionSchema.parse(validTxn)).not.toThrow();

    expect(PaymentStatusEnum.options).toEqual([
      "SUCCESS",
      "PENDING",
      "FAILED",
      "INSUFFICIENT_BALANCE",
      "UNKNOWN",
    ]);
  });

  it("validates TaskSchema & ApprovalSchema", () => {
    const task = {
      id: "task-1",
      userId: "demo-user-1",
      title: "Handle electricity bill",
      status: "RUNNING",
      prompt: "Handle my electricity bill",
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(() => TaskSchema.parse(task)).not.toThrow();

    const approval = {
      id: "appr-1",
      taskId: "task-1",
      billId: "bill-elec-1",
      billerName: "Maharashtra Electricity",
      amount: 2450,
      dueDate: "28 Sep 2026",
      status: "PENDING",
      paymentMethod: "UPI",
      createdAt: new Date().toISOString(),
    };
    expect(() => ApprovalSchema.parse(approval)).not.toThrow();
  });

  it("validates MockAuthenticateSchema rejects invalid PINs", () => {
    // Valid 4-digit PIN
    expect(() =>
      MockAuthenticateSchema.parse({
        pin: "1234",
        approvalId: "appr-1",
        taskId: "task-1",
      })
    ).not.toThrow();

    // Reject non-4-digit
    expect(() =>
      MockAuthenticateSchema.parse({
        pin: "12",
        approvalId: "appr-1",
        taskId: "task-1",
      })
    ).toThrow();

    // Reject non-digits
    expect(() =>
      MockAuthenticateSchema.parse({
        pin: "abcd",
        approvalId: "appr-1",
        taskId: "task-1",
      })
    ).toThrow();
  });
});
