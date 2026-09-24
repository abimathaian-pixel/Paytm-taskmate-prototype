"use client";

import { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  ReceiptText,
  ShieldCheck,
  X,
} from "lucide-react";
import { api } from "../../lib/api";

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [selectedTxn, setSelectedTxn] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadTransactions = () => {
    api
      .getTransactions()
      .then((data) => setTransactions(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadTransactions();

    const handleStateChange = () => {
      loadTransactions();
    };

    window.addEventListener("taskmate:state_changed", handleStateChange);
    return () => {
      window.removeEventListener("taskmate:state_changed", handleStateChange);
    };
  }, []);

  const filtered = transactions.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.payee.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
            <CheckCircle2 className="w-3 h-3" />
            SUCCESS
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case "FAILED":
      case "INSUFFICIENT_BALANCE":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
            <XCircle className="w-3 h-3" />
            FAILED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full">
            <HelpCircle className="w-3 h-3" />
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Transaction History
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Complete immutable ledger of all payments and debits.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by payee or ID..."
            className="w-full bg-slate-50 border border-slate-200 focus:border-paytm-lightBlue rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm outline-none transition-colors"
          />
        </div>
      </div>

      {/* Transactions Table/List */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No transactions match your search.
            </div>
          ) : (
            filtered.map((txn) => (
              <div
                key={txn.id}
                onClick={() => setSelectedTxn(txn)}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-11 h-11 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm shrink-0">
                    ₹
                  </div>
                  <div>
                    <div className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {txn.payee}
                    </div>
                    <div className="text-xs text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                      <span>{txn.id}</span>
                      <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-slate-300" />
                      <span className="hidden sm:inline-block">
                        {new Date(txn.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex items-center gap-4">
                  <div>
                    <div className="text-sm sm:text-base font-black text-slate-900">
                      -₹{txn.amount.toLocaleString("en-IN")}
                    </div>
                    <div className="mt-1 flex justify-end">
                      {getStatusBadge(txn.status)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transaction Detail Drawer / Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
                <ReceiptText className="w-4 h-4 text-paytm-lightBlue" />
                Transaction Details
              </div>
              <button
                onClick={() => setSelectedTxn(null)}
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-3 text-xs">
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Payee</span>
                <span className="font-bold text-slate-800 text-sm">{selectedTxn.payee}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Amount</span>
                <span className="font-extrabold text-slate-900 text-base">
                  ₹{selectedTxn.amount.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Status</span>
                <span>{getStatusBadge(selectedTxn.status)}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Transaction ID</span>
                <span className="font-mono text-slate-700">{selectedTxn.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Idempotency Key</span>
                <span className="font-mono text-[10px] text-slate-500">
                  {selectedTxn.idempotencyKey}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-400 uppercase font-semibold">Retry Count</span>
                <span className="font-bold text-slate-700">{selectedTxn.retryCount}</span>
              </div>
              {selectedTxn.failureReason && (
                <div className="p-3 bg-rose-50 text-rose-700 rounded-xl">
                  <strong>Failure Reason:</strong> {selectedTxn.failureReason}
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTxn(null)}
              className="mt-6 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
