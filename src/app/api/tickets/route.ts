import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tickets = await prisma.faultTicket.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        spanStartPole: true,
        spanEndPole: true,
      },
    });
    return NextResponse.json({ success: true, tickets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { ticketId, status } = await req.json();
    
    // Check auto-verification constraint:
    // If operator attempts manual resolution while poles are dark, push back unless auto-verified!
    const ticket = await prisma.faultTicket.findUnique({
      where: { id: ticketId },
      include: {
        spanStartPole: {
          include: { telemetries: { orderBy: { timestamp: "desc" }, take: 1 } },
        },
        spanEndPole: {
          include: { telemetries: { orderBy: { timestamp: "desc" }, take: 1 } },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: "Ticket not found" }, { status: 404 });
    }

    if (status === "RESOLVED") {
      const startLive = ticket.spanStartPole.telemetries[0]?.isLive ?? true;
      const endLive = ticket.spanEndPole.telemetries[0]?.isLive ?? true;

      if (!startLive || !endLive) {
        return NextResponse.json(
          {
            success: false,
            error: "Verification Rejected: Cannot mark ticket resolved while line telemetry indicates poles are still un-energized.",
          },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.faultTicket.update({
      where: { id: ticketId },
      data: {
        status,
        resolvedAt: status === "RESOLVED" ? new Date() : undefined,
      },
    });

    return NextResponse.json({ success: true, ticket: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
