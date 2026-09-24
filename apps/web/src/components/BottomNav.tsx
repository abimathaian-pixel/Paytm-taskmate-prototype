"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Wallet, Sparkles, Zap, ReceiptText, ShieldCheck } from "lucide-react";

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Home", icon: Wallet },
    { href: "/bills", label: "Bills", icon: Zap },
    {
      href: "/taskmate",
      label: "TaskMate",
      icon: Sparkles,
      highlight: true,
    },
    { href: "/transactions", label: "History", icon: ReceiptText },
    { href: "/audit", label: "Audit", icon: ShieldCheck },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-40 py-1.5 px-3 shadow-lg">
      <div className="flex items-center justify-around">
        {navItems.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;

          if (item.highlight) {
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center -mt-5"
              >
                <div className="w-12 h-12 rounded-full bg-paytm-blue border-2 border-paytm-lightBlue flex items-center justify-center text-white shadow-md">
                  <Icon className="w-6 h-6 text-paytm-lightBlue" />
                </div>
                <span className="text-[11px] font-bold text-paytm-blue mt-1">
                  {item.label}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center py-1 px-2 ${
                active ? "text-paytm-blue font-semibold" : "text-slate-500"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] mt-0.5">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
