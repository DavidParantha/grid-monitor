# Technical Decisions & Architectural Log

## Decision 1: SQLite for Local Simplicity & Zero-Config
* **Choice**: SQLite (`dev.db`) for local development and execution.
* **Rejected**: Requiring external PostgreSQL server setup.
* **Rationale**: Eliminates Windows service conflicts, port binding issues, and complex setup steps for reviewers while retaining full Prisma ORM capability.

## Decision 2: 40% vs 60% Topology Degradation Strategy
* **Choice**: Tree-graph traversal for ordered 40% topology; cluster-area bounding box for un-ordered 60% topology.
* **Rejected**: Guessing sequence order for unmapped poles.
* **Rationale**: Prevents sending field repair crews to the wrong span while providing clear geographic bounds.

## Decision 3: Dead Sensor Noise Filtering
* **Choice**: Compare parent and child telemetry states before declaring line faults.
* **Rejected**: Naive single-pole outage alerting.
* **Rationale**: If child poles remain energized, power is flowing through the pole, proving the line is intact and only the telemetry sensor failed.
