"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Zap, Wifi, Smartphone, Droplet, Clock, CheckCircle2, Sparkles, Filter } from "lucide-react";
import { api } from "../../lib/api";

export default function BillsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const loadBills = () => {
    api
      .getBills()
      .then((data) => setBills(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadBills();

    const handleStateChange = () => {
      loadBills();
    };

    window.addEventListener("taskmate:state_changed", handleStateChange);
    return () => {
      window.removeEventListener("taskmate:state_changed", handleStateChange);
    };
  }, []);

  const getBillIcon = (category: string) => {
    switch (category) {
      case "electricity":
        return <Zap className="w-6 h-6 text-amber-500" />;
      case "internet":
        return <Wifi className="w-6 h-6 text-blue-500" />;
      case "mobile":
        return <Smartphone className="w-6 h-6 text-emerald-500" />;
      case "water":
        return <Droplet className="w-6 h-6 text-cyan-500" />;
      default:
        return <Zap className="w-6 h-6 text-paytm-lightBlue" />;
    }
  };

  const filteredBills = bills.filter((b) => {
    if (filter === "ALL") return true;
    return b.status === filter;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Registered Bills
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Track utility bills and let TaskMate handle approvals and clearing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {["ALL", "PENDING", "PAID"].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === status
                  ? "bg-paytm-blue text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredBills.map((bill) => (
          <div
            key={bill.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    {getBillIcon(bill.category)}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base">
                      {bill.billerName}
                    </h3>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">
                      Acc: {bill.accountNumber}
                    </div>
                  </div>
                </div>

                <span
                  className={`text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                    bill.status === "PAID"
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {bill.status}
                </span>
              </div>

              <div className="mt-6 flex items-baseline justify-between pt-4 border-t border-slate-100">
                <div>
                  <div className="text-xs text-slate-400 font-medium uppercase">
                    Due Date
                  </div>
                  <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 mt-0.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {bill.dueDate}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium uppercase">
                    Bill Amount
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ₹{bill.amount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-3">
              {bill.status !== "PAID" ? (
                <Link
                  href={`/taskmate?prompt=Handle my ${bill.category} bill`}
                  className="w-full py-2.5 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-paytm-lightBlue" />
                  Pay with TaskMate
                </Link>
              ) : (
                <div className="w-full py-2.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold flex items-center justify-center gap-1.5 border border-emerald-100">
                  <CheckCircle2 className="w-4 h-4" />
                  Bill Paid
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
