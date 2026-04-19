import { runStrategyAgent } from "@/lib/nim";
import { Finding, SummaryMetrics } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      summary: SummaryMetrics;
      findings: Finding[];
    };

    const strategy = await runStrategyAgent(payload.summary, payload.findings);
    return Response.json(strategy);
  } catch (error) {
    return Response.json(
      {
        error: "strategy_failed",
        message: error instanceof Error ? error.message : "Unknown strategy failure"
      },
      { status: 500 }
    );
  }
}
