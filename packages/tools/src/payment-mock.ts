import { PaymentStatus, DemoScenario } from "@taskmate/shared";

interface MockPaymentRecord {
  idempotencyKey: string;
  transactionId: string;
  amount: number;
  payee: string;
  status: PaymentStatus;
  retryCount: number;
  failureReason?: string;
  createdAt: Date;
}

// In-memory registry for mock payment gateway switch state
const paymentRegistry = new Map<string, MockPaymentRecord>();
let globalDemoScenario: DemoScenario = "SUCCESS";

export function setGlobalDemoScenario(scenario: DemoScenario) {
  globalDemoScenario = scenario;
}

export function getGlobalDemoScenario(): DemoScenario {
  return globalDemoScenario;
}

export async function processMockPayment(params: {
  idempotencyKey: string;
  amount: number;
  payee: string;
  demoScenario?: DemoScenario;
}): Promise<{
  transactionId: string;
  status: PaymentStatus;
  failureReason?: string;
  retryCount: number;
}> {
  const scenario = params.demoScenario || globalDemoScenario;
  const existing = paymentRegistry.get(params.idempotencyKey);

  // If this idempotency key was previously processed
  if (existing) {
    // If it previously had a technical failure and is being retried with the SAME idempotency key
    if (existing.status === "FAILED" && existing.retryCount < 1) {
      existing.retryCount += 1;
      existing.status = "SUCCESS";
      existing.failureReason = undefined;
      return {
        transactionId: existing.transactionId,
        status: existing.status,
        retryCount: existing.retryCount,
      };
    }
    // Return existing record (idempotency safety)
    return {
      transactionId: existing.transactionId,
      status: existing.status,
      failureReason: existing.failureReason,
      retryCount: existing.retryCount,
    };
  }

  const transactionId = "TXN-" + new Date().toISOString().slice(0, 10).replace(/-/g, "") + "-" + Math.floor(100 + Math.random() * 900);

  let status: PaymentStatus = "SUCCESS";
  let failureReason: string | undefined = undefined;

  switch (scenario) {
    case "SUCCESS":
      status = "SUCCESS";
      break;

    case "PENDING":
      status = "PENDING";
      break;

    case "TECHNICAL_FAILURE":
      status = "FAILED";
      failureReason = "NPCI Gateway Timeout (504 Gateway Error)";
      break;

    case "INSUFFICIENT_BALANCE":
      status = "INSUFFICIENT_BALANCE";
      failureReason = "Declined by issuing bank: Insufficient Funds";
      break;

    case "UNKNOWN":
      status = "UNKNOWN";
      failureReason = "NPCI settlement response ambiguous (HTTP 499)";
      break;

    default:
      status = "SUCCESS";
  }

  const record: MockPaymentRecord = {
    idempotencyKey: params.idempotencyKey,
    transactionId,
    amount: params.amount,
    payee: params.payee,
    status,
    retryCount: 0,
    failureReason,
    createdAt: new Date(),
  };

  paymentRegistry.set(params.idempotencyKey, record);

  return {
    transactionId,
    status,
    failureReason,
    retryCount: 0,
  };
}

export async function pollMockPaymentStatus(transactionId: string): Promise<{
  status: PaymentStatus;
  failureReason?: string;
}> {
  for (const record of paymentRegistry.values()) {
    if (record.transactionId === transactionId) {
      if (record.status === "PENDING") {
        // Pending status simulation: transitions to SUCCESS upon successful poll
        record.status = "SUCCESS";
      }
      return {
        status: record.status,
        failureReason: record.failureReason,
      };
    }
  }

  return {
    status: "UNKNOWN",
    failureReason: "Transaction ID not found in mock gateway",
  };
}
