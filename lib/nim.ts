import { buildFallbackExplanation, buildFallbackStrategy } from "@/lib/fallbacks";
import { ExplanationResponse, Finding, StrategyResponse, SummaryMetrics, Confidence } from "@/lib/types";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const DEFAULT_MODEL = "meta/llama-3.1-70b-instruct";
const DEFAULT_TIMEOUT_MS = 12_000;

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

function toStringArray(value: unknown, maxItems = 8): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > maxItems) return null;
  const normalized: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return null;
    const trimmed = item.trim();
    if (!trimmed || trimmed.length > 240) return null;
    normalized.push(trimmed);
  }
  return normalized;
}

function readTimeoutMs(): number {
  const parsed = Number(process.env.NIM_TIMEOUT_MS);
  if (Number.isFinite(parsed) && parsed >= 1_000 && parsed <= 60_000) return Math.floor(parsed);
  return DEFAULT_TIMEOUT_MS;
}

async function callNim(messages: Array<{ role: "system" | "user"; content: string }>, maxTokens: number): Promise<string> {
  const apiKey = process.env.NVIDIA_NIM_API_KEY;
  if (!apiKey) {
    throw new Error("NVIDIA_NIM_API_KEY is not configured");
  }

  const timeoutMs = readTimeoutMs();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("nim_timeout"), timeoutMs);

  try {
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
      cache: "no-store",
      signal: controller.signal
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
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("NIM request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
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
    "Return JSON only. No markdown. No prose before or after the object. Keys must exactly match the requested schema. top_opportunities and recommended_actions must be non-empty arrays of short strings. Confidence must be one of high, medium, or low.";

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
      const topOpportunities = toStringArray(parsed.top_opportunities);
      const recommendedActions = toStringArray(parsed.recommended_actions);
      const summaryText = typeof parsed.summary === "string" ? parsed.summary.trim() : null;

      if (
        summaryText &&
        summaryText.length <= 1_200 &&
        topOpportunities &&
        recommendedActions &&
        monthly !== null &&
        annual !== null &&
        normalizedConfidence
      ) {
        return {
          summary: summaryText,
          top_opportunities: topOpportunities,
          recommended_actions: recommendedActions,
          estimated_monthly_savings: monthly,
          estimated_annual_savings: annual,
          confidence: normalizedConfidence
        };
      }
    } catch {
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
    "Return JSON only. No markdown. explanation and action_rationale must be concise strings. Confidence must be high, medium, or low.";

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
      const explanation = typeof parsed.explanation === "string" ? parsed.explanation.trim() : null;
      const actionRationale = typeof parsed.action_rationale === "string" ? parsed.action_rationale.trim() : null;

      if (
        explanation &&
        explanation.length <= 1_500 &&
        actionRationale &&
        actionRationale.length <= 1_500 &&
        normalizedConfidence
      ) {
        return {
          explanation,
          action_rationale: actionRationale,
          confidence: normalizedConfidence
        };
      }
    } catch {
      if (attempt === 1) {
        return fallback;
      }
    }
  }

  return fallback;
}
