import { pgTable, text, integer, timestamp, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const paymentStatusEnum = pgEnum("payment_status", [
  "SUCCESS",
  "PENDING",
  "FAILED",
  "INSUFFICIENT_BALANCE",
  "UNKNOWN",
]);

export const billStatusEnum = pgEnum("bill_status", [
  "PENDING",
  "PAID",
  "OVERDUE",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "CREATED",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_AUTH",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const approvalStatusEnum = pgEnum("approval_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const mandateFrequencyEnum = pgEnum("mandate_frequency", [
  "MONTHLY",
  "WEEKLY",
  "YEARLY",
]);

export const mandateStatusEnum = pgEnum("mandate_status", [
  "ACTIVE",
  "PAUSED",
  "CANCELLED",
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "SCHEDULED",
  "TRIGGERED",
  "DISMISSED",
]);

export const auditActorEnum = pgEnum("audit_actor", [
  "USER",
  "AGENT",
  "TOOL",
  "SYSTEM",
]);

// 1. Users Table
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  availableBalance: integer("available_balance").notNull().default(25000),
  transactionLimit: integer("transaction_limit").notNull().default(10000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 2. Bills Table
export const bills = pgTable("bills", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  billerName: text("biller_name").notNull(),
  category: text("category").notNull(), // electricity, internet, mobile, water
  accountNumber: text("account_number").notNull(),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("PENDING"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 3. Tasks Table
export const tasks = pgTable("tasks", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  status: text("status").notNull().default("CREATED"),
  prompt: text("prompt").notNull(),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// 4. Approvals Table
export const approvals = pgTable("approvals", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  billId: text("bill_id").notNull().references(() => bills.id),
  billerName: text("biller_name").notNull(),
  amount: integer("amount").notNull(),
  dueDate: text("due_date").notNull(),
  status: text("status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull().default("UPI"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at"),
});

// 5. Transactions Table
export const transactions = pgTable("transactions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  billId: text("bill_id").references(() => bills.id),
  taskId: text("task_id").references(() => tasks.id),
  approvalId: text("approval_id").references(() => approvals.id),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  amount: integer("amount").notNull(),
  payee: text("payee").notNull(),
  status: text("status").notNull().default("PENDING"),
  paymentMethod: text("payment_method").notNull().default("UPI"),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 6. Mandates Table
export const mandates = pgTable("mandates", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  billId: text("bill_id").references(() => bills.id),
  billerName: text("biller_name").notNull(),
  maxAmount: integer("max_amount").notNull(),
  frequency: text("frequency").notNull().default("MONTHLY"),
  nextExecutionDate: text("next_execution_date").notNull(),
  status: text("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 7. Reminders Table
export const reminders = pgTable("reminders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  billId: text("bill_id").references(() => bills.id),
  title: text("title").notNull(),
  dueDate: text("due_date").notNull(),
  remindBeforeDays: integer("remind_before_days").notNull().default(3),
  status: text("status").notNull().default("SCHEDULED"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// 8. Audit Logs Table
export const auditLogs = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  taskId: text("task_id").references(() => tasks.id),
  actor: text("actor").notNull(), // USER, AGENT, TOOL, SYSTEM
  action: text("action").notNull(),
  details: jsonb("details").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// 9. Agent Events Table
export const agentEvents = pgTable("agent_events", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => tasks.id),
  eventType: text("event_type").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload").default({}),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  bills: many(bills),
  tasks: many(tasks),
  transactions: many(transactions),
  mandates: many(mandates),
  reminders: many(reminders),
}));

export const billsRelations = relations(bills, ({ one, many }) => ({
  user: one(users, {
    fields: [bills.userId],
    references: [users.id],
  }),
  approvals: many(approvals),
  transactions: many(transactions),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  user: one(users, {
    fields: [tasks.userId],
    references: [users.id],
  }),
  approvals: many(approvals),
  transactions: many(transactions),
  auditLogs: many(auditLogs),
  agentEvents: many(agentEvents),
}));

export const approvalsRelations = relations(approvals, ({ one, many }) => ({
  task: one(tasks, {
    fields: [approvals.taskId],
    references: [tasks.id],
  }),
  bill: one(bills, {
    fields: [approvals.billId],
    references: [bills.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
  bill: one(bills, {
    fields: [transactions.billId],
    references: [bills.id],
  }),
  task: one(tasks, {
    fields: [transactions.taskId],
    references: [tasks.id],
  }),
  approval: one(approvals, {
    fields: [transactions.approvalId],
    references: [approvals.id],
  }),
}));
