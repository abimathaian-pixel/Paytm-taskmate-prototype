import { z } from "zod";

// ==========================================
// ENUMS
// ==========================================

export const PaymentStatusEnum = z.enum([
  "SUCCESS",
  "PENDING",
  "FAILED",
  "INSUFFICIENT_BALANCE",
  "UNKNOWN",
]);

export const DemoScenarioEnum = z.enum([
  "SUCCESS",
  "PENDING",
  "TECHNICAL_FAILURE",
  "INSUFFICIENT_BALANCE",
  "UNKNOWN",
]);

export const BillCategoryEnum = z.enum([
  "electricity",
  "internet",
  "mobile",
  "water",
  "gas",
]);

export const BillStatusEnum = z.enum(["PENDING", "PAID", "OVERDUE"]);

export const TaskStatusEnum = z.enum([
  "CREATED",
  "RUNNING",
  "WAITING_APPROVAL",
  "WAITING_AUTH",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

export const ApprovalStatusEnum = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXPIRED",
]);

export const MandateFrequencyEnum = z.enum(["MONTHLY", "WEEKLY", "YEARLY"]);
export const MandateStatusEnum = z.enum(["ACTIVE", "PAUSED", "CANCELLED"]);

export const ReminderStatusEnum = z.enum([
  "SCHEDULED",
  "TRIGGERED",
  "DISMISSED",
]);

export const AuditEventActorEnum = z.enum([
  "USER",
  "AGENT",
  "TOOL",
  "SYSTEM",
]);

export const AgentEventTypeEnum = z.enum([
  "TASK_CREATED",
  "AGENT_THINKING",
  "TOOL_STARTED",
  "TOOL_COMPLETED",
  "BILL_FOUND",
  "APPROVAL_REQUIRED",
  "APPROVAL_GRANTED",
  "AUTHENTICATION_REQUIRED",
  "AUTHENTICATION_COMPLETED",
  "PAYMENT_INITIATED",
  "PAYMENT_PENDING",
  "PAYMENT_RETRY",
  "PAYMENT_SUCCESS",
  "PAYMENT_FAILED",
  "TASK_COMPLETED",
]);

// Least privilege task permissions
export const TaskScopeEnum = z.enum([
  "READ_BILLS",
  "READ_TRANSACTIONS",
  "CREATE_REMINDER",
  "CREATE_MANDATE",
  "INITIATE_PAYMENT",
]);

// ==========================================
// CORE ENTITY SCHEMAS
// ==========================================

export const UserSchema = z.object({
  id: z.string().uuid().or(z.string()),
  name: z.string().min(1),
  phone: z.string(),
  email: z.string().email(),
  availableBalance: z.number().nonnegative(),
  transactionLimit: z.number().positive().default(10000),
  createdAt: z.string().datetime().or(z.date()),
});

export const BillSchema = z.object({
  id: z.string().uuid().or(z.string()),
  userId: z.string(),
  billerName: z.string(),
  category: BillCategoryEnum,
  accountNumber: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  status: BillStatusEnum,
  createdAt: z.string().datetime().or(z.date()),
});

export const TransactionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  billId: z.string().nullable().optional(),
  taskId: z.string().nullable().optional(),
  approvalId: z.string().nullable().optional(),
  idempotencyKey: z.string(),
  amount: z.number().positive(),
  payee: z.string(),
  status: PaymentStatusEnum,
  paymentMethod: z.literal("UPI"),
  failureReason: z.string().nullable().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime().or(z.date()),
});

export const TaskSchema = z.object({
  id: z.string(),
  userId: z.string(),
  title: z.string(),
  status: TaskStatusEnum,
  prompt: z.string(),
  metadata: z.record(z.any()).optional().default({}),
  createdAt: z.string().datetime().or(z.date()),
  updatedAt: z.string().datetime().or(z.date()),
});

export const ApprovalSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  billId: z.string(),
  billerName: z.string(),
  amount: z.number().positive(),
  dueDate: z.string(),
  status: ApprovalStatusEnum,
  paymentMethod: z.literal("UPI"),
  createdAt: z.string().datetime().or(z.date()),
  expiresAt: z.string().datetime().or(z.date()).optional(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  approvalId: z.string(),
  taskId: z.string(),
  idempotencyKey: z.string(),
  amount: z.number().positive(),
  payee: z.string(),
  status: PaymentStatusEnum,
  failureReason: z.string().nullable().optional(),
  retryCount: z.number().int().nonnegative().default(0),
  createdAt: z.string().datetime().or(z.date()),
});

