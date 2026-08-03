"use client";

import { useEffect, useState } from "react";

interface Telemetry {
  isLive: boolean;
  timestamp: string;
}

interface Pole {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  deviceId: string | null;
  parentId: string | null;
  parent?: Pole;
  telemetries: Telemetry[];
}

interface Ticket {
  id: string;
  createdAt: string;
  resolvedAt: string | null;
  status: string;
  confidence: number;
  description: string | null;
  spanStartPole?: Pole;
  spanEndPole?: Pole;
}

export default function Home() {
  const [poles, setPoles] = useState<Pole[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSummaries, setAiSummaries] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    try {
      const resPoles = await fetch("/api/telemetry");
      const dataPoles = await resPoles.json();
      
      // Auto-seed on startup if empty (Assignment Gate G3)
      if (dataPoles.success && dataPoles.poles.length === 0) {
        await fetch("/api/seed", { method: "POST" });
        const resPolesRetry = await fetch("/api/telemetry");
        const dataPolesRetry = await resPolesRetry.json();
        if (dataPolesRetry.success) setPoles(dataPolesRetry.poles);
      } else if (dataPoles.success) {
        setPoles(dataPoles.poles);
      }

      const resTickets = await fetch("/api/tickets");
      const dataTickets = await resTickets.json();
      if (dataTickets.success) setTickets(dataTickets.tickets);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleSeed = async () => {
    setLoading(true);
    await fetch("/api/seed", { method: "POST" });
    await fetchData();
    setLoading(false);
    showToast("Synthetic Grid Network Seeded!");
  };

  const handleSimulate = async (action: string) => {
    setLoading(true);
    const res = await fetch("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    await fetchData();
    setLoading(false);
    showToast(data.message || `Simulation executed: ${action}`);
  };

  const handleResolveTicket = async (ticketId: string) => {
    const res = await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, status: "RESOLVED" }),
    });
    const data = await res.json();
    if (!data.success) {
      showToast(`⚠️ ${data.error}`);
    } else {
      showToast("Ticket marked as RESOLVED");
      fetchData();
    }
  };

  const generateAiSummary = async (t: Ticket) => {
    setAiLoading((prev) => ({ ...prev, [t.id]: true }));
    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticketId: t.id,
          spanStart: t.spanStartPole?.name,
          spanEnd: t.spanEndPole?.name,
          confidence: t.confidence,
          description: t.description,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummaries((prev) => ({ ...prev, [t.id]: data.summary }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading((prev) => ({ ...prev, [t.id]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg transition-all animate-bounce">
          {toast}
        </div>
      )}

      {/* Navigation Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            ⚡ GridMonitor Control Room
          </h1>
          <p className="text-sm text-slate-400">
            Real-time Power Grid Telemetry & Automated Fault Localization System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-medium text-sm transition"
          >
            🔄 Reset / Seed Grid
          </button>
          <span className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950 border border-emerald-800 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            System Live
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Fault Simulator Controls */}
        <section className="bg-slate-900 border border-slate-800 rounded-lg p-5 flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-3 flex items-center gap-2">
            🛠️ Fault & Telemetry Simulator
          </h2>
          <p className="text-xs text-slate-400">
            Inject realistic faults to verify noise filtering, topology graph traversal, and auto-verification.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleSimulate("inject_span_fault")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-red-950/40 border border-red-800/60 hover:bg-red-900/50 transition group"
            >
              <div className="text-sm font-semibold text-red-400 group-hover:text-red-300">
                🔴 Inject Line Span Fault
              </div>
              <div className="text-xs text-slate-400 mt-1">
                De-energizes span [Pole P2 ➔ Pole P3]. Generates 0.95 high-confidence ticket.
              </div>
            </button>

            <button
              onClick={() => handleSimulate("inject_sensor_fault")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/50 transition group"
            >
              <div className="text-sm font-semibold text-amber-400 group-hover:text-amber-300">
                ⚠️ Inject Dead Sensor Noise
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Pole P2 sensor goes dark, but children stay live. Noise filter prevents false ticket!
              </div>
            </button>

            <button
              onClick={() => handleSimulate("inject_scheduled_outage")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-blue-950/40 border border-blue-800/60 hover:bg-blue-900/50 transition group"
            >
              <div className="text-sm font-semibold text-blue-400 group-hover:text-blue-300">
                📅 Inject Scheduled Maintenance
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Simulates scheduled outage window. Ticket generation is suppressed.
              </div>
            </button>

            <button
              onClick={() => handleSimulate("repair_all")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-emerald-950/40 border border-emerald-800/60 hover:bg-emerald-900/50 transition group mt-2"
            >
              <div className="text-sm font-semibold text-emerald-400 group-hover:text-emerald-300">
                💚 Restore Power (Auto-Verify Repair)
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Restores live telemetry to all poles. Automatically resolves active tickets!
              </div>
            </button>
          </div>
        </section>

        {/* Center/Right Column: Live Grid Poles & Tickets */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Active Tickets Panel */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>🎟️ Fault Incidents ({tickets.length})</span>
              <span className="text-xs text-slate-400 font-normal">Auto-localization active</span>
            </h2>

            {tickets.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No active grid faults detected. System operating normally.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-lg border ${
                      t.status === "RESOLVED"
                        ? "bg-slate-950 border-slate-800 opacity-60"
                        : "bg-slate-950 border-red-900/80"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-400">ID: {t.id.slice(0, 8)}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded ${
                            t.status === "RESOLVED"
                              ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                              : "bg-red-950 text-red-400 border border-red-800"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-xs text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/60">
                          Confidence: {(t.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {t.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolveTicket(t.id)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1 rounded border border-slate-700"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-slate-200 mb-2">{t.description}</p>

                    {/* AI Incident Summary Card */}
                    <div className="mt-3 p-3 bg-slate-900 border border-slate-800 rounded">
                      {aiSummaries[t.id] ? (
                        <div className="text-xs text-purple-300">
                          <span className="font-bold text-purple-400">🤖 AI Incident Summary:</span>{" "}
                          {aiSummaries[t.id]}
                        </div>
                      ) : (
                        <button
                          onClick={() => generateAiSummary(t)}
                          disabled={aiLoading[t.id]}
                          className="text-xs text-purple-400 hover:text-purple-300 underline flex items-center gap-1"
                        >
                          {aiLoading[t.id] ? "Generating Summary..." : "✨ Generate AI Operator Summary"}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Grid Topology Live Status */}
          <section className="bg-slate-900 border border-slate-800 rounded-lg p-5">
            <h2 className="text-lg font-semibold text-white border-b border-slate-800 pb-3 mb-4 flex items-center justify-between">
              <span>📍 Live Grid Poles & Telemetry ({poles.length})</span>
              <span className="text-xs text-slate-400 font-normal">Real-time status</span>
            </h2>

            {poles.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-sm">
                No poles loaded. Click "Reset / Seed Grid" above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {poles.map((p) => {
                  const latest = p.telemetries[0];
                  const isLive = latest ? latest.isLive : true;
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-slate-200">{p.name}</div>
                        <div className="text-xs text-slate-500 font-mono">
                          {p.latitude}, {p.longitude}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 ${
                          isLive
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-red-950 text-red-400 border border-red-800"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLive ? "bg-emerald-400" : "bg-red-400"
                          }`}
                        ></span>
                        {isLive ? "LIVE" : "DARK"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
