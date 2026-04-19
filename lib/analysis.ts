import { AnalysisResult, Confidence, Finding, RecommendedAction, SummaryMetrics, Transaction } from "@/lib/types";

const duplicateClusters = new Set(["analytics", "design", "documentation", "video", "crm"]);
const severityRank = { critical: 4, high: 3, medium: 2, low: 1 } as const;

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function monthlyEquivalent(transaction: Transaction): number {
  if (transaction.billingPeriod === "annual") return transaction.amount / 12;
  if (transaction.billingPeriod === "one-time") return 0;
  return transaction.amount;
}

function buildFinding(input: {
  id: string;
  type: Finding["type"];
  merchant: string;
  title: string;
  summary: string;
  explanation: string;
  reasonCodes: string[];
  confidence: Confidence;
  severity: Finding["severity"];
  recommendedAction: RecommendedAction;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings?: number;
  estimatedOneTimeRecovery?: number;
  currentMonthlyCost: number;
  cluster: string;
}): Finding {
  const annual = input.estimatedAnnualSavings ?? input.estimatedMonthlySavings * 12;
  return {
    id: input.id,
    type: input.type,
    merchant: input.merchant,
    title: input.title,
    summary: input.summary,
    explanation: input.explanation,
    reasonCodes: input.reasonCodes,
    confidence: input.confidence,
    severity: input.severity,
    recommendedAction: input.recommendedAction,
    estimatedMonthlySavings: roundCurrency(input.estimatedMonthlySavings),
    estimatedAnnualSavings: roundCurrency(annual),
    estimatedOneTimeRecovery: roundCurrency(input.estimatedOneTimeRecovery ?? 0),
    currentMonthlyCost: roundCurrency(input.currentMonthlyCost),
    cluster: input.cluster
  };
}

function confidenceToScore(confidence: Confidence): number {
  if (confidence === "high") return 92;
  if (confidence === "medium") return 76;
  return 58;
}

