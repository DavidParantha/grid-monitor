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
    <div className="min-h-screen bg-gray-100 text-gray-900 font-sans p-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}

      {/* Navigation Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-gray-300 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            ⚡ GridMonitor Control Room
          </h1>
          <p className="text-sm text-gray-500">
            Real-time Power Grid Telemetry &amp; Automated Fault Localization System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={loading}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded font-medium text-sm transition border border-gray-300"
          >
            🔄 Reset / Seed Grid
          </button>
          <span className="flex items-center gap-2 text-xs text-green-700 bg-green-100 border border-green-300 px-3 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            System Live
          </span>
        </div>
      </header>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Fault Simulator Controls */}
        <section className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-4 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-3 flex items-center gap-2">
            🛠️ Fault &amp; Telemetry Simulator
          </h2>
          <p className="text-xs text-gray-500">
            Inject realistic faults to verify noise filtering, topology graph traversal, and auto-verification.
          </p>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => handleSimulate("inject_span_fault")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-red-50 border border-red-200 hover:bg-red-100 transition"
            >
              <div className="text-sm font-semibold text-red-700">
                🔴 Inject Line Span Fault
              </div>
              <div className="text-xs text-gray-500 mt-1">
                De-energizes span [Pole P2 ➔ Pole P3]. Generates 0.95 high-confidence ticket.
              </div>
            </button>

            <button
              onClick={() => handleSimulate("inject_sensor_fault")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 transition"
            >
              <div className="text-sm font-semibold text-yellow-700">
                ⚠️ Inject Dead Sensor Noise
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Pole P2 sensor goes dark, but children stay live. Noise filter prevents false ticket!
              </div>
            </button>

            <button
              onClick={() => handleSimulate("inject_scheduled_outage")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
            >
              <div className="text-sm font-semibold text-blue-700">
                📅 Inject Scheduled Maintenance
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Simulates scheduled outage window. Ticket generation is suppressed.
              </div>
            </button>

            <button
              onClick={() => handleSimulate("repair_all")}
              disabled={loading}
              className="w-full text-left p-3 rounded bg-green-50 border border-green-200 hover:bg-green-100 transition mt-2"
            >
              <div className="text-sm font-semibold text-green-700">
                💚 Restore Power (Auto-Verify Repair)
              </div>
              <div className="text-xs text-gray-500 mt-1">
                Restores live telemetry to all poles. Automatically resolves active tickets!
              </div>
            </button>
          </div>
        </section>

        {/* Center/Right Column: Live Grid Poles & Tickets */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Active Tickets Panel */}
          <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-3 mb-4 flex items-center justify-between">
              <span>🎟️ Fault Incidents ({tickets.length})</span>
              <span className="text-xs text-gray-400 font-normal">Auto-localization active</span>
            </h2>

            {tickets.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No active grid faults detected. System operating normally.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {tickets.map((t) => (
                  <div
                    key={t.id}
                    className={`p-4 rounded-lg border ${
                      t.status === "RESOLVED"
                        ? "bg-gray-50 border-gray-200 opacity-70"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-gray-400">ID: {t.id.slice(0, 8)}</span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                            t.status === "RESOLVED"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : "bg-red-100 text-red-700 border-red-300"
                          }`}
                        >
                          {t.status}
                        </span>
                        <span className="text-xs text-yellow-700 bg-yellow-100 px-2 py-0.5 rounded border border-yellow-200">
                          Confidence: {(t.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                      {t.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolveTicket(t.id)}
                          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded border border-gray-300"
                        >
                          Mark Resolved
                        </button>
                      )}
                    </div>

                    <p className="text-sm text-gray-700 mb-2">{t.description}</p>

                    {/* AI Incident Summary Card */}
                    <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded">
                      {aiSummaries[t.id] ? (
                        <div className="text-xs text-purple-700">
                          <span className="font-bold text-purple-800">🤖 AI Incident Summary:</span>{" "}
                          {aiSummaries[t.id]}
                        </div>
                      ) : (
                        <button
                          onClick={() => generateAiSummary(t)}
                          disabled={aiLoading[t.id]}
                          className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center gap-1"
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
          <section className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-800 border-b border-gray-200 pb-3 mb-4 flex items-center justify-between">
              <span>📍 Live Grid Poles &amp; Telemetry ({poles.length})</span>
              <span className="text-xs text-gray-400 font-normal">Real-time status</span>
            </h2>

            {poles.length === 0 ? (
              <div className="py-8 text-center text-gray-400 text-sm">
                No poles loaded. Click &quot;Reset / Seed Grid&quot; above.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {poles.map((p) => {
                  const latest = p.telemetries[0];
                  const isLive = latest ? latest.isLive : true;
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-gray-50 border border-gray-200 rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-800">{p.name}</div>
                        <div className="text-xs text-gray-400 font-mono">
                          {p.latitude}, {p.longitude}
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded flex items-center gap-1.5 border ${
                          isLive
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-red-100 text-red-700 border-red-300"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isLive ? "bg-green-500" : "bg-red-500"
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
