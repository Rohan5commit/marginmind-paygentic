import { Finding, LocusPlan, LocusRuntimeStatus, SummaryMetrics, TaskProposal } from "@/lib/types";

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildTask(findings: Finding[], filterAction: Finding["recommendedAction"]): TaskProposal[] {
  return findings
    .filter((finding) => finding.recommendedAction === filterAction)
    .slice(0, 2)
    .map((finding) => {
      const timeline: TaskProposal["timeline"] = filterAction === "request_refund" ? "1 day" : "3 days";
      const priceTier: TaskProposal["priceTier"] =
        finding.estimatedAnnualSavings >= 1500 || finding.estimatedOneTimeRecovery >= 300 ? 2 : 1;
      const estimatedTaskCostUsdc = priceTier === 2 ? 14 : 8;
      const expectedSavingsUsdc =
        finding.estimatedOneTimeRecovery > 0 ? finding.estimatedOneTimeRecovery : finding.estimatedAnnualSavings;
      return {
        id: "task-" + finding.id,
        title:
          filterAction === "request_refund"
            ? "Refund request for " + finding.merchant
            : "Negotiation brief for " + finding.merchant,
        category: "Written Content",
        timeline,
        priceTier,
        estimatedTaskCostUsdc,
        expectedSavingsUsdc: roundCurrency(expectedSavingsUsdc),
        roiMultiple: roundCurrency(expectedSavingsUsdc / estimatedTaskCostUsdc),
        workProposal:
          filterAction === "request_refund"
            ? "Draft a concise refund request that cites low utilization, recent renewal timing, and the expected relationship value."
            : "Draft a vendor negotiation email that references spend history, benchmark pressure, and the target savings range."
      };
    })
    .filter((task) => task.roiMultiple >= 4);
}

export function buildLocusPlan(
  findings: Finding[],
  summary: SummaryMetrics,
  runtimeStatus?: LocusRuntimeStatus | null
): LocusPlan {
  const negotiationTasks = buildTask(findings, "negotiate");
  const refundTasks = buildTask(findings, "request_refund");
  const topFinding = findings[0];
  const liveConnected = runtimeStatus?.connected === true;
  const walletBalance = liveConnected && runtimeStatus?.balanceUsdc !== null ? runtimeStatus.balanceUsdc : 125;

  return {
    wallet: {
      balanceUsdc: walletBalance,
      allowanceUsdc: 150,
      approvalThresholdUsdc: 10,
      maxTransactionUsdc: 25,
      mode: liveConnected ? "live" : "simulation"
    },
    wrappedApiPlan: {
      provider: "openai",
      endpoint: "chat",
      purpose:
        topFinding?.recommendedAction === "replace"
          ? "Research cheaper alternatives for " + topFinding.merchant
          : "Validate pricing pressure and replacement options for the top finding",
      estimatedCostUsdc: 0.24,
      status: liveConnected ? "ready" : "simulated"
    },
    taskProposals: [...refundTasks, ...negotiationTasks].slice(0, 3),
    buildPlan: {
      projectName: "marginmind-renewal-guard",
      sourceRepo: "github.com/Rohan5commit/marginmind-paygentic",
      branch: "main",
      serviceName: "renewal-guard",
      estimatedCostUsdc: 1.4,
      projectedAnnualSavingsUsdc: Math.max(summary.monthlyWasteEstimate * 2, 900),
      healthcheckPath: "/health",
      status: liveConnected ? "prepared" : "simulated"
    },
    auditLog: [
      {
        id: "log-1",
        timestamp: "T+00:01",
        title: "Wallet policy loaded",
        detail: "Allowance, approval threshold, and max transaction rules were applied before action planning.",
        status: "complete"
      },
      {
        id: "log-2",
        timestamp: "T+00:02",
        title: liveConnected ? "Live Locus wallet connected" : "Locus wallet running in simulation",
        detail: runtimeStatus?.message || "Wallet checks completed.",
        status: liveConnected ? "complete" : "simulated"
      },
      {
        id: "log-3",
        timestamp: "T+00:04",
        title: "Wrapped API research justified",
        detail: "A low-cost research step was approved because the expected savings exceed the spend by a wide margin.",
        status: liveConnected ? "pending" : "simulated"
      },
      {
        id: "log-4",
        timestamp: "T+00:06",
        title: "Task escalation evaluated",
        detail: "Human escalation was only proposed where expected savings clear the task-cost hurdle.",
        status: "simulated"
      },
      {
        id: "log-5",
        timestamp: "T+00:07",
        title: "Build with Locus deployment drafted",
        detail: "A GitHub-backed renewal monitor service was prepared with a health check and projected annual savings.",
        status: liveConnected ? "pending" : "simulated"
      }
    ]
  };
}
