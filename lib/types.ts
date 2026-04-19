export type BillingPeriod = "monthly" | "annual" | "usage" | "one-time";
export type FindingType =
  | "duplicate"
  | "underused"
  | "pricing_outlier"
  | "rising_cost"
  | "refund"
  | "negotiation"
  | "monitor";

export type RecommendedAction =
  | "cancel"
  | "downgrade"
  | "request_refund"
  | "negotiate"
  | "replace"
  | "monitor";

export type Confidence = "high" | "medium" | "low";

export type Transaction = {
  id: string;
  date: string;
  merchant: string;
  description: string;
  category: string;
  amount: number;
  billingPeriod: BillingPeriod;
  cluster: string;
  usagePct: number | null;
  lastUsedDays: number | null;
  priceChangePct: number | null;
  benchmarkMonthly: number | null;
  contractType: string | null;
  refundCandidate: boolean;
  renewalDate: string | null;
  status: string;
};

export type Finding = {
  id: string;
  type: FindingType;
  merchant: string;
  title: string;
  summary: string;
  explanation: string;
  reasonCodes: string[];
  confidence: Confidence;
  severity: "critical" | "high" | "medium" | "low";
  recommendedAction: RecommendedAction;
  estimatedMonthlySavings: number;
  estimatedAnnualSavings: number;
  estimatedOneTimeRecovery: number;
  currentMonthlyCost: number;
  cluster: string;
};

export type SummaryMetrics = {
  monthlyWasteEstimate: number;
  annualizedWasteEstimate: number;
  oneTimeRecoveryEstimate: number;
  duplicateSubscriptionsFound: number;
  overpricedToolsDetected: number;
  actionableOpportunities: number;
  agentActionsPending: number;
  agentActionsCompleted: number;
  confidenceScore: number;
  highestPriorityAction: string;
};

export type AnalysisResult = {
  findings: Finding[];
  recurringCharges: Transaction[];
  summary: SummaryMetrics;
};

export type StrategyResponse = {
  summary: string;
  top_opportunities: string[];
  recommended_actions: string[];
  estimated_monthly_savings: number;
  estimated_annual_savings: number;
  confidence: Confidence;
};

export type ExplanationResponse = {
  explanation: string;
  action_rationale: string;
  confidence: Confidence;
};

export type WalletState = {
  balanceUsdc: number;
  allowanceUsdc: number;
  approvalThresholdUsdc: number;
  maxTransactionUsdc: number;
  mode: "simulation" | "live-ready";
};

export type TaskProposal = {
  id: string;
  title: string;
  category: string;
  timeline: "1 day" | "3 days" | "7 days";
  priceTier: 1 | 2 | 3;
  estimatedTaskCostUsdc: number;
  expectedSavingsUsdc: number;
  roiMultiple: number;
  workProposal: string;
};

export type WrappedApiPlan = {
  provider: string;
  endpoint: string;
  purpose: string;
  estimatedCostUsdc: number;
  status: "ready" | "pending_approval" | "simulated";
};

export type BuildDeploymentPlan = {
  projectName: string;
  sourceRepo: string;
  branch: string;
  serviceName: string;
  estimatedCostUsdc: number;
  projectedAnnualSavingsUsdc: number;
  healthcheckPath: string;
  status: "prepared" | "queued" | "simulated";
};

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  title: string;
  detail: string;
  status: "pending" | "simulated" | "complete";
};

export type LocusPlan = {
  wallet: WalletState;
  wrappedApiPlan: WrappedApiPlan;
  taskProposals: TaskProposal[];
  buildPlan: BuildDeploymentPlan;
  auditLog: AuditLogEntry[];
};
