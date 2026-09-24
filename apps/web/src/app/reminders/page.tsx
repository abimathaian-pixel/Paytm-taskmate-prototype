"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Bell, Clock, Sparkles, CheckCircle2 } from "lucide-react";
import { api } from "../../lib/api";

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getReminders()
      .then((data) => setReminders(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Bill Reminders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Intelligent alerts before due dates to avoid penalty fees.
          </p>
        </div>

        <Link
          href="/taskmate?prompt=Remind me about my electricity bill"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white text-xs font-bold shadow-sm transition-all"
        >
          <Sparkles className="w-4 h-4 text-paytm-lightBlue" />
          Add Reminder via TaskMate
        </Link>
      </div>

      {/* Reminders List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reminders.map((rem) => (
          <div
            key={rem.id}
            className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {rem.title}
                  </h3>
                  <div className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Due Date: <strong>{rem.dueDate}</strong>
                  </div>
                </div>
              </div>

              <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-sky-100 text-paytm-blue flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {rem.status}
              </span>
            </div>

            <div className="mt-5 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
              <span>Notification Schedule:</span>
              <strong className="text-slate-700">
                {rem.remindBeforeDays} days prior to due date
              </strong>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
