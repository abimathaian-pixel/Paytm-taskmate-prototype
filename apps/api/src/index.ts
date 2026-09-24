import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { eq, desc } from "drizzle-orm";
import {
  initDb,
  getDb,
  users,
  bills,
  transactions,
  tasks,
  approvals,
  mandates,
  reminders,
  auditLogs,
  agentEvents,
} from "@taskmate/db";
import {
  ChatRequestSchema,
  ApproveActionSchema,
  RejectActionSchema,
  MockAuthenticateSchema,
  DemoScenarioEnum,
} from "@taskmate/shared";
import {
  processAgentRequest,
  agentEventBus,
} from "@taskmate/agent";
import {
  initiatePaymentTool,
  checkPaymentStatusTool,
  logAudit,
  setGlobalDemoScenario,
  getGlobalDemoScenario,
} from "@taskmate/tools";
import { serve as serveInngest } from "inngest/hono";
import { inngest, electricityBillWorkflow, dailyBillScanCron } from "./inngest.js";
import { randomUUID } from "crypto";

const app = new Hono();

app.use(
  "/*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/health", (c) => c.json({ status: "ok", service: "api" }));

// INNGEST WORKFLOW ENDPOINT
app.on(
  ["GET", "POST", "PUT"],
  "/api/inngest",
  serveInngest({
    client: inngest,
    functions: [electricityBillWorkflow, dailyBillScanCron],
  })
);

// 1. CHAT / TASKMATE AGENT ENDPOINT
app.post("/api/chat", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = ChatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: "Invalid request payload", details: parsed.error.format() }, 400);
    }

    const { message, taskId, demoScenario } = parsed.data;

    await logAudit({
      taskId,
      actor: "USER",
      action: "CHAT_MESSAGE_SENT",
      details: { message },
    });

    const result = await processAgentRequest({
      userId: "demo-user-1",
      message,
      taskId,
      demoScenario,
    });

    return c.json(result);
  } catch (err: any) {
    console.error("Chat error:", err);
    return c.json({ error: err.message || "Internal server error" }, 500);
  }
});

// 2. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
app.get("/api/events/:taskId", async (c) => {
  const taskId = c.req.param("taskId");
  const db = getDb();

  return streamSSE(c, async (stream) => {
    // Send existing historical events first
    try {
      const historical = await db
        .select()
        .from(agentEvents)
        .where(eq(agentEvents.taskId, taskId))
        .orderBy(agentEvents.timestamp);

      for (const evt of historical) {
        await stream.writeSSE({
          event: "message",
          data: JSON.stringify({
            id: evt.id,
            taskId: evt.taskId,
            eventType: evt.eventType,
            message: evt.message,
            payload: evt.payload,
            timestamp: evt.timestamp.toISOString(),
          }),
        });
      }
    } catch (e) {
      console.error("Error fetching historical events:", e);
    }

    // Subscribe to live events
    const unsubscribe = agentEventBus.subscribe(taskId, async (event) => {
      try {
        await stream.writeSSE({
          event: "message",
          data: JSON.stringify(event),
        });
      } catch (err) {
        console.error("Error streaming SSE event:", err);
      }
    });

    // Keep stream alive
    const interval = setInterval(async () => {
      try {
        await stream.writeSSE({
          event: "ping",
          data: "ping",
        });
      } catch (err) {
        clearInterval(interval);
        unsubscribe();
      }
    }, 15000);

    c.req.raw.signal.addEventListener("abort", () => {
      clearInterval(interval);
      unsubscribe();
    });

    // Hold the connection open
    await new Promise((resolve) => {
      c.req.raw.signal.addEventListener("abort", resolve);
    });
  });
});