export const MandateSchema = z.object({
  id: z.string(),
  userId: z.string(),
  billId: z.string().nullable().optional(),
  billerName: z.string(),
  maxAmount: z.number().positive(),
  frequency: MandateFrequencyEnum,
  nextExecutionDate: z.string(),
  status: MandateStatusEnum,
  createdAt: z.string().datetime().or(z.date()),
});

export const ReminderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  billId: z.string().nullable().optional(),
  title: z.string(),
  dueDate: z.string(),
  remindBeforeDays: z.number().int().positive(),
  status: ReminderStatusEnum,
  createdAt: z.string().datetime().or(z.date()),
});

export const AuditLogSchema = z.object({
  id: z.string(),
  taskId: z.string().nullable().optional(),
  actor: AuditEventActorEnum,
  action: z.string(),
  details: z.record(z.any()).default({}),
  timestamp: z.string().datetime().or(z.date()),
});

export const AgentEventSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  eventType: AgentEventTypeEnum,
  message: z.string(),
  payload: z.record(z.any()).default({}),
  timestamp: z.string().datetime().or(z.date()),
});

export const ToolCallSchema = z.object({
  toolName: z.string(),
  input: z.record(z.any()),
  output: z.record(z.any()).optional(),
  durationMs: z.number().nonnegative().optional(),
  status: z.enum(["SUCCESS", "ERROR"]),
});

// ==========================================
// TOOL SCHEMAS
// ==========================================

export const GetBillInputSchema = z.object({
  userId: z.string().default("demo-user-1"),
  category: BillCategoryEnum.optional(),
  billerName: z.string().optional(),
});

export const GetBillOutputSchema = z.object({
  bill: BillSchema.nullable(),
  found: z.boolean(),
});

export const GetTransactionsInputSchema = z.object({
  userId: z.string().default("demo-user-1"),
  limit: z.number().int().positive().max(50).default(10),
});

export const GetTransactionsOutputSchema = z.object({
  transactions: z.array(TransactionSchema),
  total: z.number(),
});

export const FindRecurringPaymentsInputSchema = z.object({
  userId: z.string().default("demo-user-1"),
});

export const FindRecurringPaymentsOutputSchema = z.object({
  mandates: z.array(MandateSchema),
  total: z.number(),
});

export const CreateReminderInputSchema = z.object({
  userId: z.string().default("demo-user-1"),
  billId: z.string().optional(),
  title: z.string(),
  dueDate: z.string(),
  remindBeforeDays: z.number().int().positive().default(3),
});

export const CreateReminderOutputSchema = z.object({
  reminder: ReminderSchema,
  success: z.boolean(),
});

export const InitiatePaymentInputSchema = z.object({
  approvalId: z.string().min(1, "Valid approval ID is strictly required"),
  idempotencyKey: z.string().min(1, "Idempotency key is required"),
  demoScenario: DemoScenarioEnum.optional(),
});

export const InitiatePaymentOutputSchema = z.object({
  transactionId: z.string(),
  status: PaymentStatusEnum,
  amount: z.number(),
  payee: z.string(),
  retryCount: z.number(),
  failureReason: z.string().nullable().optional(),
  idempotencyKey: z.string(),
});

export const CheckPaymentStatusInputSchema = z.object({
  transactionId: z.string(),
  idempotencyKey: z.string().optional(),
});

export const CheckPaymentStatusOutputSchema = z.object({
  transactionId: z.string(),
  status: PaymentStatusEnum,
  amount: z.number(),
  payee: z.string(),
  timestamp: z.string().datetime().or(z.date()),
});

// ==========================================
// API REQUEST/RESPONSE SCHEMAS
// ==========================================

export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  taskId: z.string().optional(),
  demoScenario: DemoScenarioEnum.optional(),
});

export const ApproveActionSchema = z.object({
  approvalId: z.string(),
  taskId: z.string(),
  demoScenario: DemoScenarioEnum.optional(),
});

export const RejectActionSchema = z.object({
  approvalId: z.string(),
  taskId: z.string(),
  reason: z.string().optional(),
});

export const MockAuthenticateSchema = z.object({
  pin: z.string().length(4, "PIN must be 4 digits").regex(/^\d+$/, "PIN must be digits"),
  approvalId: z.string(),
  taskId: z.string(),
});
