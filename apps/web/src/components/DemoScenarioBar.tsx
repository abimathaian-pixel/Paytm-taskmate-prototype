"use client";

import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { Sparkles, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export function DemoScenarioBar() {
  const [scenario, setScenario] = useState<string>("SUCCESS");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .getDemoScenario()
      .then((res: any) => {
        if (res?.currentScenario) setScenario(res.currentScenario);
      })
      .catch(() => {});
  }, []);

  const handleSelect = async (val: string) => {
    setScenario(val);
    setSaving(true);
    try {
      await api.setDemoScenario(val);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  const [resetting, setResetting] = useState(false);

  const handleResetDb = async () => {
    setResetting(true);
    try {
      await api.setDemoScenario("SUCCESS");
      setScenario("SUCCESS");
      await api.resetDatabase();
      window.dispatchEvent(new CustomEvent("taskmate:state_changed"));
      window.location.reload();
    } catch (e) {
      console.error("Failed to reset DB:", e);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-slate-900 via-paytm-blue to-slate-900 text-white px-4 py-2 border-b border-slate-700 text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-semibold tracking-wide flex items-center gap-1 text-slate-200">
            <Sparkles className="w-3.5 h-3.5 text-paytm-lightBlue" />
            Hackathon Demo Scenarios:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1 sm:gap-2">
          {[
            { id: "SUCCESS", label: "Normal (Success)" },
            { id: "TECHNICAL_FAILURE", label: "Tech Error (Retry 1x)" },
            { id: "INSUFFICIENT_BALANCE", label: "Low Balance" },
            { id: "PENDING", label: "Pending (Poll)" },
            { id: "UNKNOWN", label: "Unknown Result" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item.id)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                scenario === item.id
                  ? "bg-paytm-lightBlue text-white shadow-sm ring-1 ring-white/50"
                  : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
              }`}
            >
              {item.label}
            </button>
          ))}
          {saving && <RefreshCw className="w-3 h-3 animate-spin text-slate-400 ml-1" />}

          <button
            onClick={handleResetDb}
            disabled={resetting}
            title="Clears and restores pristine seeded demo data"
            className="ml-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-all flex items-center gap-1"
          >
            <RefreshCw className={`w-3 h-3 ${resetting ? "animate-spin" : ""}`} />
            {resetting ? "Resetting..." : "Reset DB"}
          </button>
        </div>
      </div>
    </div>
  );
}
