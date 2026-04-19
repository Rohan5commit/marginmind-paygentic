import { explainFindingWithNim } from "@/lib/nim";
import { Finding, SummaryMetrics } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      summary: SummaryMetrics;
      finding: Finding;
    };

    const explanation = await explainFindingWithNim(payload.finding, payload.summary);
    return Response.json(explanation);
  } catch (error) {
    return Response.json(
      {
        error: "explain_failed",
        message: error instanceof Error ? error.message : "Unknown explanation failure"
      },
      { status: 500 }
    );
  }
}
