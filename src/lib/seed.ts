import { prisma } from "./prisma";

export async function seedDatabase() {
  // Clear existing records
  await prisma.faultTicket.deleteMany();
  await prisma.telemetry.deleteMany();
  await prisma.pole.deleteMany();

  // Create Distribution Transformer Root 1 (Known Topology Tree)
  const dt1 = await prisma.pole.create({
    data: {
      name: "DT-101 (Substation Alpha - Ordered Tree)",
      latitude: 12.9716,
      longitude: 77.5946,
      deviceId: "DEV-DT101",
    },
  });

  const p1 = await prisma.pole.create({
    data: {
      name: "Pole P1 (Main Feeder)",
      latitude: 12.972,
      longitude: 77.595,
      deviceId: "DEV-P1",
      parentId: dt1.id,
    },
  });

  const p2 = await prisma.pole.create({
    data: {
      name: "Pole P2 (Branch Junction)",
      latitude: 12.9725,
      longitude: 77.5955,
      deviceId: "DEV-P2",
      parentId: p1.id,
    },
  });

  const p3 = await prisma.pole.create({
    data: {
      name: "Pole P3 (Sub-branch A)",
      latitude: 12.973,
      longitude: 77.596,
      deviceId: "DEV-P3",
      parentId: p2.id,
    },
  });

  const p4 = await prisma.pole.create({
    data: {
      name: "Pole P4 (Terminal Node A)",
      latitude: 12.9735,
      longitude: 77.5965,
      deviceId: "DEV-P4",
      parentId: p3.id,
    },
  });

  const p5 = await prisma.pole.create({
    data: {
      name: "Pole P5 (Terminal Node B)",
      latitude: 12.9728,
      longitude: 77.597,
      deviceId: "DEV-P5",
      parentId: p2.id,
    },
  });

  // Create Distribution Transformer Root 2 (60% Unordered Set - No Topology)
  const dt2 = await prisma.pole.create({
    data: {
      name: "DT-202 (Unordered Cluster - No Pole Ordering)",
      latitude: 12.98,
      longitude: 77.6,
      deviceId: "DEV-DT202",
    },
  });

  const p6 = await prisma.pole.create({
    data: {
      name: "Pole P6 (Unordered Sector 1)",
      latitude: 12.9805,
      longitude: 77.601,
      deviceId: "DEV-P6",
      parentId: dt2.id,
    },
  });

  const p7 = await prisma.pole.create({
    data: {
      name: "Pole P7 (Unordered Sector 2)",
      latitude: 12.981,
      longitude: 77.6015,
      deviceId: "DEV-P7",
      parentId: dt2.id,
    },
  });

  const p8 = await prisma.pole.create({
    data: {
      name: "Pole P8 (Unordered Sector 3)",
      latitude: 12.9815,
      longitude: 77.602,
      deviceId: "DEV-P8",
      parentId: dt2.id,
    },
  });

  // Initial live telemetry for all poles
  const allPoles = [dt1, p1, p2, p3, p4, p5, dt2, p6, p7, p8];
  for (const pole of allPoles) {
    await prisma.telemetry.create({
      data: {
        poleId: pole.id,
        isLive: true,
        timestamp: new Date(),
      },
    });
  }

  return { message: "Synthetic grid network seeded successfully", count: allPoles.length };
}
