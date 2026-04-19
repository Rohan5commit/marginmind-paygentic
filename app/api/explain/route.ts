import { explainFindingWithNim } from "@/lib/nim";
import { enforcePayloadSize, enforceRateLimit } from "@/lib/security";
import { validateExplainPayload } from "@/lib/validation";

export async function POST(request: Request) {
  const payloadSizeError = enforcePayloadSize(request);
  if (payloadSizeError) return payloadSizeError;

  const rateLimitError = enforceRateLimit(request, "explain");
  if (rateLimitError) return rateLimitError;

  let validatedPayload: ReturnType<typeof validateExplainPayload> = null;
  try {
    const rawPayload = await request.json();
    validatedPayload = validateExplainPayload(rawPayload);
  } catch {
    return Response.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }

  if (!validatedPayload) {
    return Response.json(
      { error: "invalid_request", message: "Malformed explanation payload." },
      { status: 400 }
    );
  }

  try {
    const explanation = await explainFindingWithNim(validatedPayload.finding, validatedPayload.summary);
    return Response.json(explanation);
  } catch {
    return Response.json(
      { error: "explain_failed", message: "Unable to generate explanation right now." },
      { status: 502 }
    );
  }
}
