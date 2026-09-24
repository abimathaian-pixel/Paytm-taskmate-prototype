"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  Send,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  XCircle,
  HelpCircle,
  ReceiptText,
} from "lucide-react";
import { api } from "../../lib/api";
import { MockUpiModal } from "../../components/MockUpiModal";
import { PaymentSuccessModal } from "../../components/PaymentSuccessModal";

interface AgentTraceItem {
  id: string;
  eventType: string;
  message: string;
  payload: any;
  timestamp: string;
}

interface ChatMessage {
  id: string;
  sender: "user" | "taskmate";
  text: string;
  approvalData?: any;
  mandateData?: any;
  data?: any;
  timestamp: string;
}

export default function TaskMatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-slate-500 text-sm">
          Loading TaskMate AI...
        </div>
      }
    >
      <TaskMateContent />
    </Suspense>
  );
}

function TaskMateContent() {
  const searchParams = useSearchParams();
  const initialPrompt = searchParams.get("prompt");

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [traces, setTraces] = useState<AgentTraceItem[]>([]);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeApproval, setActiveApproval] = useState<any | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<any | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sseRef = useRef<EventSource | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, traces, activeApproval]);

  // Handle explicit reset query param if provided
  useEffect(() => {
    if (searchParams.get("reset") === "true") {
      api.resetDatabase().catch(() => {});
    }
  }, [searchParams]);

  // Handle URL initial query
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  // Connect Server-Sent Events (SSE) when taskId changes
  useEffect(() => {
    if (!currentTaskId) return;

    if (sseRef.current) {
      sseRef.current.close();
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
    const sse = new EventSource(`${apiUrl}/api/events/${currentTaskId}`);
    sseRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.eventType) {
          setTraces((prev) => {
            // Deduplicate by event id
            if (prev.some((e) => e.id === data.id)) return prev;
            return [...prev, data];
          });

          // Check if approval was required from event
          if (data.eventType === "APPROVAL_REQUIRED" && data.payload?.approvalId) {
            setActiveApproval(data.payload);
          }
        }
      } catch (err) {
        console.error("SSE parse error:", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("SSE connection closed or errored:", err);
      sse.close();
    };

    return () => {
      sse.close();
    };
  }, [currentTaskId]);

  const handleSend = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      sender: "user",
      text: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setPaymentError(null);

    try {
      const taskId = "task-" + Math.random().toString(36).substring(2, 9);
      setCurrentTaskId(taskId);
      setTraces([]);

      const result = await api.sendChat(query, taskId);

      const botMsg: ChatMessage = {
        id: "msg-" + Date.now() + 1,
        sender: "taskmate",
        text: result.response,
        approvalData: result.approvalData,
        mandateData: result.mandateData,
        data: result.data,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, botMsg]);

      if (result.approvalRequired && result.approvalData) {
        setActiveApproval(result.approvalData);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "msg-" + Date.now() + 1,
        sender: "taskmate",
        text: `Something went wrong: ${err.message || "Failed to contact TaskMate agent"}`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!activeApproval || !currentTaskId) return;

    try {
      setLoading(true);
      await api.approvePayment(activeApproval.approvalId, currentTaskId);
      // Open isolated Mock UPI PIN screen
      setShowAuthModal(true);
    } catch (err: any) {
      setPaymentError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!activeApproval || !currentTaskId) return;

    try {
      setLoading(true);
      await api.rejectPayment(activeApproval.approvalId, currentTaskId, "User clicked cancel");
      setActiveApproval(null);
      setMessages((prev) => [
        ...prev,
        {
          id: "msg-" + Date.now(),
          sender: "taskmate",
          text: "Understood. The bill payment preview was cancelled and no money was transferred.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMockPinConfirm = async (pin: string) => {
    if (!activeApproval || !currentTaskId) return;

    setAuthLoading(true);
    setPaymentError(null);

    try {
      // 1. Authenticate with isolated endpoint (PIN NEVER SAVED OR LOGGED)
      await api.authenticateMockUpi(pin, activeApproval.approvalId, currentTaskId);
      setShowAuthModal(false);

      // 2. Initiate payment execution
      const paymentRes = await api.initiatePayment(activeApproval.approvalId, currentTaskId);

      if (paymentRes.status === "SUCCESS") {
        setSuccessReceipt({
          amount: paymentRes.amount,
          payee: paymentRes.payee,
          transactionId: paymentRes.transactionId,
          availableBalance: paymentRes.availableBalance,
        });
        setActiveApproval(null);

        // Add confirmation message directly into chat stream
        setMessages((prev) => [
          ...prev,
          {
            id: "msg-" + Date.now(),
            sender: "taskmate",
            text: `Payment of ₹${paymentRes.amount.toLocaleString(
              "en-IN"
            )} to ${paymentRes.payee} completed successfully! Transaction ID: ${
              paymentRes.transactionId
            }.${
              paymentRes.availableBalance !== undefined
                ? ` Your updated available balance is ₹${paymentRes.availableBalance.toLocaleString("en-IN")}.`
                : ""
            } Your bill is now marked as PAID.`,
            timestamp: new Date().toISOString(),
          },
        ]);

        // Emit global event to notify Navbar, Dashboard, Bills & Transactions
        window.dispatchEvent(new CustomEvent("taskmate:state_changed"));
      } else if (paymentRes.status === "PENDING") {
        setMessages((prev) => [
          ...prev,
          {
            id: "msg-" + Date.now(),
            sender: "taskmate",
            text: `Payment is currently pending bank confirmation. TaskMate has NOT assumed success. Transaction ID: ${paymentRes.transactionId}`,
            timestamp: new Date().toISOString(),
          },
        ]);
        setActiveApproval(null);
      } else {
        setPaymentError(paymentRes.failureReason || "Payment was declined by payment gateway");
      }
    } catch (err: any) {
      setPaymentError(err.message || "Payment initiation failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const samplePrompts = [
    "Handle my electricity bill",
    "Show my recent transactions",
    "Which bills are due this week?",
    "Remind me about my electricity bill",
    "Do I have recurring payments?",
    "Set up monthly electricity bill payment",
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-4 animate-fadeIn">
      {/* Header bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-paytm-blue flex items-center justify-center text-white shadow-xs">
            <Sparkles className="w-5 h-5 text-paytm-lightBlue" />
          </div>
          <div>
            <h1 className="font-extrabold text-slate-900 text-lg leading-tight flex items-center gap-2">
              TaskMate AI Cockpit
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Active Teammate
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Owns the workflow while you keep control of the money.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
          <ShieldCheck className="w-4 h-4 text-paytm-lightBlue" />
          Deterministic Approval Gate Active
        </div>
      </div>

      {/* Main Split: Chat Conversation + Live Backend Agent Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Chat Feed (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 shadow-sm flex flex-col h-[650px] overflow-hidden">
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-14 h-14 rounded-2xl bg-sky-50 text-paytm-lightBlue flex items-center justify-center mb-3">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-slate-800 text-base">
                  Hi Aarendra, I'm TaskMate
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Tell me what financial task you'd like done. I will fetch verified data, plan the workflow, and request your approval before any transfer.
                </p>

                {/* Prompt suggestions pills */}
                <div className="mt-6 flex flex-wrap gap-2 justify-center max-w-md">
                  {samplePrompts.map((p) => (
                    <button
                      key={p}
                      onClick={() => handleSend(p)}
                      className="px-3 py-1.5 rounded-full bg-slate-50 hover:bg-sky-50 hover:text-paytm-blue border border-slate-200 text-xs font-medium text-slate-700 transition-colors text-left"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                    msg.sender === "user"
                      ? "bg-paytm-blue text-white rounded-br-xs shadow-xs"
                      : "bg-slate-100 text-slate-800 rounded-bl-xs"
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                </div>

                {/* If message returned table or array data (e.g. transactions) */}
                {msg.data && Array.isArray(msg.data) && (
                  <div className="w-full mt-2 bg-slate-50 rounded-2xl border border-slate-200 p-3 text-xs space-y-1.5">
                    {msg.data.slice(0, 4).map((item: any) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-center py-1 border-b border-slate-200/60 last:border-0"
                      >
                        <span className="font-medium text-slate-700">
                          {item.payee || item.billerName || item.title}
                        </span>
                        <span className="font-bold text-slate-900">
                          ₹{item.amount || item.maxAmount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* DETERMINISTIC APPROVAL CARD (Embedded in Chat) */}
            {activeApproval && (
              <div className="bg-gradient-to-br from-sky-50 to-white border-2 border-paytm-lightBlue rounded-2xl p-5 shadow-md animate-fadeIn my-2">
                <div className="flex items-center justify-between pb-3 border-b border-sky-100">
                  <div className="flex items-center gap-2 text-paytm-blue font-bold text-xs uppercase tracking-wide">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Payment Approval Required
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    Awaiting Action
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  <div>
                    <div className="text-xs text-slate-500 uppercase font-semibold">Biller</div>
                    <div className="font-extrabold text-slate-900 text-base">
                      {activeApproval.billerName}
                    </div>
                  </div>

                  <div className="flex justify-between items-center bg-white p-3.5 rounded-xl border border-slate-200/80">
                    <div>
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">
                        Amount
                      </div>
                      <div className="text-2xl font-black text-paytm-blue">
                        ₹{activeApproval.amount?.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] text-slate-500 uppercase font-semibold">
                        Due Date
                      </div>
                      <div className="text-xs font-bold text-slate-800">
                        {activeApproval.dueDate}
                      </div>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between px-1">
                    <span>Payment Method: <strong>UPI</strong></span>
                    <span>Approval ID: <code className="text-slate-600">{activeApproval.approvalId}</code></span>
                  </div>
                </div>

                {/* Error Banner if limit exceeded or failed */}
                {paymentError && (
                  <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                    <span>{paymentError}</span>
                  </div>
                )}

                {/* Deterministic Approval Buttons */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-2">
                  <button
                    onClick={handleReject}
                    disabled={loading}
                    className="py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={loading}
                    className="py-2.5 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white font-bold text-xs shadow-md shadow-blue-900/20 transition-all flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Approve Payment
                  </button>
                </div>
              </div>
            )}

            {loading && !activeApproval && (
              <div className="flex items-center gap-2 text-xs text-slate-500 p-2 animate-pulse">
                <Sparkles className="w-4 h-4 text-paytm-lightBlue animate-spin" />
                TaskMate is thinking and verifying tools...
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input */}
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask TaskMate... (e.g. Handle my electricity bill)"
                disabled={loading}
                className="flex-1 bg-white border border-slate-300 focus:border-paytm-lightBlue rounded-xl px-4 py-2.5 text-sm outline-none transition-all placeholder:text-slate-400 shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue disabled:opacity-40 text-white flex items-center justify-center transition-colors shadow-sm shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Right: Live Backend Agent Activity Trace (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5 flex flex-col h-[650px] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <h2 className="font-extrabold text-slate-800 text-sm tracking-wide">
                TaskMate Live Activity
              </h2>
            </div>
            <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
              SSE Stream
            </span>
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-3 pr-1">
            {traces.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-6">
                <Clock className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs">Real-time workflow execution trace from the backend will appear here.</p>
              </div>
            ) : (
              traces.map((trace, idx) => {
                const isSuccess =
                  trace.eventType === "PAYMENT_SUCCESS" ||
                  trace.eventType === "TASK_COMPLETED" ||
                  trace.eventType === "APPROVAL_GRANTED" ||
                  trace.eventType === "AUTHENTICATION_COMPLETED";
                const isWarning =
                  trace.eventType === "APPROVAL_REQUIRED" ||
                  trace.eventType === "AUTHENTICATION_REQUIRED" ||
                  trace.eventType === "PAYMENT_PENDING" ||
                  trace.eventType === "PAYMENT_RETRY";
                const isDanger =
                  trace.eventType === "PAYMENT_FAILED";

                return (
                  <div
                    key={trace.id || idx}
                    className="flex items-start gap-2.5 text-xs animate-fadeIn"
                  >
                    <div className="mt-0.5">
                      {isSuccess ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : isWarning ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : isDanger ? (
                        <XCircle className="w-4 h-4 text-rose-500" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-paytm-lightBlue" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-slate-800 leading-snug">
                        {trace.message}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="bg-slate-100 px-1.5 py-0.2 rounded text-slate-600">
                          {trace.eventType}
                        </span>
                        <span>
                          {new Date(trace.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Security guarantee pill */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Workflow audit events are immutable and persisted.</span>
          </div>
        </div>
      </div>

      {/* ISOLATED MOCK UPI AUTHENTICATION MODAL */}
      {activeApproval && (
        <MockUpiModal
          isOpen={showAuthModal}
          billerName={activeApproval.billerName}
          amount={activeApproval.amount}
          onConfirm={handleMockPinConfirm}
          onCancel={() => setShowAuthModal(false)}
          loading={authLoading}
        />
      )}

      {/* PAYMENT SUCCESS RECEIPT MODAL */}
      {successReceipt && (
        <PaymentSuccessModal
          isOpen={true}
          amount={successReceipt.amount}
          payee={successReceipt.payee}
          transactionId={successReceipt.transactionId}
          availableBalance={successReceipt.availableBalance}
          onClose={() => setSuccessReceipt(null)}
        />
      )}
    </div>
  );
}
