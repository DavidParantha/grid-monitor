# ⚡ GridMonitor - Distribution Grid Fault Localization Engine

GridMonitor is a full-stack, real-time power distribution grid monitoring and automated fault localization platform built for utility operators.

## 🚀 Quick Start (One-Command Launch)

Start the development server with a single command:

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)** (or **http://localhost:3001** / **http://localhost:3002**) in your browser.

---

## 🛠️ Features

* **Directed Graph Topology Traversal (40% Case)**: Traverses known parent-child pole hierarchies to pinpoint the exact localized span between the deepest energized pole and its first dark child (0.95 confidence).
* **Graceful Degradation (60% Case)**: Handles transformers with un-ordered pole sets by localizing the outage to the geographic cluster area (0.60 confidence).
* **Noise Filtering**:
  * **Dead Sensor Filter**: Detects single dead sensors (dark pole with energized downstream children) without generating false line fault tickets.
  * **Scheduled Maintenance**: Suppresses tickets during maintenance windows.
* **Auto-Verification**: PENDING tickets are automatically verified and marked RESOLVED when line telemetry indicates power is restored.
* **AI Incident Summarizer**: Generates 2-sentence natural language summaries for control room operators.
* **Interactive Fault Simulator**: Built-in control panel to inject span faults, sensor failures, scheduled outages, and test repair flows.

---

## 📚 Project Documentation

* [ARCHITECTURE.md](ARCHITECTURE.md) – Localization algorithms, graph representation, noise filtering, and API endpoints.
* [DEPLOYMENT.md](DEPLOYMENT.md) – Deployment steps, environment configuration, and troubleshooting guide.
* [DECISIONS.md](DECISIONS.md) – Technical decision log, trade-offs, and future improvements.
* [AI-WORKFLOW.md](AI-WORKFLOW.md) – AI tooling breakdown and human verification process.
