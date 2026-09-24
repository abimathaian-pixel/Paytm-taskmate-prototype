"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Repeat, CheckCircle2, Clock, Sparkles, PlusCircle } from "lucide-react";
import { api } from "../../lib/api";

export default function AutoPayPage() {
  const [mandates, setMandates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMandates()
      .then((data) => setMandates(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            AutoPay Mandates
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Automated recurring bill clearing with user-set maximum caps.
          </p>
        </div>

        <Link
          href="/taskmate?prompt=Set up monthly electricity bill payment"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white text-xs font-bold shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4 text-paytm-lightBlue" />
          Set up via TaskMate
        </Link>
      </div>

      {/* Mandates List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {mandates.map((m) => (
          <div
            key={m.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Repeat className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {m.billerName}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium mt-0.5">
                    Frequency: <strong>{m.frequency}</strong>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {m.status}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex items-baseline justify-between text-xs">
              <div>
                <div className="text-slate-400 font-semibold uppercase text-[10px]">
                  Next Execution
                </div>
                <div className="font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {m.nextExecutionDate}
                </div>
              </div>

              <div className="text-right">
                <div className="text-slate-400 font-semibold uppercase text-[10px]">
                  Max Cap
                </div>
                <div className="text-lg font-black text-slate-900">
                  ₹{m.maxAmount.toLocaleString("en-IN")}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
