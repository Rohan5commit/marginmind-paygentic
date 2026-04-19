import { runStrategyAgent } from "@/lib/nim";
import { enforcePayloadSize, enforceRateLimit } from "@/lib/security";
import { validateStrategyPayload } from "@/lib/validation";

export async function POST(request: Request) {
  const payloadSizeError = enforcePayloadSize(request);
  if (payloadSizeError) return payloadSizeError;

  const rateLimitError = enforceRateLimit(request, "strategy");
  if (rateLimitError) return rateLimitError;

  let validatedPayload: ReturnType<typeof validateStrategyPayload> = null;
  try {
    const rawPayload = await request.json();
    validatedPayload = validateStrategyPayload(rawPayload);
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!validatedPayload) {
    return Response.json(
      { error: "invalid_request", message: "Malformed strategy payload." },
      { status: 400 }
    );
  }

  try {
    const strategy = await runStrategyAgent(validatedPayload.summary, validatedPayload.findings);
    return Response.json(strategy);
  } catch {
    return Response.json(
      { error: "strategy_failed", message: "Unable to generate strategy right now." },
      { status: 502 }
    );
  }
}
