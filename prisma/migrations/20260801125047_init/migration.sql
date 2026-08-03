-- CreateTable
CREATE TABLE "Pole" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "deviceId" TEXT,
    "parentId" TEXT,
    CONSTRAINT "Pole_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Pole" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Telemetry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poleId" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isLive" BOOLEAN NOT NULL,
    CONSTRAINT "Telemetry_poleId_fkey" FOREIGN KEY ("poleId") REFERENCES "Pole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FaultTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "spanStartPoleId" TEXT NOT NULL,
    "spanEndPoleId" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "description" TEXT,
    CONSTRAINT "FaultTicket_spanStartPoleId_fkey" FOREIGN KEY ("spanStartPoleId") REFERENCES "Pole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FaultTicket_spanEndPoleId_fkey" FOREIGN KEY ("spanEndPoleId") REFERENCES "Pole" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Pole_name_key" ON "Pole"("name");
