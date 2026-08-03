import { NextResponse } from "next/server";
import { processTelemetry } from "@/lib/grid-engine";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const poles = await prisma.pole.findMany({
      include: {
        telemetries: {
          orderBy: { timestamp: "desc" },
          take: 1,
        },
        parent: true,
        children: true,
      },
    });
    return NextResponse.json({ success: true, poles });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await processTelemetry(body);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
