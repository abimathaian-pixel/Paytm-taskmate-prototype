const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1"
    ? "https://paytm-taskmate-prototype-api-n1uz.vercel.app"
    : "http://localhost:4000");

export async function fetchJson(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    let message = "An error occurred";
    try {
      const errorData = await res.json();
      message = errorData.error || message;
    } catch {}
    throw new Error(message);
  }

  return res.json();
}

export const api = {
  getUser: () => fetchJson("/api/user"),
  getBills: () => fetchJson("/api/bills"),
  getTransactions: () => fetchJson("/api/transactions"),
  getMandates: () => fetchJson("/api/mandates"),
  getReminders: () => fetchJson("/api/reminders"),
  getAuditLogs: () => fetchJson("/api/audit"),
  getDemoScenario: () => fetchJson("/api/demo/scenario"),
  setDemoScenario: (scenario: string) =>
    fetchJson("/api/demo/scenario", {
      method: "POST",
      body: JSON.stringify({ scenario }),
    }),
  resetDatabase: () =>
    fetchJson("/api/reset", {
      method: "POST",
    }),
  sendChat: (message: string, taskId?: string, demoScenario?: string) =>
    fetchJson("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message, taskId, demoScenario }),
    }),
  approvePayment: (approvalId: string, taskId: string, demoScenario?: string) =>
    fetchJson(`/api/approvals/${approvalId}/approve`, {
      method: "POST",
      body: JSON.stringify({ taskId, demoScenario }),
    }),
  rejectPayment: (approvalId: string, taskId: string, reason?: string) =>
    fetchJson(`/api/approvals/${approvalId}/reject`, {
      method: "POST",
      body: JSON.stringify({ taskId, reason }),
    }),
  authenticateMockUpi: (pin: string, approvalId: string, taskId: string) =>
    fetchJson("/api/payments/authenticate", {
      method: "POST",
      body: JSON.stringify({ pin, approvalId, taskId }),
    }),
  initiatePayment: (approvalId: string, taskId: string, demoScenario?: string) =>
    fetchJson("/api/payments/initiate", {
      method: "POST",
      body: JSON.stringify({ approvalId, taskId, demoScenario }),
    }),
  checkPaymentStatus: (transactionId: string) =>
    fetchJson(`/api/payments/${transactionId}/status`),
  createReminder: (data: { title: string; dueDate: string; remindBeforeDays: number }) =>
    fetchJson("/api/reminders", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  createMandate: (data: { billerName: string; maxAmount: number; frequency: string; nextExecutionDate: string }) =>
    fetchJson("/api/mandates", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};
