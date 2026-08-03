import { prisma } from "./prisma";

export interface TelemetryPayload {
  poleId: string;
  isLive: boolean;
  timestamp?: string;
  isScheduledOutage?: boolean;
}

export async function processTelemetry(payload: TelemetryPayload) {
  // 1. Record incoming telemetry
  await prisma.telemetry.create({
    data: {
      poleId: payload.poleId,
      isLive: payload.isLive,
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
    },
  });

  // 2. Ignore scheduled outages (Noise Filter: Scheduled Maintenance)
  if (payload.isScheduledOutage) {
    return { status: "ignored", reason: "Scheduled maintenance in progress" };
  }

  // 3. Run Fault Localization Algorithm across the grid
  return await evaluateGridState();
}

export async function evaluateGridState() {
  const poles = await prisma.pole.findMany({
    include: {
      children: true,
      parent: true,
      telemetries: {
        orderBy: { timestamp: "desc" },
        take: 1,
      },
    },
  });

  // Map latest status of each pole
  const poleStatusMap = new Map<string, boolean>();
  for (const pole of poles) {
    const latest = pole.telemetries[0];
    poleStatusMap.set(pole.id, latest ? latest.isLive : true);
  }

  const generatedTickets = [];

  // Check each pole for outages
  for (const pole of poles) {
    const isLive = poleStatusMap.get(pole.id);

    // Case A: Pole is Dark
    if (isLive === false) {
      // Noise Filter 1: Dead Sensor Check
      // If the current pole is dark, BUT all of its children are LIVE,
      // then power is flowing through this pole to children, so only the sensor on this pole died!
      const children = pole.children;
      const allChildrenLive =
        children.length > 0 &&
        children.every((child) => poleStatusMap.get(child.id) === true);

      if (allChildrenLive) {
        // Sensor fault, do not generate power line fault ticket
        continue;
      }

      // Check parent status to localize span
      if (pole.parent) {
        const parentIsLive = poleStatusMap.get(pole.parent.id);

        if (parentIsLive === true) {
          // Localized Fault Span identified: [pole.parent -> pole]
          const existingTicket = await prisma.faultTicket.findFirst({
            where: {
              spanStartPoleId: pole.parent.id,
              spanEndPoleId: pole.id,
              status: { in: ["PENDING", "CONFIRMED"] },
            },
          });

          if (!existingTicket) {
            const ticket = await prisma.faultTicket.create({
              data: {
                spanStartPoleId: pole.parent.id,
                spanEndPoleId: pole.id,
                status: "PENDING",
                confidence: 0.95,
                description: `Line fault detected on span between ${pole.parent.name} and ${pole.name}. High confidence topology match.`,
              },
            });
            generatedTickets.push(ticket);
          }
        }
      } else {
        // Unordered / Root Cluster (60% case without pole ordering)
        const existingTicket = await prisma.faultTicket.findFirst({
          where: {
            spanStartPoleId: pole.id,
            spanEndPoleId: pole.id,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
        });

        if (!existingTicket) {
          const ticket = await prisma.faultTicket.create({
            data: {
              spanStartPoleId: pole.id,
              spanEndPoleId: pole.id,
              status: "PENDING",
              confidence: 0.6,
              description: `Power outage detected in cluster area under ${pole.name}. Exact span unknown due to un-ordered pole topology.`,
            },
          });
          generatedTickets.push(ticket);
        }
      }
    }
  }

  // Auto-Verification: Auto-resolve tickets if telemetry indicates power is restored
  const openTickets = await prisma.faultTicket.findMany({
    where: { status: { in: ["PENDING", "CONFIRMED"] } },
  });

  for (const ticket of openTickets) {
    const startLive = poleStatusMap.get(ticket.spanStartPoleId);
    const endLive = poleStatusMap.get(ticket.spanEndPoleId);

    // If both poles of the localized fault span are now LIVE again, auto-resolve!
    if (startLive === true && endLive === true) {
      await prisma.faultTicket.update({
        where: { id: ticket.id },
        data: {
          status: "RESOLVED",
          resolvedAt: new Date(),
        },
      });
    }
  }

  return { generatedTicketsCount: generatedTickets.length };
}