export function analyzeTransactions(transactions: Transaction[]): AnalysisResult {
  const recurringCharges = transactions.filter((transaction) => transaction.billingPeriod !== "one-time");
  const findings: Finding[] = [];
  const duplicateProtectedIds = new Set<string>();

  const clusterMap = new Map<string, Transaction[]>();
  recurringCharges.forEach((transaction) => {
    const key = transaction.cluster.toLowerCase();
    const current = clusterMap.get(key) || [];
    current.push(transaction);
    clusterMap.set(key, current);
  });

  clusterMap.forEach((clusterTransactions, cluster) => {
    if (!duplicateClusters.has(cluster) || clusterTransactions.length < 2) return;
    const sorted = [...clusterTransactions].sort((a, b) => {
      const usageA = a.usagePct ?? 0.5;
      const usageB = b.usagePct ?? 0.5;
      const scoreA = usageA - monthlyEquivalent(a) / 1000;
      const scoreB = usageB - monthlyEquivalent(b) / 1000;
      return scoreB - scoreA;
    });
    const keeper = sorted[0];
    sorted.slice(1).forEach((transaction) => {
      duplicateProtectedIds.add(transaction.id);
      findings.push(
        buildFinding({
          id: "duplicate-" + transaction.id,
          type: "duplicate",
          merchant: transaction.merchant,
          title: transaction.merchant + " is likely redundant",
          summary: "Another active " + cluster + " tool already covers this job.",
          explanation:
            transaction.merchant +
            " sits in the same spend cluster as " +
            keeper.merchant +
            " while showing lower relative usage. MarginMind treats it as duplicate spend worth removing or replacing.",
          reasonCodes: ["overlapping-cluster", "duplicate-stack"],
          confidence: "high",
          severity: "high",
          recommendedAction: "cancel",
          estimatedMonthlySavings: monthlyEquivalent(transaction),
          currentMonthlyCost: monthlyEquivalent(transaction),
          cluster
        })
      );
    });
  });

  recurringCharges.forEach((transaction) => {
    const currentMonthlyCost = monthlyEquivalent(transaction);
    const isDuplicate = duplicateProtectedIds.has(transaction.id);

    if (isDuplicate) {
      return;
    }

    if (transaction.refundCandidate) {
      findings.push(
        buildFinding({
          id: "refund-" + transaction.id,
          type: "refund",
          merchant: transaction.merchant,
          title: transaction.merchant + " may still be refundable",
          summary: "Recent renewal timing and weak usage make a refund request plausible.",
          explanation:
            "The charge is recent enough to justify a refund request, but MarginMind labels it as likely rather than guaranteed because vendor policy ultimately decides the outcome.",
          reasonCodes: ["recent-renewal", "refund-window"],
          confidence: "medium",
          severity: "high",
          recommendedAction: "request_refund",
          estimatedMonthlySavings: 0,
          estimatedAnnualSavings: 0,
          estimatedOneTimeRecovery: transaction.amount,
          currentMonthlyCost,
          cluster: transaction.cluster
        })
      );
      return;
    }

    if (transaction.contractType === "annual_contract") {
      const contractSavings = transaction.benchmarkMonthly
        ? Math.max(currentMonthlyCost - transaction.benchmarkMonthly, currentMonthlyCost * 0.12)
        : currentMonthlyCost * 0.15;
      findings.push(
        buildFinding({
          id: "contract-" + transaction.id,
          type: "negotiation",
          merchant: transaction.merchant,
          title: transaction.merchant + " is worth negotiating",
          summary: "The contract size is large enough that negotiation effort is justified.",
          explanation:
            "High-dollar annual commitments deserve explicit renegotiation because even a modest discount produces meaningful savings.",
          reasonCodes: ["annual-contract", "high-ticket"],
          confidence: "medium",
          severity: "high",
          recommendedAction: "negotiate",
          estimatedMonthlySavings: contractSavings,
          currentMonthlyCost,
          cluster: transaction.cluster
        })
      );
      return;
    }

    if ((transaction.usagePct ?? 1) <= 0.25 && currentMonthlyCost >= 20) {
      const monthlySavings = currentMonthlyCost >= 60 ? currentMonthlyCost * 0.75 : currentMonthlyCost * 0.5;
      findings.push(
        buildFinding({
          id: "underused-" + transaction.id,
          type: "underused",
          merchant: transaction.merchant,
          title: transaction.merchant + " looks underused",
          summary: "Low utilization suggests a downgrade or cancellation is justified.",
          explanation:
            "Usage is below 25% while the monthly cost is still material. That makes this a straightforward downgrade or cancellation candidate.",
          reasonCodes: ["low-usage"],
          confidence: "high",
          severity: "medium",
          recommendedAction: currentMonthlyCost > 50 ? "downgrade" : "cancel",
          estimatedMonthlySavings: monthlySavings,
          currentMonthlyCost,
          cluster: transaction.cluster
        })
      );
      return;
    }

    if ((transaction.benchmarkMonthly ?? 0) > 0 && currentMonthlyCost > (transaction.benchmarkMonthly ?? 0) * 1.2) {
      const delta = currentMonthlyCost - (transaction.benchmarkMonthly ?? 0);
      findings.push(
        buildFinding({
          id: "pricing-" + transaction.id,
          type: "pricing_outlier",
          merchant: transaction.merchant,
          title: transaction.merchant + " is priced above benchmark",
          summary: "Current spend is materially higher than the supplied benchmark.",
          explanation:
            "The current monthly equivalent is above the benchmark threshold by more than 20%, so replacement or renegotiation should be on the table.",
          reasonCodes: ["benchmark-gap"],
          confidence: "medium",
          severity: currentMonthlyCost > 100 ? "high" : "medium",
          recommendedAction: "replace",
          estimatedMonthlySavings: delta,
          currentMonthlyCost,
          cluster: transaction.cluster
        })
      );
      return;
    }

    if ((transaction.priceChangePct ?? 0) >= 0.15) {
      const monthlySavings = currentMonthlyCost * Math.min(transaction.priceChangePct ?? 0, 0.35);
      findings.push(
        buildFinding({
          id: "rising-" + transaction.id,
          type: "rising_cost",
          merchant: transaction.merchant,
          title: transaction.merchant + " has a rising cost profile",
          summary: "Recent spend growth suggests optimization or plan review is overdue.",
          explanation:
            "The recorded price delta is high enough to justify intervention before the next billing cycle compounds the increase.",
          reasonCodes: ["price-increase"],
          confidence: "medium",
          severity: monthlySavings > 50 ? "high" : "medium",
          recommendedAction: "monitor",
          estimatedMonthlySavings: monthlySavings,
          currentMonthlyCost,
          cluster: transaction.cluster
        })
      );
    }
  });

  const deduped = Array.from(new Map(findings.map((finding) => [finding.id, finding])).values());

  deduped.sort((a, b) => {
    const valueA = a.estimatedOneTimeRecovery + a.estimatedAnnualSavings;
    const valueB = b.estimatedOneTimeRecovery + b.estimatedAnnualSavings;
    if (valueA !== valueB) return valueB - valueA;
    return severityRank[b.severity] - severityRank[a.severity];
  });

  const confidenceScore =
    deduped.length === 0
      ? 0
      : Math.round(deduped.reduce((total, finding) => total + confidenceToScore(finding.confidence), 0) / deduped.length);

  const summary: SummaryMetrics = {
    monthlyWasteEstimate: roundCurrency(deduped.reduce((total, finding) => total + finding.estimatedMonthlySavings, 0)),
    annualizedWasteEstimate: roundCurrency(deduped.reduce((total, finding) => total + finding.estimatedAnnualSavings, 0)),
    oneTimeRecoveryEstimate: roundCurrency(deduped.reduce((total, finding) => total + finding.estimatedOneTimeRecovery, 0)),
    duplicateSubscriptionsFound: deduped.filter((finding) => finding.type === "duplicate").length,
    overpricedToolsDetected: deduped.filter((finding) => finding.type === "pricing_outlier").length,
    actionableOpportunities: deduped.filter((finding) => finding.recommendedAction !== "monitor").length,
    agentActionsPending: deduped.filter((finding) => finding.recommendedAction !== "monitor").length,
    agentActionsCompleted: 0,
    confidenceScore,
    highestPriorityAction: deduped[0]?.title || "Load spend data to generate actions"
  };

  return {
    findings: deduped,
    recurringCharges,
    summary
  };
}
