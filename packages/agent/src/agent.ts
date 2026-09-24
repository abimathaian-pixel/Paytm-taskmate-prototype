import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import {
  getDb,
  tasks,
  approvals,
  bills,
  mandates,
} from "@taskmate/db";
import {
  getBillTool,
  getTransactionsTool,
  findRecurringPaymentsTool,
  createReminderTool,
} from "@taskmate/tools";
import { agentEventBus } from "./events.js";
import { DemoScenario } from "@taskmate/shared";

export interface AgentProcessResult {
  taskId: string;
  response: string;
  approvalRequired?: boolean;
  approvalData?: {
    approvalId: string;
    billerName: string;
    amount: number;
    dueDate: string;
    category: string;
    billId: string;
  };
  mandateRequired?: boolean;
  mandateData?: any;
  data?: any;
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function processAgentRequest(params: {
  userId?: string;
  message: string;
  taskId?: string;
  demoScenario?: DemoScenario;
}): Promise<AgentProcessResult> {
  const userId = params.userId || "demo-user-1";
  const taskId = params.taskId || "task-" + randomUUID().slice(0, 8);
  const prompt = params.message.trim();
  const lowerPrompt = prompt.toLowerCase();
  const db = getDb();

  // Ensure task exists in DB
  const existingTask = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (existingTask.length === 0) {
    await db.insert(tasks).values({
      id: taskId,
      userId,
      title: prompt.slice(0, 50),
      status: "RUNNING",
      prompt,
      metadata: { demoScenario: params.demoScenario || "SUCCESS" },
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } else {
    await db
      .update(tasks)
      .set({ status: "RUNNING", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));
  }

  await agentEventBus.emit(
    taskId,
    "TASK_CREATED",
    `Task created: "${prompt}"`,
    { taskId, prompt }
  );

  // Realistic cadence: 1-2s delay between task steps
  await delay(1200);

  // Scenario A: Electricity Bill / Bill Payment Flow
  if (
    lowerPrompt.includes("electricity") ||
    lowerPrompt.includes("light bill") ||
    lowerPrompt.includes("power bill") ||
    lowerPrompt.includes("handle my bill") ||
    lowerPrompt.includes("pay bill")
  ) {
    await agentEventBus.emit(
      taskId,
      "AGENT_THINKING",
      "I'll check your current electricity bill first.",
      { query: "electricity" }
    );

    await delay(1400);

    await agentEventBus.emit(
      taskId,
      "TOOL_STARTED",
      "Executing get_bill(category: 'electricity')",
      { tool: "get_bill", category: "electricity" }
    );

    const billResult = await getBillTool(
      { userId, category: "electricity" },
      { taskId, allowedScopes: ["READ_BILLS"] }
    );

    await delay(1200);

    await agentEventBus.emit(
      taskId,
      "TOOL_COMPLETED",
      "Electricity bill retrieved from biller records",
      { found: billResult.found, bill: billResult.bill }
    );

    if (!billResult.found || !billResult.bill) {
      await delay(1000);
      await db
        .update(tasks)
        .set({ status: "COMPLETED", updatedAt: new Date() })
        .where(eq(tasks.id, taskId));

      await agentEventBus.emit(
        taskId,
        "TASK_COMPLETED",
        "No pending electricity bill was found for your account.",
        {}
      );

      return {
        taskId,
        response: "Great news! You have no pending electricity bills at this moment.",
      };
    }

    const bill = billResult.bill;

    await delay(1200);

    await agentEventBus.emit(
      taskId,
      "BILL_FOUND",
      `Electricity bill found: ₹${bill.amount.toLocaleString("en-IN")} due on ${bill.dueDate}`,
      { billId: bill.id, amount: bill.amount, dueDate: bill.dueDate }
    );

    // Deterministic Approval Gate: The backend constructs the approval from verified tool data
    const approvalId = "appr-" + randomUUID().slice(0, 8);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    await db.insert(approvals).values({
      id: approvalId,
      taskId,
      billId: bill.id,
      billerName: bill.billerName,
      amount: bill.amount,
      dueDate: bill.dueDate,
      status: "PENDING",
      paymentMethod: "UPI",
      createdAt: new Date(),
      expiresAt,
    });

    await db
      .update(tasks)
      .set({ status: "WAITING_APPROVAL", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await delay(1200);

    await agentEventBus.emit(
      taskId,
      "APPROVAL_REQUIRED",
      `Payment approval required for ₹${bill.amount.toLocaleString("en-IN")}`,
      {
        approvalId,
        billerName: bill.billerName,
        amount: bill.amount,
        dueDate: bill.dueDate,
        category: bill.category,
      }
    );

    return {
      taskId,
      response: `I've retrieved your electricity bill from ${bill.billerName} for ₹${bill.amount.toLocaleString(
        "en-IN"
      )} due on ${bill.dueDate}. Please review and approve the payment preview below.`,
      approvalRequired: true,
      approvalData: {
        approvalId,
        billerName: bill.billerName,
        amount: bill.amount,
        dueDate: bill.dueDate,
        category: bill.category,
        billId: bill.id,
      },
    };
  }

  // Scenario B: Show Recent Transactions
  if (
    lowerPrompt.includes("transaction") ||
    lowerPrompt.includes("history") ||
    lowerPrompt.includes("statement") ||
    lowerPrompt.includes("spent")
  ) {
    await agentEventBus.emit(
      taskId,
      "AGENT_THINKING",
      "Fetching your recent transaction history...",
      {}
    );

    await agentEventBus.emit(
      taskId,
      "TOOL_STARTED",
      "Executing get_transactions(limit: 5)",
      { tool: "get_transactions", limit: 5 }
    );

    const txnsResult = await getTransactionsTool(
      { userId, limit: 5 },
      { taskId, allowedScopes: ["READ_TRANSACTIONS"] }
    );

    await agentEventBus.emit(
      taskId,
      "TOOL_COMPLETED",
      `Retrieved ${txnsResult.total} recent transactions`,
      { total: txnsResult.total }
    );

    await db
      .update(tasks)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await agentEventBus.emit(
      taskId,
      "TASK_COMPLETED",
      "Transaction history inquiry completed.",
      {}
    );

    return {
      taskId,
      response: `Here are your last ${txnsResult.total} transactions. You can also view all detailed records under the Transactions tab.`,
      data: txnsResult.transactions,
    };
  }

  // Scenario C: Recurring Payments / AutoPay
  if (
    lowerPrompt.includes("recurring") ||
    lowerPrompt.includes("autopay") ||
    lowerPrompt.includes("mandate") ||
    lowerPrompt.includes("monthly payment")
  ) {
    if (lowerPrompt.includes("set up") || lowerPrompt.includes("make sure") || lowerPrompt.includes("every month")) {
      // Setup mandate flow
      await agentEventBus.emit(
        taskId,
        "AGENT_THINKING",
        "Analyzing recurring billing setup for electricity...",
        {}
      );

      const mandateDraft = {
        billerName: "Maharashtra Electricity",
        maxAmount: 3000,
        frequency: "Monthly",
        nextExecutionDate: "28 Oct 2026",
      };

      await agentEventBus.emit(
        taskId,
        "APPROVAL_REQUIRED",
        "AutoPay mandate authorization required",
        mandateDraft
      );

      return {
        taskId,
        response:
          "I found your recurring electricity bill. I can set up a monthly AutoPay mandate with a maximum authorization of ₹3,000 to automatically pay before the due date.",
        mandateRequired: true,
        mandateData: mandateDraft,
      };
    }

    await agentEventBus.emit(
      taskId,
      "TOOL_STARTED",
      "Executing find_recurring_payments()",
      { tool: "find_recurring_payments" }
    );

    const recurringResult = await findRecurringPaymentsTool(
      { userId },
      { taskId, allowedScopes: ["READ_BILLS"] }
    );

    await agentEventBus.emit(
      taskId,
      "TOOL_COMPLETED",
      `Found ${recurringResult.total} active recurring mandates`,
      { total: recurringResult.total }
    );

    await db
      .update(tasks)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await agentEventBus.emit(
      taskId,
      "TASK_COMPLETED",
      "Recurring payments inquiry completed.",
      {}
    );

    return {
      taskId,
      response: `You have ${recurringResult.total} active recurring payment mandates registered (Spotify, Netflix).`,
      data: recurringResult.mandates,
    };
  }

  // Scenario D: Reminder Request
  if (lowerPrompt.includes("remind") || lowerPrompt.includes("reminder")) {
    await agentEventBus.emit(
      taskId,
      "AGENT_THINKING",
      "Scheduling a smart reminder for your bill...",
      {}
    );

    const remResult = await createReminderTool(
      {
        userId,
        title: "Electricity Bill Due Date Reminder",
        dueDate: "28 Sep 2026",
        remindBeforeDays: 3,
      },
      { taskId, allowedScopes: ["CREATE_REMINDER"] }
    );

    await agentEventBus.emit(
      taskId,
      "TOOL_COMPLETED",
      "Reminder scheduled 3 days before due date",
      { reminder: remResult.reminder }
    );

    await db
      .update(tasks)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await agentEventBus.emit(
      taskId,
      "TASK_COMPLETED",
      "Reminder created successfully.",
      {}
    );

    return {
      taskId,
      response: `✓ I have set a reminder for your Electricity Bill. You'll receive a notification 3 days prior to the due date (25 Sep 2026).`,
      data: remResult.reminder,
    };
  }

  // Scenario E: Which bills are due / general bills
  if (lowerPrompt.includes("due") || lowerPrompt.includes("bills")) {
    await agentEventBus.emit(
      taskId,
      "AGENT_THINKING",
      "Checking all bills due soon...",
      {}
    );

    const pendingBills = await db
      .select()
      .from(bills)
      .where(eq(bills.userId, userId));

    await agentEventBus.emit(
      taskId,
      "TOOL_COMPLETED",
      `Retrieved ${pendingBills.length} registered bills`,
      { count: pendingBills.length }
    );

    await db
      .update(tasks)
      .set({ status: "COMPLETED", updatedAt: new Date() })
      .where(eq(tasks.id, taskId));

    await agentEventBus.emit(
      taskId,
      "TASK_COMPLETED",
      "Bills inquiry completed.",
      {}
    );

    return {
      taskId,
      response: `You currently have ${pendingBills.length} bills in your account: Electricity (₹2,450), Internet (₹999), Mobile (₹599), and Water (₹450). You can ask me to handle any of them!`,
      data: pendingBills,
    };
  }

  // Fallback conversational help
  await agentEventBus.emit(
    taskId,
    "AGENT_THINKING",
    "Processing your request...",
    {}
  );

  await db
    .update(tasks)
    .set({ status: "COMPLETED", updatedAt: new Date() })
    .where(eq(tasks.id, taskId));

  await agentEventBus.emit(
    taskId,
    "TASK_COMPLETED",
    "Understood your inquiry.",
    {}
  );

  return {
    taskId,
    response: `I'm your Paytm TaskMate financial teammate. You can say:
• "Handle my electricity bill"
• "Show my recent transactions"
• "Which bills are due this week?"
• "Remind me about my electricity bill"
• "Do I have recurring payments?"
• "Set up monthly electricity bill payment"`,
  };
}
