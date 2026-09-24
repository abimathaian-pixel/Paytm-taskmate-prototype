"use client";

import { useState, useEffect } from "react";
import { ShieldCheck, User, Bot, Wrench, Server, ChevronDown, ChevronUp } from "lucide-react";
import { api } from "../../lib/api";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [filterActor, setFilterActor] = useState<string>("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getAuditLogs()
      .then((data) => setLogs(data || []))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const getActorBadge = (actor: string) => {
    switch (actor) {
      case "USER":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            <User className="w-3 h-3" />
            USER
          </span>
        );
      case "AGENT":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            <Bot className="w-3 h-3" />
            AGENT
          </span>
        );
      case "TOOL":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            <Wrench className="w-3 h-3" />
            TOOL
          </span>
        );
      case "SYSTEM":
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">
            <Server className="w-3 h-3" />
            SYSTEM
          </span>
        );
      default:
        return <span>{actor}</span>;
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (filterActor === "ALL") return true;
    return log.actor === filterActor;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-paytm-lightBlue" />
            Immutable Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Tamper-resistant event ledger tracking every prompt, tool execution, user approval, and payment state.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {["ALL", "USER", "AGENT", "TOOL", "SYSTEM"].map((actor) => (
            <button
              key={actor}
              onClick={() => setFilterActor(actor)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filterActor === actor
                  ? "bg-paytm-blue text-white shadow-xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {actor}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Timeline */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="divide-y divide-slate-100">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              No audit records found.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const isExpanded = expandedId === log.id;
              return (
                <div
                  key={log.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition-colors"
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-xs text-slate-400 font-bold w-16 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>

                      <div className="shrink-0">{getActorBadge(log.actor)}</div>

                      <div>
                        <div className="font-bold text-slate-800 text-sm">
                          {log.action}
                        </div>
                        {log.taskId && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Task: {log.taskId}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 text-slate-400 text-xs">
                      <span className="hidden sm:inline-block">
                        {new Date(log.timestamp).toLocaleDateString()}
                      </span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {/* Expanded JSON details */}
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-slate-100">
                      <div className="text-[11px] font-bold text-slate-500 uppercase mb-1">
                        Payload Details
                      </div>
                      <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-xs font-mono overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
