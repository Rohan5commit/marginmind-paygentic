import { ExplanationResponse, Finding, StrategyResponse, SummaryMetrics } from "@/lib/types";

export function buildFallbackStrategy(summary: SummaryMetrics, findings: Finding[]): StrategyResponse {
  const topOpportunities = findings.slice(0, 3).map((finding) => finding.title);
  const recommendedActions = findings
    .slice(0, 3)
    .map((finding) => finding.recommendedAction.replaceAll("_", " ") + " " + finding.merchant.toLowerCase());

  return {
    summary:
      "MarginMind found the biggest savings in duplicate tooling, contract negotiation, and low-usage subscriptions. Prioritize actions that remove recurring waste before spending effort on lower-confidence items.",
    top_opportunities: topOpportunities,
    recommended_actions: recommendedActions,
    estimated_monthly_savings: summary.monthlyWasteEstimate,
    estimated_annual_savings: summary.annualizedWasteEstimate,
    confidence: summary.confidenceScore >= 85 ? "high" : summary.confidenceScore >= 70 ? "medium" : "low"
  };
}

export function buildFallbackExplanation(finding: Finding): ExplanationResponse {
  return {
    explanation: finding.explanation,
    action_rationale:
      "Recommended action: " +
      finding.recommendedAction.replaceAll("_", " ") +
      ". Expected monthly savings are " +
      String(finding.estimatedMonthlySavings) +
      " USDC and one-time recovery is " +
      String(finding.estimatedOneTimeRecovery) +
      " USDC where applicable.",
    confidence: finding.confidence
  };
}
