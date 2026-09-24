"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  ReceiptText,
  Repeat,
  Bell,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ChevronRight,
  Wifi,
  Smartphone,
  Droplet,
} from "lucide-react";
import { api } from "../lib/api";

export default function Dashboard() {
  const [bills, setBills] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboardData = () => {
    Promise.all([api.getUser(), api.getBills(), api.getTransactions()])
      .then(([userData, billsData, txnsData]) => {
        setUser(userData);
        setBills(billsData || []);
        setTransactions(txnsData || []);
      })
      .catch((err) => console.error("Error loading dashboard data:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadDashboardData();

    const handleStateChange = () => {
      loadDashboardData();
    };

    window.addEventListener("taskmate:state_changed", handleStateChange);
    return () => {
      window.removeEventListener("taskmate:state_changed", handleStateChange);
    };
  }, []);

  const getBillIcon = (category: string) => {
    switch (category) {
      case "electricity":
        return <Zap className="w-5 h-5 text-amber-500" />;
      case "internet":
        return <Wifi className="w-5 h-5 text-blue-500" />;
      case "mobile":
        return <Smartphone className="w-5 h-5 text-emerald-500" />;
      case "water":
        return <Droplet className="w-5 h-5 text-cyan-500" />;
      default:
        return <Zap className="w-5 h-5 text-paytm-lightBlue" />;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Welcome Hero Card */}
      <div className="bg-gradient-to-br from-paytm-blue via-paytm-darkBlue to-[#0a2e5c] rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-12 -top-12 w-64 h-64 bg-paytm-lightBlue/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-cyan-300 text-xs font-semibold backdrop-blur-xs mb-3 border border-white/15">
              <Sparkles className="w-3.5 h-3.5" />
              Paytm TaskMate AI Assistant
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Good afternoon, {user?.name || "Aarendra"}
            </h1>
            <p className="text-sky-100 text-sm sm:text-base mt-1 max-w-xl">
              What would you like your AI teammate to handle for you today?
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <Link
              href="/taskmate"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-paytm-lightBlue hover:bg-sky-400 text-white font-bold text-sm shadow-lg shadow-sky-500/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Sparkles className="w-4 h-4" />
              Ask TaskMate
              <ArrowRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Balance Overview Strip */}
        <div className="mt-6 pt-6 border-t border-white/15 flex flex-wrap items-center gap-6 sm:gap-12">
          <div>
            <div className="text-xs text-sky-200 uppercase font-semibold">Available Balance</div>
            <div className="text-2xl font-black tracking-tight text-white mt-0.5">
              ₹{(user?.availableBalance ?? 25000).toLocaleString("en-IN")}
            </div>
          </div>
          <div>
            <div className="text-xs text-sky-200 uppercase font-semibold">Transaction Limit</div>
            <div className="text-lg font-bold text-sky-100 mt-0.5">
              ₹{(user?.transactionLimit ?? 10000).toLocaleString("en-IN")} / txn
            </div>
          </div>
          <div>
            <div className="text-xs text-sky-200 uppercase font-semibold">Security State</div>
            <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              UPI PIN Zero-Knowledge Isolated
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3 px-1">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
          {[
            {
              title: "Pay Bills",
              desc: "Manage & clear dues",
              icon: Zap,
              href: "/bills",
              color: "text-amber-500",
              bgColor: "bg-amber-500/10",
            },
            {
              title: "Transactions",
              desc: "Passbook & history",
              icon: ReceiptText,
              href: "/transactions",
              color: "text-blue-500",
              bgColor: "bg-blue-500/10",
            },
            {
              title: "AutoPay",
              desc: "Recurring mandates",
              icon: Repeat,
              href: "/autopay",
              color: "text-purple-500",
              bgColor: "bg-purple-500/10",
            },
            {
              title: "Reminders",
              desc: "Due date alerts",
              icon: Bell,
              href: "/reminders",
              color: "text-rose-500",
              bgColor: "bg-rose-500/10",
            },
          ].map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.title}
                href={action.href}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 hover:border-paytm-lightBlue hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div className={`w-11 h-11 rounded-xl ${action.bgColor} ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-800 text-sm sm:text-base">
                    {action.title}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {action.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content: Upcoming Bills & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Upcoming Bills Column */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Upcoming Bills
            </h2>
            <Link
              href="/bills"
              className="text-xs font-semibold text-paytm-lightBlue hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {bills.slice(0, 3).map((bill) => (
              <div
                key={bill.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0">
                    {getBillIcon(bill.category)}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm sm:text-base">
                      {bill.billerName}
                    </div>
                    <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Due: {bill.dueDate}
                      <span className="inline-block w-1 h-1 rounded-full bg-slate-300" />
                      <span className="font-mono text-[11px] text-slate-400">
                        {bill.accountNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-base sm:text-lg font-extrabold text-slate-900">
                      ₹{bill.amount.toLocaleString("en-IN")}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        bill.status === "PAID"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {bill.status}
                    </span>
                  </div>

                  {bill.status !== "PAID" && (
                    <Link
                      href={`/taskmate?prompt=Handle my ${bill.category} bill`}
                      className="px-3.5 py-2 rounded-xl bg-paytm-blue hover:bg-paytm-darkBlue text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1 shrink-0"
                    >
                      <Sparkles className="w-3 h-3 text-cyan-300" />
                      Pay with TaskMate
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Transactions Column */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
              Recent Transactions
            </h2>
            <Link
              href="/transactions"
              className="text-xs font-semibold text-paytm-lightBlue hover:underline flex items-center gap-1"
            >
              View all
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
            {transactions.slice(0, 4).map((txn) => (
              <div
                key={txn.id}
                className="p-3.5 sm:p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div>
                    <div className="font-semibold text-slate-800 text-xs sm:text-sm">
                      {txn.payee}
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {txn.id}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-extrabold text-slate-900 text-xs sm:text-sm">
                    -₹{txn.amount.toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] font-semibold text-emerald-600 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {txn.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
