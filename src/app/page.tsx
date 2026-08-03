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
  const [msg, setMsg] = useState<string | null>(null);

  const showMsg = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 4000);
  };

  const fetchData = async () => {
    try {
      const resPoles = await fetch("/api/telemetry");
      const dataPoles = await resPoles.json();

      // Auto-seed on startup if empty
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
    showMsg("Grid seeded successfully.");
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
    showMsg(data.message || `Done: ${action}`);
  };

  const handleResolveTicket = async (ticketId: string) => {
    const res = await fetch("/api/tickets", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ticketId, status: "RESOLVED" }),
    });
    const data = await res.json();
    if (!data.success) {
      showMsg(`Error: ${data.error}`);
    } else {
      showMsg("Ticket marked as RESOLVED");
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
    <div style={{ fontFamily: "monospace", padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "20px", borderBottom: "2px solid #333", paddingBottom: "8px" }}>
        GridMonitor — Power Grid Fault Localization Dashboard
      </h1>
      <p style={{ color: "#555", fontSize: "13px" }}>
        Real-time telemetry ingestion and automated fault localization system.{" "}
        <span style={{ color: "green" }}>● System Live</span>
      </p>

      {msg && (
        <div style={{ background: "#fffbcc", border: "1px solid #ccc", padding: "8px 12px", marginTop: "10px", fontSize: "13px" }}>
          {msg}
        </div>
      )}

      {/* Controls */}
      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <strong>Controls:</strong>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
          <button
            onClick={handleSeed}
            disabled={loading}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #888", background: "#f0f0f0" }}
          >
            Reset / Seed Grid
          </button>
          <button
            onClick={() => handleSimulate("inject_span_fault")}
            disabled={loading}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #c00", background: "#fff0f0", color: "#c00" }}
          >
            Inject Line Span Fault (P2 → P3)
          </button>
          <button
            onClick={() => handleSimulate("inject_sensor_fault")}
            disabled={loading}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #a60", background: "#fffbf0", color: "#a60" }}
          >
            Inject Dead Sensor Noise (P2)
          </button>
          <button
            onClick={() => handleSimulate("inject_scheduled_outage")}
            disabled={loading}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #06c", background: "#f0f6ff", color: "#06c" }}
          >
            Inject Scheduled Maintenance
          </button>
          <button
            onClick={() => handleSimulate("repair_all")}
            disabled={loading}
            style={{ padding: "6px 12px", cursor: "pointer", border: "1px solid #080", background: "#f0fff0", color: "#080" }}
          >
            Restore Power (Auto-Verify Repair)
          </button>
        </div>
      </div>

      {/* Fault Tickets */}
      <div style={{ marginBottom: "30px" }}>
        <h2 style={{ fontSize: "16px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
          Fault Tickets ({tickets.length}) — Auto-localization active
        </h2>

        {tickets.length === 0 ? (
          <p style={{ color: "#888", fontSize: "13px" }}>No active faults. System operating normally.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "8px" }}>
            <thead>
              <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>ID</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Status</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Confidence</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Description</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Created</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <>
                  <tr key={t.id} style={{ background: t.status === "RESOLVED" ? "#f9f9f9" : "#fff5f5" }}>
                    <td style={{ border: "1px solid #ccc", padding: "6px", fontFamily: "monospace", fontSize: "11px" }}>
                      {t.id.slice(0, 8)}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                      <span style={{ color: t.status === "RESOLVED" ? "green" : "red" }}>
                        {t.status}
                      </span>
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                      {(t.confidence * 100).toFixed(0)}%
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>{t.description}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px", fontSize: "11px" }}>
                      {new Date(t.createdAt).toLocaleString()}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                      {t.status !== "RESOLVED" && (
                        <button
                          onClick={() => handleResolveTicket(t.id)}
                          style={{ padding: "3px 8px", cursor: "pointer", marginRight: "6px", fontSize: "12px" }}
                        >
                          Resolve
                        </button>
                      )}
                      <button
                        onClick={() => generateAiSummary(t)}
                        disabled={aiLoading[t.id]}
                        style={{ padding: "3px 8px", cursor: "pointer", fontSize: "12px" }}
                      >
                        {aiLoading[t.id] ? "..." : "AI Summary"}
                      </button>
                    </td>
                  </tr>
                  {aiSummaries[t.id] && (
                    <tr key={`ai-${t.id}`}>
                      <td colSpan={6} style={{ border: "1px solid #ccc", padding: "8px", background: "#f5f0ff", fontSize: "12px" }}>
                        <strong>AI Operator Summary:</strong> {aiSummaries[t.id]}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Live Poles */}
      <div>
        <h2 style={{ fontSize: "16px", borderBottom: "1px solid #ccc", paddingBottom: "4px" }}>
          Live Grid Poles &amp; Telemetry ({poles.length}) — updates every 3s
        </h2>

        {poles.length === 0 ? (
          <p style={{ color: "#888", fontSize: "13px" }}>No poles loaded. Click Reset / Seed Grid.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "8px" }}>
            <thead>
              <tr style={{ background: "#f4f4f4", textAlign: "left" }}>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Pole Name</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Device ID</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Latitude</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Longitude</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Status</th>
                <th style={{ border: "1px solid #ccc", padding: "6px" }}>Last Update</th>
              </tr>
            </thead>
            <tbody>
              {poles.map((p) => {
                const latest = p.telemetries[0];
                const isLive = latest ? latest.isLive : true;
                return (
                  <tr key={p.id} style={{ background: isLive ? "#fff" : "#fff0f0" }}>
                    <td style={{ border: "1px solid #ccc", padding: "6px", fontWeight: "bold" }}>{p.name}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px", fontFamily: "monospace", fontSize: "11px" }}>
                      {p.deviceId || "—"}
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>{p.latitude}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>{p.longitude}</td>
                    <td style={{ border: "1px solid #ccc", padding: "6px" }}>
                      <span style={{ color: isLive ? "green" : "red", fontWeight: "bold" }}>
                        {isLive ? "LIVE" : "DARK"}
                      </span>
                    </td>
                    <td style={{ border: "1px solid #ccc", padding: "6px", fontSize: "11px" }}>
                      {latest ? new Date(latest.timestamp).toLocaleTimeString() : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
