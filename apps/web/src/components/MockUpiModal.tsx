"use client";

import { useState } from "react";
import { ShieldCheck, Lock, Delete, X, AlertCircle } from "lucide-react";

interface MockUpiModalProps {
  isOpen: boolean;
  billerName: string;
  amount: number;
  onConfirm: (pin: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export function MockUpiModal({
  isOpen,
  billerName,
  amount,
  onConfirm,
  onCancel,
  loading = false,
}: MockUpiModalProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      setError(null);
      setPin((prev) => prev + digit);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin("");
  };

  const handleSubmit = async () => {
    if (pin.length !== 4) {
      setError("Please enter complete 4-digit UPI PIN");
      return;
    }
    setError(null);
    try {
      await onConfirm(pin);
      setPin("");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-paytm-blue px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-paytm-lightBlue" />
            <span className="font-semibold text-sm tracking-wide">
              UPI Payment Authentication
            </span>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="text-slate-300 hover:text-white p-1 rounded-full hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Security Isolation Disclaimer */}
        <div className="bg-sky-50 px-4 py-2 border-b border-sky-100 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 text-paytm-lightBlue shrink-0 mt-0.5" />
          <div className="text-[11px] text-slate-700 leading-tight">
            <strong className="text-paytm-blue">Isolated Security Screen:</strong> PIN is verified directly with mock NPCI switch. The AI Agent, server logs, and DB never see your PIN.
          </div>
        </div>

        {/* Payment Summary */}
        <div className="p-6 flex flex-col items-center text-center">
          <div className="text-xs uppercase font-semibold text-slate-500">
            Paying To
          </div>
          <div className="font-bold text-slate-800 text-lg mt-0.5">
            {billerName}
          </div>
          <div className="text-3xl font-extrabold text-paytm-blue mt-2">
            ₹{amount.toLocaleString("en-IN")}
          </div>

          <div className="text-xs text-slate-500 mt-4 mb-2 font-medium">
            ENTER 4-DIGIT UPI PIN
          </div>

          {/* PIN Indicators (● ● ● ●) */}
          <div className="flex items-center gap-4 my-2">
            {[0, 1, 2, 3].map((idx) => {
              const isFilled = pin.length > idx;
              return (
                <div
                  key={idx}
                  className={`w-4 h-4 rounded-full border-2 transition-all ${
                    isFilled
                      ? "bg-paytm-blue border-paytm-blue scale-110"
                      : "border-slate-300 bg-slate-50"
                  }`}
                />
              );
            })}
          </div>

          {error && (
            <div className="mt-2 text-xs text-rose-600 font-medium flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </div>
          )}

          {/* Numeric Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full mt-5">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                disabled={loading}
                className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-semibold text-slate-800 text-lg transition-colors flex items-center justify-center shadow-xs"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 font-medium text-xs border border-slate-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => handleDigit("0")}
              disabled={loading}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 font-semibold text-slate-800 text-lg transition-colors flex items-center justify-center shadow-xs"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="h-12 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center"
            >
              <Delete className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <div className="w-full grid grid-cols-2 gap-2.5 mt-5">
            <button
              type="button"
              onClick={onCancel}
              disabled={loading}
              className="w-full py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading || pin.length !== 4}
              className="w-full py-2.5 rounded-xl bg-paytm-lightBlue hover:bg-sky-600 disabled:opacity-50 text-white text-sm font-semibold shadow-md transition-all flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Confirm"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
