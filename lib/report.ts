import { AnalysisResult, ExplanationResponse, LocusPlan, StrategyResponse } from "@/lib/types";

export function buildMarkdownReport(params: {
  analysis: AnalysisResult;
  strategy: StrategyResponse | null;
  selectedExplanation: ExplanationResponse | null;
  locusPlan: LocusPlan;
}): string {
  const { analysis, strategy, selectedExplanation, locusPlan } = params;

  const lines: string[] = [
    "# MarginMind Savings Report",
    "",
    "## Topline",
    "- Monthly waste estimate: " + analysis.summary.monthlyWasteEstimate + " USDC",
    "- Annualized savings estimate: " + analysis.summary.annualizedWasteEstimate + " USDC",
    "- One-time recoverable estimate: " + analysis.summary.oneTimeRecoveryEstimate + " USDC",
    "- Confidence score: " + analysis.summary.confidenceScore + "/100",
    "",
    "## Highest Priority Action",
    analysis.summary.highestPriorityAction,
    "",
    "## Strategy Agent",
    strategy ? strategy.summary : "Strategy Agent not run yet.",
    ""
  ];

  if (strategy) {
    lines.push("### Recommended Actions");
    strategy.recommended_actions.forEach((action) => lines.push("- " + action));
    lines.push("");
  }

  lines.push("## Findings");
  analysis.findings.forEach((finding) => {
    lines.push("- " + finding.title);
    lines.push("  - Type: " + finding.type);
    lines.push("  - Action: " + finding.recommendedAction);
    lines.push("  - Monthly savings: " + finding.estimatedMonthlySavings + " USDC");
    lines.push("  - Annual savings: " + finding.estimatedAnnualSavings + " USDC");
    if (finding.estimatedOneTimeRecovery > 0) {
      lines.push("  - One-time recovery: " + finding.estimatedOneTimeRecovery + " USDC");
    }
    lines.push("  - Confidence: " + finding.confidence);
    lines.push("  - Summary: " + finding.summary);
  });
  lines.push("");

  if (selectedExplanation) {
    lines.push("## Selected Opportunity Explanation");
    lines.push(selectedExplanation.explanation);
    lines.push("");
    lines.push("### Action Rationale");
    lines.push(selectedExplanation.action_rationale);
    lines.push("");
  }

  lines.push("## Locus Action Layer");
  lines.push("- Wallet mode: " + locusPlan.wallet.mode);
  lines.push("- Wrapped API plan: " + locusPlan.wrappedApiPlan.provider + "/" + locusPlan.wrappedApiPlan.endpoint);
  lines.push("- Build with Locus service: " + locusPlan.buildPlan.projectName);
  lines.push("");

  if (locusPlan.taskProposals.length > 0) {
    lines.push("### Task Escalations");
    locusPlan.taskProposals.forEach((task) => {
      lines.push("- " + task.title);
      lines.push("  - Category: " + task.category);
      lines.push("  - Timeline: " + task.timeline);
      lines.push("  - Price tier: " + String(task.priceTier));
      lines.push("  - Estimated cost: " + task.estimatedTaskCostUsdc + " USDC");
      lines.push("  - Expected savings: " + task.expectedSavingsUsdc + " USDC");
      lines.push("  - ROI multiple: " + task.roiMultiple + "x");
    });
    lines.push("");
  }

  lines.push("## Audit Trail");
  locusPlan.auditLog.forEach((entry) => {
    lines.push("- " + entry.timestamp + " — " + entry.title + " (" + entry.status + ")");
    lines.push("  - " + entry.detail);
  });

  return lines.join("\n") + "\n";
}
