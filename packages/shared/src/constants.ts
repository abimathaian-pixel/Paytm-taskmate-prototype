export const DEMO_USER_ID = "demo-user-1";
export const DEMO_USER_NAME = "Aarendra Singh";
export const DEMO_USER_BALANCE = 25000;
export const DEMO_USER_LIMIT = 10000;

export const DEFAULT_TASK_SCOPES = [
  "READ_BILLS",
  "READ_TRANSACTIONS",
  "CREATE_REMINDER",
  "CREATE_MANDATE",
  "INITIATE_PAYMENT",
] as const;

export const INNGEST_EVENTS = {
  ELECTRICITY_WORKFLOW_START: "taskmate/workflow.electricity.start",
  APPROVAL_RESOLVED: "taskmate/approval.resolved",
  AUTHENTICATION_RESOLVED: "taskmate/auth.resolved",
  PAYMENT_PROCESS: "taskmate/payment.process",
  RETRY_PROCESS: "taskmate/retry.process",
} as const;
