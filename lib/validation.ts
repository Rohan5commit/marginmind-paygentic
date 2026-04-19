import { Finding, SummaryMetrics } from "@/lib/types";

const allowedFindingTypes = new Set<Finding["type"]>([
  "duplicate",
  "underused",
  "pricing_outlier",
  "rising_cost",
  "refund",
  "negotiation",
  "monitor"
]);

const allowedSeverity = new Set<Finding["severity"]>(["critical", "high", "medium", "low"]);
const allowedConfidence = new Set<Finding["confidence"]>(["high", "medium", "low"]);
const allowedAction = new Set<Finding["recommendedAction"]>([
  "cancel",
  "downgrade",
  "request_refund",
  "negotiate",
  "replace",
  "monitor"
]);

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown, maxLen = 300): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLen) return null;
  return trimmed;
}

function asNumber(value: unknown, min = 0, max = 1_000_000_000): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function asStringArray(value: unknown, maxItems = 12, maxItemLen = 80): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const normalized: string[] = [];
  for (const item of value) {
    const parsed = asString(item, maxItemLen);
    if (!parsed) return null;
    normalized.push(parsed);
  }
  return normalized;
}

function parseSummary(raw: unknown): SummaryMetrics | null {
  if (!isObject(raw)) return null;

  const monthlyWasteEstimate = asNumber(raw.monthlyWasteEstimate);
  const annualizedWasteEstimate = asNumber(raw.annualizedWasteEstimate);
  const oneTimeRecoveryEstimate = asNumber(raw.oneTimeRecoveryEstimate);
  const duplicateSubscriptionsFound = asNumber(raw.duplicateSubscriptionsFound, 0, 10_000);
  const overpricedToolsDetected = asNumber(raw.overpricedToolsDetected, 0, 10_000);
  const actionableOpportunities = asNumber(raw.actionableOpportunities, 0, 10_000);
  const agentActionsPending = asNumber(raw.agentActionsPending, 0, 10_000);
  const agentActionsCompleted = asNumber(raw.agentActionsCompleted, 0, 10_000);
  const confidenceScore = asNumber(raw.confidenceScore, 0, 100);
  const highestPriorityAction = asString(raw.highestPriorityAction, 220);

  if (
    monthlyWasteEstimate === null ||
    annualizedWasteEstimate === null ||
    oneTimeRecoveryEstimate === null ||
    duplicateSubscriptionsFound === null ||
    overpricedToolsDetected === null ||
    actionableOpportunities === null ||
    agentActionsPending === null ||
    agentActionsCompleted === null ||
    confidenceScore === null ||
    highestPriorityAction === null
  ) {
    return null;
  }

  return {
    monthlyWasteEstimate,
    annualizedWasteEstimate,
    oneTimeRecoveryEstimate,
    duplicateSubscriptionsFound,
    overpricedToolsDetected,
    actionableOpportunities,
    agentActionsPending,
    agentActionsCompleted,
    confidenceScore,
    highestPriorityAction
  };
}

function parseFinding(raw: unknown): Finding | null {
  if (!isObject(raw)) return null;

  const id = asString(raw.id, 120);
  const type = asString(raw.type, 40);
  const merchant = asString(raw.merchant, 120);
  const title = asString(raw.title, 200);
  const summary = asString(raw.summary, 600);
  const explanation = asString(raw.explanation, 1200);
  const reasonCodes = asStringArray(raw.reasonCodes, 16, 80);
  const confidence = asString(raw.confidence, 10);
  const severity = asString(raw.severity, 12);
  const recommendedAction = asString(raw.recommendedAction, 24);
  const estimatedMonthlySavings = asNumber(raw.estimatedMonthlySavings, 0, 1_000_000_000);
  const estimatedAnnualSavings = asNumber(raw.estimatedAnnualSavings, 0, 1_000_000_000);
  const estimatedOneTimeRecovery = asNumber(raw.estimatedOneTimeRecovery, 0, 1_000_000_000);
  const currentMonthlyCost = asNumber(raw.currentMonthlyCost, 0, 1_000_000_000);
  const cluster = asString(raw.cluster, 80);

  if (
    !id ||
    !type ||
    !merchant ||
    !title ||
    !summary ||
    !explanation ||
    !reasonCodes ||
    !confidence ||
    !severity ||
    !recommendedAction ||
    estimatedMonthlySavings === null ||
    estimatedAnnualSavings === null ||
    estimatedOneTimeRecovery === null ||
    currentMonthlyCost === null ||
    !cluster
  ) {
    return null;
  }

  if (!allowedFindingTypes.has(type as Finding["type"])) return null;
  if (!allowedConfidence.has(confidence as Finding["confidence"])) return null;
  if (!allowedSeverity.has(severity as Finding["severity"])) return null;
  if (!allowedAction.has(recommendedAction as Finding["recommendedAction"])) return null;

  return {
    id,
    type: type as Finding["type"],
    merchant,
    title,
    summary,
    explanation,
    reasonCodes,
    confidence: confidence as Finding["confidence"],
    severity: severity as Finding["severity"],
    recommendedAction: recommendedAction as Finding["recommendedAction"],
    estimatedMonthlySavings,
    estimatedAnnualSavings,
    estimatedOneTimeRecovery,
    currentMonthlyCost,
    cluster
  };
}

export function validateStrategyPayload(
  raw: unknown
): { summary: SummaryMetrics; findings: Finding[] } | null {
  if (!isObject(raw)) return null;
  const summary = parseSummary(raw.summary);
  if (!summary || !Array.isArray(raw.findings) || raw.findings.length === 0 || raw.findings.length > 50) {
    return null;
  }

  const findings: Finding[] = [];
  for (const item of raw.findings) {
    const parsed = parseFinding(item);
    if (!parsed) return null;
    findings.push(parsed);
  }

  return { summary, findings };
}

export function validateExplainPayload(
  raw: unknown
): { summary: SummaryMetrics; finding: Finding } | null {
  if (!isObject(raw)) return null;
  const summary = parseSummary(raw.summary);
  const finding = parseFinding(raw.finding);
  if (!summary || !finding) return null;
  return { summary, finding };
}
