import { eq, desc, and } from "drizzle-orm";
import {
  getDb,
  bills,
  transactions,
  mandates,
  reminders,
  approvals,
  users,
} from "@taskmate/db";
import {
  GetBillInput,
  GetBillOutput,
  GetTransactionsInput,
  GetTransactionsOutput,
  FindRecurringPaymentsInput,
  FindRecurringPaymentsOutput,
  CreateReminderInput,
  CreateReminderOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  CheckPaymentStatusInput,
  CheckPaymentStatusOutput,
  TaskScope,
} from "@taskmate/shared";
import { verifyTaskScope, logAudit, PermissionError } from "./permissions.js";
import { processMockPayment, pollMockPaymentStatus } from "./payment-mock.js";
import { randomUUID } from "crypto";

export async function getBillTool(
  input: GetBillInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<GetBillOutput> {
  const scopes = options?.allowedScopes || ["READ_BILLS"];
  verifyTaskScope(scopes, "READ_BILLS");

  await logAudit({
    taskId: options?.taskId,
    actor: "TOOL",
    action: "get_bill()",
    details: { input },
  });

  const db = getDb();
  const conditions = [eq(bills.userId, input.userId)];

  if (input.category) {
    conditions.push(eq(bills.category, input.category));
  }

  const result = await db
    .select()
    .from(bills)
    .where(and(...conditions));

  if (result.length === 0) {
    return { bill: null, found: false };
  }

  const b = result[0];
  return {
    bill: {
      id: b.id,
      userId: b.userId,
      billerName: b.billerName,
      category: b.category as any,
      accountNumber: b.accountNumber,
      amount: b.amount,
      dueDate: b.dueDate,
      status: b.status as any,
      createdAt: b.createdAt.toISOString(),
    },
    found: true,
  };
}

export async function getTransactionsTool(
  input: GetTransactionsInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<GetTransactionsOutput> {
  const scopes = options?.allowedScopes || ["READ_TRANSACTIONS"];
  verifyTaskScope(scopes, "READ_TRANSACTIONS");

  await logAudit({
    taskId: options?.taskId,
    actor: "TOOL",
    action: "get_transactions()",
    details: { limit: input.limit },
  });

  const db = getDb();
  const txns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, input.userId))
    .orderBy(desc(transactions.createdAt))
    .limit(input.limit);

  return {
    transactions: txns.map((t: any) => ({
      id: t.id,
      userId: t.userId,
      billId: t.billId,
      taskId: t.taskId,
      approvalId: t.approvalId,
      idempotencyKey: t.idempotencyKey,
      amount: t.amount,
      payee: t.payee,
      status: t.status as any,
      paymentMethod: "UPI",
      failureReason: t.failureReason,
      retryCount: t.retryCount,
      createdAt: t.createdAt.toISOString ? t.createdAt.toISOString() : new Date(t.createdAt).toISOString(),
    })),
    total: txns.length,
  };
}

