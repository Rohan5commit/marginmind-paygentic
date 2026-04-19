import { buildFallbackExplanation, buildFallbackStrategy } from "@/lib/fallbacks";
import { ExplanationResponse, Finding, StrategyResponse, SummaryMetrics, Confidence } from "@/lib/types";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";

function extractJsonObject(raw: string): string {
  const fenced = raw.match(/\`\`\`json([\s\S]*?)\`\`\`/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

function normalizeConfidence(value: unknown): Confidence | null {
  if (value === "high" || value === "medium" || value === "low") return value;
  if (typeof value === "number") {
    if (value >= 85) return "high";
    if (value >= 65) return "medium";
    return "low";
  }
  if (typeof value === "string") {
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      if (numeric >= 85) return "high";
      if (numeric >= 65) return "medium";
      return "low";
    }
  }
  return null;
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function callNim(messages: Array<{ role: "system" | "user"; content: string }>, maxTokens: number): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not configured");
  }

  const response = await fetch(NIM_URL, {
    method: "POST",
    headers: {
      Authorization: "Bearer " + apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.NVIDIA_NIM_MODEL || DEFAULT_MODEL,
      temperature: 0.2,
      max_tokens: maxTokens,
      messages
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("NIM request failed with status " + String(response.status));
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("NIM returned an empty response");
  }
  return content;
}

export async function runStrategyAgent(summary: SummaryMetrics, findings: Finding[]): Promise<StrategyResponse> {
  const fallback = buildFallbackStrategy(summary, findings);
  const userPayload = JSON.stringify(
    {
      summary,
      findings: findings.slice(0, 6).map((finding) => ({
        title: finding.title,
        type: finding.type,
        merchant: finding.merchant,
        summary: finding.summary,
        action: finding.recommendedAction,
        monthly_savings: finding.estimatedMonthlySavings,
        annual_savings: finding.estimatedAnnualSavings,
        one_time_recovery: finding.estimatedOneTimeRecovery,
        confidence: finding.confidence
      }))
    },
    null,
    2
  );

  const systemPrompt =
    "You are a careful finance operations assistant. Be concise, specific, and skeptical. Never invent vendor behavior, unsupported savings, or fake certainty. Return valid JSON only with keys summary, top_opportunities, recommended_actions, estimated_monthly_savings, estimated_annual_savings, confidence. Confidence must be high, medium, or low.";

  const retryPrompt =
    "Return JSON only. No markdown. No prose before or after the object. Keys must exactly match the requested schema. Confidence must be one of high, medium, or low.";

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callNim(
        [
          { role: "system", content: attempt === 0 ? systemPrompt : systemPrompt + " " + retryPrompt },
          { role: "user", content: userPayload }
        ],
        900
      );
      const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
      const normalizedConfidence = normalizeConfidence(parsed.confidence);
      const monthly = normalizeNumber(parsed.estimated_monthly_savings);
      const annual = normalizeNumber(parsed.estimated_annual_savings);

      if (
        typeof parsed.summary === "string" &&
        Array.isArray(parsed.top_opportunities) &&
        Array.isArray(parsed.recommended_actions) &&
        monthly !== null &&
        annual !== null &&
        normalizedConfidence
      ) {
        return {
          summary: parsed.summary,
          top_opportunities: parsed.top_opportunities.filter((item): item is string => typeof item === "string"),
          recommended_actions: parsed.recommended_actions.filter((item): item is string => typeof item === "string"),
          estimated_monthly_savings: monthly,
          estimated_annual_savings: annual,
          confidence: normalizedConfidence
        };
      }
    } catch (error) {
      if (attempt === 1) {
        return fallback;
      }
    }
  }

  return fallback;
}

export async function explainFindingWithNim(finding: Finding, summary: SummaryMetrics): Promise<ExplanationResponse> {
  const fallback = buildFallbackExplanation(finding);
  const systemPrompt =
    "You are a careful finance operations assistant. Explain one finding in plain business language. Do not overclaim autonomy. Return valid JSON only with keys explanation, action_rationale, confidence. Confidence must be high, medium, or low.";
  const retryPrompt =
    "Return JSON only. No markdown. Confidence must be high, medium, or low.";

  const userPayload = JSON.stringify(
    {
      summary,
      finding: {
        title: finding.title,
        type: finding.type,
        merchant: finding.merchant,
        summary: finding.summary,
        explanation: finding.explanation,
        recommended_action: finding.recommendedAction,
        monthly_savings: finding.estimatedMonthlySavings,
        annual_savings: finding.estimatedAnnualSavings,
        one_time_recovery: finding.estimatedOneTimeRecovery,
        confidence: finding.confidence
      }
    },
    null,
    2
  );

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const content = await callNim(
        [
          { role: "system", content: attempt === 0 ? systemPrompt : systemPrompt + " " + retryPrompt },
          { role: "user", content: userPayload }
        ],
        500
      );
      const parsed = JSON.parse(extractJsonObject(content)) as Record<string, unknown>;
      const normalizedConfidence = normalizeConfidence(parsed.confidence);

      if (typeof parsed.explanation === "string" && typeof parsed.action_rationale === "string" && normalizedConfidence) {
        return {
          explanation: parsed.explanation,
          action_rationale: parsed.action_rationale,
          confidence: normalizedConfidence
        };
      }
    } catch (error) {
      if (attempt === 1) {
        return fallback;
      }
    }
  }

  return fallback;
}
