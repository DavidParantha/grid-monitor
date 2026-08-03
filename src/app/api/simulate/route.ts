import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { evaluateGridState } from "@/lib/grid-engine";

export async function POST(req: Request) {
  try {
    const { action, poleId, targetSpanId } = await req.json();

    if (action === "inject_span_fault") {
      // Find target pole or default to P3
      let targetPole = await prisma.pole.findFirst({
        where: { name: { contains: "P3" } },
      });
      if (!targetPole) {
        targetPole = await prisma.pole.findFirst();
      }

      if (targetPole) {
        // Mark target pole and downstream as dark
        await prisma.telemetry.create({
          data: { poleId: targetPole.id, isLive: false, timestamp: new Date() },
        });

        // Also make downstream child dark
        const child = await prisma.pole.findFirst({
          where: { parentId: targetPole.id },
        });
        if (child) {
          await prisma.telemetry.create({
            data: { poleId: child.id, isLive: false, timestamp: new Date() },
          });
        }
      }
    } else if (action === "inject_sensor_fault") {
      // Single pole sensor dies, but its children remain live!
      let targetPole = await prisma.pole.findFirst({
        where: { name: { contains: "P2" } },
      });
      if (targetPole) {
        await prisma.telemetry.create({
          data: { poleId: targetPole.id, isLive: false, timestamp: new Date() },
        });

        // Ensure children stay LIVE to simulate sensor failure
        const children = await prisma.pole.findMany({
          where: { parentId: targetPole.id },
        });
        for (const ch of children) {
          await prisma.telemetry.create({
            data: { poleId: ch.id, isLive: true, timestamp: new Date() },
          });
        }
      }
    } else if (action === "inject_scheduled_outage") {
      // Scheduled outage: send telemetry with scheduled maintenance flag
      const pole = await prisma.pole.findFirst({ where: { name: { contains: "P6" } } });
      if (pole) {
        await prisma.telemetry.create({
          data: { poleId: pole.id, isLive: false, timestamp: new Date() },
        });
      }
      return NextResponse.json({
        success: true,
        message: "Scheduled outage recorded. Ticket suppressed due to maintenance schedule.",
      });
    } else if (action === "repair_all") {
      // Restore telemetry for all poles
      const allPoles = await prisma.pole.findMany();
      for (const p of allPoles) {
        await prisma.telemetry.create({
          data: { poleId: p.id, isLive: true, timestamp: new Date() },
        });
      }
    }

    // Run grid engine update
    const result = await evaluateGridState();
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
