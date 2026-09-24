"use client";

import Link from "next/link";
import { CheckCircle2, ArrowRight, Home, ReceiptText } from "lucide-react";

interface PaymentSuccessModalProps {
  isOpen: boolean;
  amount: number;
  payee: string;
  transactionId: string;
  availableBalance?: number;
  onClose: () => void;
}

export function PaymentSuccessModal({
  isOpen,
  amount,
  payee,
  transactionId,
  availableBalance,
  onClose,
}: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 flex flex-col items-center">
        {/* Animated Green Badge */}
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-paytm-success mb-3 shadow-inner">
          <CheckCircle2 className="w-10 h-10" />
        </div>

        <div className="text-xs font-semibold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
          Payment Successful
        </div>

        <div className="text-3xl font-extrabold text-slate-900 mt-3">
          ₹{amount.toLocaleString("en-IN")}
        </div>

        <div className="text-sm font-semibold text-slate-700 mt-1">
          {payee}
        </div>

        {/* Receipt Details Card */}
        <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mt-5 text-left text-xs space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Transaction ID</span>
            <span className="font-mono font-bold text-slate-800">{transactionId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Payment Mode</span>
            <span className="font-semibold text-slate-800">UPI (Mock)</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Date & Time</span>
            <span className="font-semibold text-slate-800">
              {new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Status</span>
            <span className="font-bold text-emerald-600">COMPLETED</span>
          </div>
          {typeof availableBalance === "number" && (
            <div className="flex justify-between items-center pt-2 border-t border-slate-200">
              <span className="text-slate-600 font-medium">Updated Balance</span>
              <span className="font-extrabold text-slate-900">
                ₹{availableBalance.toLocaleString("en-IN")}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="w-full grid grid-cols-2 gap-2 mt-6">
          <Link
            href="/transactions"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <ReceiptText className="w-4 h-4" />
            View History
          </Link>
          <Link
            href="/"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