// 3. APPROVAL ENDPOINTS
app.post("/api/approvals/:id/approve", async (c) => {
  const approvalId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = ApproveActionSchema.safeParse({ approvalId, ...body });
  if (!parsed.success) {
    return c.json({ error: "Invalid approval action", details: parsed.error.format() }, 400);
  }

  const { taskId, demoScenario } = parsed.data;
  const db = getDb();

  const approvalRows = await db
    .select()
    .from(approvals)
    .where(eq(approvals.id, approvalId));

  if (approvalRows.length === 0) {
    return c.json({ error: "Approval not found" }, 404);
  }

  const appr = approvalRows[0];

  // Update approval state
  await db
    .update(approvals)
    .set({ status: "APPROVED" })
    .where(eq(approvals.id, approvalId));

  await db
    .update(tasks)
    .set({ status: "WAITING_AUTH", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  await logAudit({
    taskId,
    actor: "USER",
    action: "APPROVAL_GRANTED",
    details: {
      approvalId,
      amount: appr.amount,
      billerName: appr.billerName,
    },
  });

  await agentEventBus.emit(
    taskId,
    "APPROVAL_GRANTED",
    `Approval confirmed by user for ₹${appr.amount.toLocaleString("en-IN")}`,
    { approvalId, amount: appr.amount }
  );

  await new Promise((r) => setTimeout(r, 1200));

  await agentEventBus.emit(
    taskId,
    "AUTHENTICATION_REQUIRED",
    "Please authenticate using your 4-digit UPI PIN to authorize transfer",
    { approvalId, amount: appr.amount, billerName: appr.billerName }
  );

  return c.json({
    success: true,
    approvalId,
    status: "APPROVED",
    nextStep: "AUTHENTICATION_REQUIRED",
  });
});

app.post("/api/approvals/:id/reject", async (c) => {
  const approvalId = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const parsed = RejectActionSchema.safeParse({ approvalId, ...body });
  if (!parsed.success) {
    return c.json({ error: "Invalid rejection payload", details: parsed.error.format() }, 400);
  }

  const { taskId, reason } = parsed.data;
  const db = getDb();

  await db
    .update(approvals)
    .set({ status: "REJECTED" })
    .where(eq(approvals.id, approvalId));

  await db
    .update(tasks)
    .set({ status: "CANCELLED", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  await logAudit({
    taskId,
    actor: "USER",
    action: "APPROVAL_REJECTED",
    details: { approvalId, reason },
  });

  await agentEventBus.emit(
    taskId,
    "TASK_COMPLETED",
    "Payment workflow cancelled by user.",
    { approvalId, reason }
  );

  return c.json({
    success: true,
    approvalId,
    status: "REJECTED",
  });
});

// 4. ISOLATED MOCK UPI AUTHENTICATION SCREEN BACKEND
// CRITICAL SECURITY REQUIREMENT: PIN NEVER LEAVES THIS ENDPOINT, NEVER LOGGED, NEVER IN DATABASE OR LLM
app.post("/api/payments/authenticate", async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const parsed = MockAuthenticateSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: "Invalid PIN format (must be 4 digits)", details: parsed.error.format() }, 400);
  }

  const { approvalId, taskId } = parsed.data;
  // Notice: 'pin' is NOT logged, NOT stored, NOT passed anywhere!

  await logAudit({
    taskId,
    actor: "USER",
    action: "AUTHENTICATION_COMPLETED",
    details: { approvalId, authMethod: "UPI_PIN_MOCK" },
  });

  await agentEventBus.emit(
    taskId,
    "AUTHENTICATION_COMPLETED",
    "Mock UPI authentication verified successfully. Proceeding to payment gateway...",
    { approvalId }
  );

  return c.json({
    status: "SUCCESS",
    authenticated: true,
    approvalId,
  });
});

// 5. PAYMENT INITIATION & RETRY LOGIC
app.post("/api/payments/initiate", async (c) => {
  try {
    const body = await c.req.json();
    const { approvalId, taskId, demoScenario } = body;

    if (!approvalId || !taskId) {
      return c.json({ error: "approvalId and taskId are required" }, 400);
    }

    const idempotencyKey = "idem-" + taskId;

    await agentEventBus.emit(
      taskId,
      "PAYMENT_INITIATED",
      "Payment initiated via UPI gateway",
      { idempotencyKey }
    );

    // Realistic processing delay for bank communication
    await new Promise((r) => setTimeout(r, 1500));

    let paymentResult = await initiatePaymentTool(
      {
        approvalId,
        idempotencyKey,
        demoScenario,
      },
      { taskId, allowedScopes: ["INITIATE_PAYMENT"] }
    );

    // Automatic retry policy for TECHNICAL FAILURE: retry exactly once with the SAME idempotency key
    if (paymentResult.status === "FAILED") {
      await agentEventBus.emit(
        taskId,
        "PAYMENT_RETRY",
        "Technical error encountered. Retrying once with the exact same idempotency key...",
        { idempotencyKey, attempt: 1 }
      );

      await new Promise((r) => setTimeout(r, 1500));

      // Re-invoke with same idempotency key (mock gateway recovers)
      paymentResult = await initiatePaymentTool(
        {
          approvalId,
          idempotencyKey,
          demoScenario: "SUCCESS",
        },
        { taskId, allowedScopes: ["INITIATE_PAYMENT"] }
      );
    }

    const db = getDb();
    if (paymentResult.status === "SUCCESS") {
      await new Promise((r) => setTimeout(r, 1200));

      await db
        .update(tasks)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await agentEventBus.emit(
        taskId,
        "PAYMENT_SUCCESS",
        `Payment of ₹${paymentResult.amount.toLocaleString("en-IN")} to ${paymentResult.payee} succeeded!`,
        paymentResult
      );

      await new Promise((r) => setTimeout(r, 1000));

      await agentEventBus.emit(
        taskId,
        "TASK_COMPLETED",
        "Task completed successfully."
      );
    } else if (paymentResult.status === "PENDING") {
      await agentEventBus.emit(
        taskId,
        "PAYMENT_PENDING",
        "Payment is currently pending bank confirmation.",
        paymentResult
      );
    } else {
      await db
        .update(tasks)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await agentEventBus.emit(
        taskId,
        "PAYMENT_FAILED",
        paymentResult.failureReason || "Payment declined",
        paymentResult
      );
    }

    const userRows = await db.select().from(users).where(eq(users.id, "demo-user-1"));
    const updatedUser = userRows[0];

    return c.json({
      ...paymentResult,
      availableBalance: updatedUser ? updatedUser.availableBalance : 25000,
    });
  } catch (err: any) {
    console.error("Payment initiation error:", err);
    return c.json({ error: err.message || "Payment initiation failed" }, 400);
  }
});

