import { z } from "zod";
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
  ToolCallSchema,
  PaymentStatusEnum,
  DemoScenarioEnum,
  BillCategoryEnum,
  BillStatusEnum,
  TaskStatusEnum,
  ApprovalStatusEnum,
  MandateFrequencyEnum,
  MandateStatusEnum,
  ReminderStatusEnum,
  AuditEventActorEnum,
  AgentEventTypeEnum,
  TaskScopeEnum,
  GetBillInputSchema,
  GetBillOutputSchema,
  GetTransactionsInputSchema,
  GetTransactionsOutputSchema,
  FindRecurringPaymentsInputSchema,
  FindRecurringPaymentsOutputSchema,
  CreateReminderInputSchema,
  CreateReminderOutputSchema,
  InitiatePaymentInputSchema,
  InitiatePaymentOutputSchema,
  CheckPaymentStatusInputSchema,
  CheckPaymentStatusOutputSchema,
  ChatRequestSchema,
  ApproveActionSchema,
  RejectActionSchema,
  MockAuthenticateSchema,
} from "./schemas.js";

export type User = z.infer<typeof UserSchema>;
export type Bill = z.infer<typeof BillSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type Approval = z.infer<typeof ApprovalSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type Mandate = z.infer<typeof MandateSchema>;
export type Reminder = z.infer<typeof ReminderSchema>;
export type AuditLog = z.infer<typeof AuditLogSchema>;
export type AgentEvent = z.infer<typeof AgentEventSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;

export type PaymentStatus = z.infer<typeof PaymentStatusEnum>;
export type DemoScenario = z.infer<typeof DemoScenarioEnum>;
export type BillCategory = z.infer<typeof BillCategoryEnum>;
export type BillStatus = z.infer<typeof BillStatusEnum>;
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type ApprovalStatus = z.infer<typeof ApprovalStatusEnum>;
export type MandateFrequency = z.infer<typeof MandateFrequencyEnum>;
export type MandateStatus = z.infer<typeof MandateStatusEnum>;
export type ReminderStatus = z.infer<typeof ReminderStatusEnum>;
export type AuditEventActor = z.infer<typeof AuditEventActorEnum>;
export type AgentEventType = z.infer<typeof AgentEventTypeEnum>;
export type TaskScope = z.infer<typeof TaskScopeEnum>;

export type GetBillInput = z.infer<typeof GetBillInputSchema>;
export type GetBillOutput = z.infer<typeof GetBillOutputSchema>;
export type GetTransactionsInput = z.infer<typeof GetTransactionsInputSchema>;
export type GetTransactionsOutput = z.infer<typeof GetTransactionsOutputSchema>;
export type FindRecurringPaymentsInput = z.infer<typeof FindRecurringPaymentsInputSchema>;
export type FindRecurringPaymentsOutput = z.infer<typeof FindRecurringPaymentsOutputSchema>;
export type CreateReminderInput = z.infer<typeof CreateReminderInputSchema>;
export type CreateReminderOutput = z.infer<typeof CreateReminderOutputSchema>;
export type InitiatePaymentInput = z.infer<typeof InitiatePaymentInputSchema>;
export type InitiatePaymentOutput = z.infer<typeof InitiatePaymentOutputSchema>;
export type CheckPaymentStatusInput = z.infer<typeof CheckPaymentStatusInputSchema>;
export type CheckPaymentStatusOutput = z.infer<typeof CheckPaymentStatusOutputSchema>;

export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ApproveAction = z.infer<typeof ApproveActionSchema>;
export type RejectAction = z.infer<typeof RejectActionSchema>;
export type MockAuthenticateRequest = z.infer<typeof MockAuthenticateSchema>;
