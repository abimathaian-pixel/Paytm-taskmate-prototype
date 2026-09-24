import { inngest } from "./client.js";
import { getBillTool, initiatePaymentTool, checkPaymentStatusTool } from "@taskmate/tools";
import { agentEventBus } from "@taskmate/agent";
import { getDb, tasks, approvals, bills, transactions } from "@taskmate/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

export const electricityBillWorkflow = inngest.createFunction(
  { id: "electricity-bill-workflow", retries: 1 },
  { event: "taskmate/workflow.electricity.start" },
  async ({ event, step }) => {
    const { taskId, userId, demoScenario } = event.data;
    const db = getDb();

    // 1. Receive task & emit event
    await step.run("init-task", async () => {
      await agentEventBus.emit(
        taskId,
        "TASK_CREATED",
        "Durable Inngest workflow initiated for electricity bill processing.",
        { taskId, userId }
      );
    });

    // 2. Find Bill
    const billData = await step.run("find-bill", async () => {
      await agentEventBus.emit(
        taskId,
        "AGENT_THINKING",
        "Durable step: Retrieving electricity bill from records..."
      );
      const res = await getBillTool(
        { userId, category: "electricity" },
        { taskId, allowedScopes: ["READ_BILLS"] }
      );
      if (!res.found || !res.bill) {
        throw new Error("No pending electricity bill found");
      }
      return res.bill;
    });

    // 3. Create Deterministic Approval
    const approval = await step.run("create-approval", async () => {
      const approvalId = "appr-" + randomUUID().slice(0, 8);
      await db.insert(approvals).values({
        id: approvalId,
        taskId,
        billId: billData.id,
        billerName: billData.billerName,
        amount: billData.amount,
        dueDate: billData.dueDate,
        status: "PENDING",
        paymentMethod: "UPI",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      });

      await agentEventBus.emit(
        taskId,
        "APPROVAL_REQUIRED",
        `Payment approval required for ₹${billData.amount.toLocaleString("en-IN")}`,
        {
          approvalId,
          amount: billData.amount,
          billerName: billData.billerName,
          dueDate: billData.dueDate,
        }
      );

      return {
        id: approvalId,
        amount: billData.amount,
        billerName: billData.billerName,
        dueDate: billData.dueDate,
      };
    });

    // 4. Wait for Approval
    const approvalEvent = await step.waitForEvent("wait-for-approval", {
      event: "taskmate/approval.resolved",
      timeout: "15m",
      match: "data.taskId",
    });

    if (!approvalEvent || approvalEvent.data.status !== "APPROVED") {
      await step.run("cancel-task", async () => {
        await db
          .update(tasks)
          .set({ status: "CANCELLED", updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        await agentEventBus.emit(
          taskId,
          "TASK_COMPLETED",
          "Payment task was cancelled by user.",
          { reason: "Approval rejected or expired" }
        );
      });
      return { status: "CANCELLED" };
    }

    // 5. Wait for isolated mock authentication
    const authEvent = await step.waitForEvent("wait-for-auth", {
      event: "taskmate/auth.resolved",
      timeout: "5m",
      match: "data.taskId",
    });

    if (!authEvent || authEvent.data.status !== "SUCCESS") {
      return { status: "AUTH_FAILED" };
    }

    // 6. Initiate Payment with Idempotency Key
    const idempotencyKey = "idem-" + taskId;
    const paymentResult = await step.run("execute-payment", async () => {
      await agentEventBus.emit(
        taskId,
        "PAYMENT_INITIATED",
        "Executing payment via mock UPI gateway with idempotency key",
        { idempotencyKey, amount: approval.amount }
      );

      return await initiatePaymentTool(
        {
          approvalId: approval.id,
          idempotencyKey,
          demoScenario,
        },
        { taskId, allowedScopes: ["INITIATE_PAYMENT"] }
      );
    });

    // 7. Check Payment Status & Handle Failure / Retry Policy
    let finalStatus = paymentResult.status;

    if (finalStatus === "FAILED") {
      // Automatic retry policy for technical failure: retry once with the SAME idempotency key
      await step.run("handle-retry", async () => {
        await agentEventBus.emit(
          taskId,
          "PAYMENT_RETRY",
          "Technical gateway error encountered. Retrying once using the same idempotency key...",
          { idempotencyKey, retryAttempt: 1 }
        );

        const retryResult = await initiatePaymentTool(
          {
            approvalId: approval.id,
            idempotencyKey,
            demoScenario: "SUCCESS", // Recovers upon retry
          },
          { taskId, allowedScopes: ["INITIATE_PAYMENT"] }
        );

        finalStatus = retryResult.status;
      });
    } else if (finalStatus === "PENDING") {
      // Poll with backoff
      await step.sleep("wait-pending-poll", "2s");
      await step.run("poll-status", async () => {
        await agentEventBus.emit(
          taskId,
          "PAYMENT_PENDING",
          "Polling payment status from bank switch..."
        );
        const poll = await checkPaymentStatusTool(
          { transactionId: paymentResult.transactionId },
          { taskId }
        );
        finalStatus = poll.status;
      });
    }

    // 8. Final outcome update & agent trace
    await step.run("finalize-task", async () => {
      if (finalStatus === "SUCCESS") {
        await db
          .update(tasks)
          .set({ status: "COMPLETED", updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        await agentEventBus.emit(
          taskId,
          "PAYMENT_SUCCESS",
          `Payment of ₹${approval.amount.toLocaleString("en-IN")} to ${approval.billerName} was successful!`,
          {
            transactionId: paymentResult.transactionId,
            amount: approval.amount,
            payee: approval.billerName,
          }
        );

        await agentEventBus.emit(
          taskId,
          "TASK_COMPLETED",
          "Electricity bill workflow finished successfully."
        );
      } else {
        await db
          .update(tasks)
          .set({ status: "FAILED", updatedAt: new Date() })
          .where(eq(tasks.id, taskId));

        await agentEventBus.emit(
          taskId,
          "PAYMENT_FAILED",
          `Payment could not be completed: ${paymentResult.failureReason || "Gateway rejected transaction"}`
        );
      }
    });

    return {
      status: finalStatus,
      transactionId: paymentResult.transactionId,
      amount: approval.amount,
    };
  }
);

// Scheduled Daily Bill Monitoring Cron
export const dailyBillScanCron = inngest.createFunction(
  { id: "daily-bill-scan-cron" },
  { cron: "0 9 * * *" }, // Daily at 9:00 AM
  async ({ step }) => {
    await step.run("scan-upcoming-due-dates", async () => {
      console.log("⏰ Daily bill scanner running...");
      const db = getDb();
      const allBills = await db.select().from(bills).where(eq(bills.status, "PENDING"));
      console.log(`Found ${allBills.length} pending bills across user base.`);
    });
  }
);
