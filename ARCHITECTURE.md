# Architecture & Technical Design

## System Overview

```
[ Pole Telemetry Devices ] ──> /api/telemetry ──> [ Grid Engine Evaluator ]
                                                         │
                                    ┌────────────────────┴────────────────────┐
                                    ▼                                         ▼
                        (40% Known Topology)                      (60% Unordered Set)
                    Graph Search (Deepest Live ➔ Dark)         Geographic Cluster Bounding
                                    │                                         │
                                    └────────────────────┬────────────────────┘
                                                         ▼
                                               [ Fault Ticket DB ]
                                                         │
                                                         ▼
                                             [ Operator Dashboard UI ]
```

## Data Sourcing and Ingestion
Telemetry packets are ingested via `POST /api/telemetry`. Out-of-order packets are handled by comparing timestamp parameters against stored telemetry records.

## Storage and Internal Model
* **Pole**: Represents a physical distribution pole or Distribution Transformer (DT) root. Poles maintain optional `parentId` self-relations forming a directed tree.
* **Telemetry**: Stores timeseries heartbeat entries (`isLive: boolean`, `timestamp`).
* **FaultTicket**: Records localized faults with confidence scores (0.0 - 1.0) and span references (`spanStartPoleId`, `spanEndPoleId`).

## Localization Algorithm
1. **Tree Traversal (40% Topology Available)**: For dark poles with verified parents, the engine locates the boundary span `[P_parent -> P_dark]` where `P_parent` is live and `P_dark` is dark. High confidence (0.95).
2. **Cluster Grouping (60% Topology Missing)**: For dark poles under un-ordered DT roots, the fault is assigned to the cluster area without asserting an unmapped span (0.60 confidence).

## Noise Handling
* **Dead Sensor vs Outage**: If pole `P` is dark, but ALL child poles are live, the anomaly is flagged as a sensor device failure rather than a grid line fault.
* **Scheduled Outage**: Outage telemetry tagged with scheduled maintenance flags is ignored.

## API Surface
* `GET /api/telemetry` – Fetch current pole grid state
* `POST /api/telemetry` – Ingest live telemetry payload
* `GET /api/tickets` – List active/resolved fault tickets
* `PATCH /api/tickets` – Update ticket status (with auto-verification guards)
* `POST /api/simulate` – Inject test faults (span fault, sensor failure, maintenance, repair)
* `POST /api/seed` – Reset and seed synthetic grid topology
* `POST /api/ai-summary` – Generate 2-sentence operator incident summary