// 6. PAYMENT STATUS POLLING
app.get("/api/payments/:id/status", async (c) => {
  const transactionId = c.req.param("id");
  const result = await checkPaymentStatusTool({ transactionId });
  return c.json(result);
});

// 7. USER DETAILS & BALANCE
app.get("/api/user", async (c) => {
  const db = getDb();
  const userRows = await db.select().from(users).where(eq(users.id, "demo-user-1"));
  if (userRows.length === 0) {
    return c.json({ error: "User not found" }, 404);
  }
  return c.json(userRows[0]);
});

// 8. BILLS ENDPOINTS
app.get("/api/bills", async (c) => {
  const db = getDb();
  const allBills = await db.select().from(bills).where(eq(bills.userId, "demo-user-1"));
  return c.json(allBills);
});

app.get("/api/bills/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const result = await db.select().from(bills).where(eq(bills.id, id));
  if (result.length === 0) {
    return c.json({ error: "Bill not found" }, 404);
  }
  return c.json(result[0]);
});

// 9. TRANSACTIONS ENDPOINTS
app.get("/api/transactions", async (c) => {
  const db = getDb();
  const allTxns = await db
    .select()
    .from(transactions)
    .where(eq(transactions.userId, "demo-user-1"))
    .orderBy(desc(transactions.createdAt));
  return c.json(allTxns);
});

app.get("/api/transactions/:id", async (c) => {
  const id = c.req.param("id");
  const db = getDb();
  const result = await db.select().from(transactions).where(eq(transactions.id, id));
  if (result.length === 0) {
    return c.json({ error: "Transaction not found" }, 404);
  }
  return c.json(result[0]);
});

// 10. MANDATES / AUTOPAY
app.get("/api/mandates", async (c) => {
  const db = getDb();
  const allMandates = await db.select().from(mandates).where(eq(mandates.userId, "demo-user-1"));
  return c.json(allMandates);
});

app.post("/api/mandates", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = "mandate-" + randomUUID().slice(0, 8);
  const newMandate = {
    id,
    userId: "demo-user-1",
    billId: body.billId || null,
    billerName: body.billerName,
    maxAmount: body.maxAmount || 3000,
    frequency: body.frequency || "MONTHLY",
    nextExecutionDate: body.nextExecutionDate || "28 Oct 2026",
    status: "ACTIVE",
    createdAt: new Date(),
  };
  await db.insert(mandates).values(newMandate);
  await logAudit({
    actor: "USER",
    action: "MANDATE_CREATED",
    details: newMandate,
  });
  return c.json(newMandate);
});

// 11. REMINDERS
app.get("/api/reminders", async (c) => {
  const db = getDb();
  const allReminders = await db.select().from(reminders).where(eq(reminders.userId, "demo-user-1"));
  return c.json(allReminders);
});

app.post("/api/reminders", async (c) => {
  const body = await c.req.json();
  const db = getDb();
  const id = "rem-" + randomUUID().slice(0, 8);
  const newReminder = {
    id,
    userId: "demo-user-1",
    billId: body.billId || null,
    title: body.title,
    dueDate: body.dueDate,
    remindBeforeDays: body.remindBeforeDays || 3,
    status: "SCHEDULED",
    createdAt: new Date(),
  };
  await db.insert(reminders).values(newReminder);
  await logAudit({
    actor: "USER",
    action: "REMINDER_CREATED",
    details: newReminder,
  });
  return c.json(newReminder);
});

// 12. AUDIT LOGS
app.get("/api/audit", async (c) => {
  const db = getDb();
  const logs = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.timestamp))
    .limit(100);
  return c.json(logs);
});

// 13. DEMO SCENARIO SWITCHER
app.get("/api/demo/scenario", (c) => {
  return c.json({ currentScenario: getGlobalDemoScenario() });
});

app.post("/api/demo/scenario", async (c) => {
  const body = await c.req.json();
  const parsed = DemoScenarioEnum.safeParse(body.scenario);
  if (!parsed.success) {
    return c.json({ error: "Invalid scenario name" }, 400);
  }
  setGlobalDemoScenario(parsed.data);
  return c.json({ success: true, scenario: parsed.data });
});

// 14. RESET DATABASE TO CLEAN DEMO STATE
app.post("/api/reset", async (c) => {
  const { resetDb } = await import("@taskmate/db");
  await resetDb();
  setGlobalDemoScenario("SUCCESS");
  return c.json({ success: true, message: "Database reset to clean demo state" });
});

const port = Number(process.env.PORT || 4000);

async function start() {
  await initDb();
  serve({ fetch: app.fetch, port }, () => {
    console.log(`🚀 Paytm TaskMate Hono API listening on http://localhost:${port}`);
  });
}

start().catch((err) => {
  console.error("API failed to start:", err);
});