export async function findRecurringPaymentsTool(
  input: FindRecurringPaymentsInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<FindRecurringPaymentsOutput> {
  const scopes = options?.allowedScopes || ["READ_BILLS"];
  verifyTaskScope(scopes, "READ_BILLS");

  await logAudit({
    taskId: options?.taskId,
    actor: "TOOL",
    action: "find_recurring_payments()",
    details: { userId: input.userId },
  });

  const db = getDb();
  const rows = await db
    .select()
    .from(mandates)
    .where(eq(mandates.userId, input.userId));

  return {
    mandates: rows.map((m: any) => ({
      id: m.id,
      userId: m.userId,
      billId: m.billId,
      billerName: m.billerName,
      maxAmount: m.maxAmount,
      frequency: m.frequency as any,
      nextExecutionDate: m.nextExecutionDate,
      status: m.status as any,
      createdAt: m.createdAt.toISOString ? m.createdAt.toISOString() : new Date(m.createdAt).toISOString(),
    })),
    total: rows.length,
  };
}

export async function createReminderTool(
  input: CreateReminderInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<CreateReminderOutput> {
  const scopes = options?.allowedScopes || ["CREATE_REMINDER"];
  verifyTaskScope(scopes, "CREATE_REMINDER");

  const id = "rem-" + randomUUID().slice(0, 8);
  const db = getDb();

  await db.insert(reminders).values({
    id,
    userId: input.userId,
    billId: input.billId || null,
    title: input.title,
    dueDate: input.dueDate,
    remindBeforeDays: input.remindBeforeDays,
    status: "SCHEDULED",
  });

  await logAudit({
    taskId: options?.taskId,
    actor: "TOOL",
    action: "create_reminder()",
    details: { reminderId: id, title: input.title, dueDate: input.dueDate },
  });

  return {
    reminder: {
      id,
      userId: input.userId,
      billId: input.billId || null,
      title: input.title,
      dueDate: input.dueDate,
      remindBeforeDays: input.remindBeforeDays,
      status: "SCHEDULED",
      createdAt: new Date().toISOString(),
    },
    success: true,
  };
}

export async function initiatePaymentTool(
  input: InitiatePaymentInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<InitiatePaymentOutput> {
  const scopes = options?.allowedScopes || ["INITIATE_PAYMENT"];
  verifyTaskScope(scopes, "INITIATE_PAYMENT");

  const db = getDb();

  // 1. Verify Approval exists and is in APPROVED status
  const approvalRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, input.approvalId));

  if (approvalRows.length === 0) {
    throw new Error(`Invalid Approval: Approval with ID '${input.approvalId}' not found.`);
  }

  const approval = approvalRows[0];
  if (approval.status !== "APPROVED") {
    throw new Error(
      `Deterministic Approval Gate Violation: Approval '${input.approvalId}' status is '${approval.status}'. Payment requires status 'APPROVED'.`
    );
  }

  // 2. Fetch User to enforce transaction limits and check balance
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, "demo-user-1"));
  const user = userRows[0];

  const transactionLimit = user ? user.transactionLimit : 10000;
  if (approval.amount > transactionLimit) {
    await logAudit({
      taskId: options?.taskId,
      actor: "SYSTEM",
      action: "TRANSACTION_LIMIT_EXCEEDED",
      details: {
        approvalId: input.approvalId,
        amount: approval.amount,
        limit: transactionLimit,
      },
    });
    throw new Error(
      `Transaction Limit Exceeded: Bill amount ₹${approval.amount.toLocaleString(
        "en-IN"
      )} exceeds user limit of ₹${transactionLimit.toLocaleString(
        "en-IN"
      )}. Payment blocked.`
    );
  }

  // 3. Check for existing transaction with this idempotency key
  const existingTxn = await db
    .select()
    .from(transactions)
    .where(eq(transactions.idempotencyKey, input.idempotencyKey));

  if (existingTxn.length > 0) {
    const txn = existingTxn[0];
    // If it was already successful, return immediately without re-processing (idempotency guarantee)
    if (txn.status === "SUCCESS") {
      await logAudit({
        taskId: options?.taskId,
        actor: "SYSTEM",
        action: "IDEMPOTENT_PAYMENT_REPLAY",
        details: {
          idempotencyKey: input.idempotencyKey,
          transactionId: txn.id,
          amount: txn.amount,
        },
      });
      return {
        transactionId: txn.id,
        status: "SUCCESS",
        amount: txn.amount,
        payee: txn.payee,
        retryCount: txn.retryCount,
        idempotencyKey: txn.idempotencyKey,
      };
    }
  }

  // 4. Call Mock Payment Gateway
  const paymentResult = await processMockPayment({
    idempotencyKey: input.idempotencyKey,
    amount: approval.amount,
    payee: approval.billerName,
    demoScenario: input.demoScenario,
  });

  // 5. Update or insert transaction in database
  if (existingTxn.length > 0) {
    await db
      .update(transactions)
      .set({
        status: paymentResult.status,
        failureReason: paymentResult.failureReason || null,
        retryCount: paymentResult.retryCount,
      })
      .where(eq(transactions.idempotencyKey, input.idempotencyKey));
  } else {
    await db.insert(transactions).values({
      id: paymentResult.transactionId,
      userId: "demo-user-1",
      billId: approval.billId,
      taskId: options?.taskId || approval.taskId,
      approvalId: approval.id,
      idempotencyKey: input.idempotencyKey,
      amount: approval.amount,
      payee: approval.billerName,
      status: paymentResult.status,
      paymentMethod: "UPI",
      failureReason: paymentResult.failureReason || null,
      retryCount: paymentResult.retryCount,
      createdAt: new Date(),
    });
  }

  // 6. If SUCCESS, update bill status to PAID and deduct user balance
  if (paymentResult.status === "SUCCESS") {
    await db
      .update(bills)
      .set({ status: "PAID" })
      .where(eq(bills.id, approval.billId));

    if (user) {
      await db
        .update(users)
        .set({ availableBalance: Math.max(0, user.availableBalance - approval.amount) })
        .where(eq(users.id, user.id));
    }
  }

  // 7. Audit log the payment
  await logAudit({
    taskId: options?.taskId,
    actor: "SYSTEM",
    action: `PAYMENT_${paymentResult.status}`,
    details: {
      transactionId: paymentResult.transactionId,
      amount: approval.amount,
      payee: approval.billerName,
      idempotencyKey: input.idempotencyKey,
      status: paymentResult.status,
      retryCount: paymentResult.retryCount,
      failureReason: paymentResult.failureReason,
    },
  });

  return {
    transactionId: paymentResult.transactionId,
    status: paymentResult.status,
    amount: approval.amount,
    payee: approval.billerName,
    retryCount: paymentResult.retryCount,
    failureReason: paymentResult.failureReason,
    idempotencyKey: input.idempotencyKey,
  };
}

export async function checkPaymentStatusTool(
  input: CheckPaymentStatusInput,
  options?: { allowedScopes?: TaskScope[]; taskId?: string }
): Promise<CheckPaymentStatusOutput> {
  const db = getDb();
  const pollResult = await pollMockPaymentStatus(input.transactionId);

  // Update DB status if changed
  const existing = await db
    .select()
    .from(transactions)
    .where(eq(transactions.id, input.transactionId));

  if (existing.length > 0) {
    const txn = existing[0];
    if (txn.status !== pollResult.status) {
      await db
        .update(transactions)
        .set({
          status: pollResult.status,
          failureReason: pollResult.failureReason || null,
        })
        .where(eq(transactions.id, input.transactionId));

      if (pollResult.status === "SUCCESS" && txn.billId) {
        await db
          .update(bills)
          .set({ status: "PAID" })
          .where(eq(bills.id, txn.billId));
      }
    }

    await logAudit({
      taskId: options?.taskId,
      actor: "SYSTEM",
      action: "CHECK_PAYMENT_STATUS",
      details: {
        transactionId: input.transactionId,
        status: pollResult.status,
      },
    });

    return {
      transactionId: txn.id,
      status: pollResult.status,
      amount: txn.amount,
      payee: txn.payee,
      timestamp: new Date().toISOString(),
    };
  }

  return {
    transactionId: input.transactionId,
    status: pollResult.status,
    amount: 0,
    payee: "Unknown",
    timestamp: new Date().toISOString(),
  };
}
