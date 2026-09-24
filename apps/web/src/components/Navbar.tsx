"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Wallet,
  Zap,
  ReceiptText,
  Clock,
  Repeat,
  Bell,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function Navbar() {
  const pathname = usePathname();
  const [balance, setBalance] = useState<number>(25000);
  const [userName, setUserName] = useState<string>("Aarendra Singh");

  const loadUser = () => {
    api
      .getUser()
      .then((user: any) => {
        if (user) {
          setBalance(user.availableBalance);
          setUserName(user.name);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadUser();

    const handleStateChange = () => {
      loadUser();
    };

    window.addEventListener("taskmate:state_changed", handleStateChange);
    return () => {
      window.removeEventListener("taskmate:state_changed", handleStateChange);
    };
  }, [pathname]);

  const navItems = [
    { href: "/", label: "Home", icon: Wallet },
    {
      href: "/taskmate",
      label: "TaskMate AI",
      icon: Sparkles,
      highlight: true,
    },
    { href: "/bills", label: "Bills", icon: Zap },
    { href: "/transactions", label: "Transactions", icon: ReceiptText },
    { href: "/autopay", label: "AutoPay", icon: Repeat },
    { href: "/reminders", label: "Reminders", icon: Bell },
    { href: "/audit", label: "Audit", icon: ShieldCheck },
  ];

  return (
    <header className="bg-paytm-blue text-white shadow-md sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-paytm-lightBlue flex items-center justify-center font-bold text-lg text-white shadow-sm">
              ₹
            </div>
            <div>
              <div className="font-extrabold text-xl tracking-tight leading-none text-white flex items-center gap-1.5">
                Paytm <span className="text-paytm-lightBlue font-semibold">TaskMate</span>
              </div>
              <div className="text-[10px] text-sky-200 tracking-wider font-medium uppercase mt-0.5">
                AI Financial Teammate
              </div>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? "bg-white/15 text-white"
                      : "text-slate-200 hover:text-white hover:bg-white/10"
                  } ${item.highlight ? "text-cyan-300 font-semibold" : ""}`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      item.highlight ? "text-cyan-400" : active ? "text-white" : "text-slate-300"
                    }`}
                  />
                  {item.label}
                  {item.highlight && (
                    <span className="ml-0.5 px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] rounded-full border border-cyan-400/40">
                      AI
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Balance & Profile */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/15 rounded-xl px-3.5 py-1.5 flex items-center gap-2">
            <div className="text-right">
              <div className="text-[10px] text-sky-200 uppercase font-semibold">Balance</div>
              <div className="text-sm font-bold text-white tracking-wide">
                ₹{balance.toLocaleString("en-IN")}
              </div>
            </div>
          </div>

          <div className="w-8 h-8 rounded-full bg-cyan-600 border border-white/30 flex items-center justify-center font-semibold text-xs text-white">
            {userName.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}
