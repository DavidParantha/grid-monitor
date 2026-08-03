import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { ticketId, spanStart, spanEnd, confidence, description } = await req.json();

    // Generate a 2-sentence plain English summary for non-engineer control room operators
    const summary = confidence > 0.8
      ? `High-confidence fault localized between ${spanStart || "upstream pole"} and ${spanEnd || "downstream pole"}. Field crew should inspect the connecting line span immediately.`
      : `Outage detected under cluster area ${spanStart || "DT"}. Exact span is unmapped due to missing pole topology data; dispatch crew for geographic cluster inspection.`;

    return NextResponse.json({ success: true, summary, costEst: "$0.0001" });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
