"use client";

import { startTransition, useEffect, useState, type ChangeEvent } from "react";
import { analyzeTransactions } from "@/lib/analysis";
import { parseTransactionsCsv } from "@/lib/csv";
import { buildLocusPlan } from "@/lib/locus";
import { buildMarkdownReport } from "@/lib/report";
import { AnalysisResult, ExplanationResponse, Finding, LocusPlan, LocusRuntimeStatus, StrategyResponse, Transaction } from "@/lib/types";

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value >= 100 ? 0 : 2
  }).format(value);
}

function badgeTone(confidence: Finding["confidence"]): string {
  if (confidence === "high") return "bg-emerald-500/12 text-emerald-700";
  if (confidence === "medium") return "bg-amber-500/12 text-amber-700";
  return "bg-rose-500/12 text-rose-700";
}

function actionTone(action: Finding["recommendedAction"]): string {
  if (action === "cancel" || action === "request_refund") return "text-emerald-700";
  if (action === "negotiate" || action === "replace") return "text-sky-700";
  if (action === "downgrade") return "text-amber-700";
  return "text-slate-600";
}

function statusTone(status: "pending" | "simulated" | "complete"): string {
  if (status === "complete") return "text-emerald-700";
  if (status === "pending") return "text-sky-700";
  return "text-amber-700";
}

function locusModeTone(mode: "live" | "simulation"): string {
  return mode === "live"
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : "bg-amber-100 text-amber-700 border-amber-200";
}

function MetricCard(props: { label: string; value: string; detail: string; tone?: string }) {
  return (
    <div className="surface rounded-3xl p-5 animate-rise">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{props.label}</div>
      <div className={"metric-value mt-3 " + (props.tone || "")}>{props.value}</div>
      <p className="mt-2 text-sm text-muted">{props.detail}</p>
    </div>
  );
}

function EmptyState(props: { onLoadSample: () => void; onUploadClick: () => void; loading: boolean }) {
  return (
    <section className="grid gap-6 lg:grid-cols-[1.25fr_0.95fr]">
      <div className="surface-strong grid-lines relative overflow-hidden rounded-[32px] p-8">
        <div className="max-w-2xl">
          <div className="kicker">Week 2 · Hack an Agent to Make You Money</div>
          <h1 className="mt-4 text-5xl font-semibold leading-tight text-ink">
            Catch SaaS waste before it compounds into next month’s burn.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted">
            MarginMind turns raw recurring spend into concrete savings actions, then routes the next step through a Locus-native wallet, task, and deployment layer.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500"
              onClick={props.onLoadSample}
            >
              {props.loading ? "Loading sample..." : "Load sample startup spend"}
            </button>
            <button
              className="rounded-full border border-slate-300 bg-white/70 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-white"
              onClick={props.onUploadClick}
            >
              Upload CSV
            </button>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["Duplicate analytics", "PostHog + Mixpanel overlap"],
              ["Refund window", "Framer annual renewal just hit"],
              ["Contract negotiation", "Datadog annual spend is large enough to challenge"]
            ].map(([title, detail], index) => (
              <div
                key={title}
                className="rounded-2xl border border-slate-200/70 bg-white/68 p-4 shadow-sm animate-rise"
                style={{ animationDelay: String(index * 90) + "ms" }}
              >
                <div className="text-sm font-semibold text-slate-900">{title}</div>
                <p className="mt-2 text-sm text-muted">{detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="surface rounded-[32px] p-6">
        <div className="kicker">Agent Stack</div>
        <div className="mt-4 space-y-4">
          {[
            ["Intake Agent", "Normalizes merchants, cadence, and cost signals."],
            ["Detection Agent", "Finds duplicates, rising costs, and recoverable charges."],
            ["Decision Agent", "Assigns cancel, downgrade, refund, replace, negotiate, or monitor."],
            ["Action Agent", "Maps the decision into Locus wallet-funded operations."],
            ["Task Escalation Agent", "Hires a human only when ROI beats task cost."],
            ["Strategy Agent", "Uses NVIDIA NIM to summarize the highest-value moves."]
          ].map(([title, detail]) => (
            <div key={title} className="rounded-2xl border border-slate-200/70 bg-white/60 p-4">
              <div className="font-semibold text-slate-900">{title}</div>
              <div className="mt-1 text-sm text-muted">{detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function DashboardApp() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isLoadingSample, setIsLoadingSample] = useState(false);
  const [isRunningStrategy, setIsRunningStrategy] = useState(false);
  const [isExplaining, setIsExplaining] = useState(false);
  const [strategy, setStrategy] = useState<StrategyResponse | null>(null);
  const [explanations, setExplanations] = useState<Record<string, ExplanationResponse>>({});
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(null);
  const [locusRuntimeStatus, setLocusRuntimeStatus] = useState<LocusRuntimeStatus | null>(null);
  const [isRefreshingLocus, setIsRefreshingLocus] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const analysis: AnalysisResult | null = transactions.length > 0 ? analyzeTransactions(transactions) : null;
  const locusPlan: LocusPlan | null = analysis ? buildLocusPlan(analysis.findings, analysis.summary, locusRuntimeStatus) : null;
  const selectedFinding = analysis?.findings.find((finding) => finding.id === selectedFindingId) || analysis?.findings[0] || null;
  const selectedExplanation = selectedFinding ? explanations[selectedFinding.id] || null : null;

  useEffect(() => {
    const storedTheme = typeof window !== "undefined" ? window.localStorage.getItem("marginmind-theme") : null;
    if (storedTheme === "dark" || storedTheme === "light") {
      setTheme(storedTheme);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("marginmind-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (!analysis?.findings.length) {
      setSelectedFindingId(null);
      return;
    }

    if (!selectedFindingId || !analysis.findings.some((finding) => finding.id === selectedFindingId)) {
      setSelectedFindingId(analysis.findings[0].id);
    }
  }, [analysis, selectedFindingId]);

  useEffect(() => {
    void refreshLocusStatus();
  }, []);

  async function refreshLocusStatus() {
    setIsRefreshingLocus(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/locus/status", { cache: "no-store" });
      if (!response.ok) {
        setLocusRuntimeStatus({
          connected: false,
          mode: "simulation",
          environment: "unknown",
          balanceUsdc: null,
          walletAddress: null,
          wrappedApiCatalogReachable: false,
          x402CatalogReachable: false,
          appsMarkdownReachable: false,
          buildWithLocusAvailable: false,
          hireWithLocusAvailable: false,
          message: "Unable to reach Locus status route. Running in simulation mode.",
          lastCheckedAt: new Date().toISOString()
        });
        setErrorMessage("Unable to refresh Locus status. Running in simulation mode.");
        return;
      }
      const payload = (await response.json()) as LocusRuntimeStatus;
      setLocusRuntimeStatus(payload);
    } catch {
      setLocusRuntimeStatus({
        connected: false,
        mode: "simulation",
        environment: "unknown",
        balanceUsdc: null,
        walletAddress: null,
        wrappedApiCatalogReachable: false,
        x402CatalogReachable: false,
        appsMarkdownReachable: false,
        buildWithLocusAvailable: false,
        hireWithLocusAvailable: false,
        message: "Locus status refresh failed. Running in simulation mode.",
        lastCheckedAt: new Date().toISOString()
      });
      setErrorMessage("Failed to refresh Locus status.");
    } finally {
      setIsRefreshingLocus(false);
    }
  }

  async function loadSampleData() {
    setIsLoadingSample(true);
    setStrategy(null);
    setErrorMessage(null);
    try {
      const response = await fetch("/data/seed-startup-spend.csv", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Sample data request failed");
      }
      const csvText = await response.text();
      const parsed = parseTransactionsCsv(csvText);
      startTransition(() => {
        setTransactions(parsed);
        setExplanations({});
      });
    } catch {
      setErrorMessage("Unable to load sample CSV.");
    } finally {
      setIsLoadingSample(false);
    }
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    try {
      const csvText = await file.text();
      const parsed = parseTransactionsCsv(csvText);
      startTransition(() => {
        setTransactions(parsed);
        setStrategy(null);
        setExplanations({});
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "CSV import failed.");
    } finally {
      event.target.value = "";
    }
  }

  async function runStrategyAgent() {
    if (!analysis) return;
    setIsRunningStrategy(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: analysis.summary,
          findings: analysis.findings
        })
      });

      if (!response.ok) {
        throw new Error("Strategy endpoint failed");
      }

      const payload = (await response.json()) as StrategyResponse;
      if (!payload || typeof payload.summary !== "string" || !Array.isArray(payload.top_opportunities)) {
        throw new Error("Strategy payload malformed");
      }

      setStrategy(payload);
    } catch {
      setErrorMessage("Unable to run Strategy Agent right now.");
    } finally {
      setIsRunningStrategy(false);
    }
  }

  async function explainSelectedFinding() {
    if (!analysis || !selectedFinding) return;
    if (explanations[selectedFinding.id]) return;
    setIsExplaining(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary: analysis.summary, finding: selectedFinding })
      });

      if (!response.ok) {
        throw new Error("Explain endpoint failed");
      }

      const payload = (await response.json()) as ExplanationResponse;
      if (!payload || typeof payload.explanation !== "string" || typeof payload.action_rationale !== "string") {
        throw new Error("Malformed explanation response");
      }

      setExplanations((current) => ({ ...current, [selectedFinding.id]: payload }));
    } catch {
      setErrorMessage("Unable to explain this finding right now.");
    } finally {
      setIsExplaining(false);
    }
  }

  function exportReport() {
    if (!analysis || !locusPlan) return;
    const markdown = buildMarkdownReport({
      analysis,
      strategy,
      selectedExplanation,
      locusPlan
    });
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "marginmind-savings-report.md";
    anchor.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6 lg:px-10">
      <input id="csv-upload" type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileUpload} />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="surface rounded-[28px] px-6 py-5">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="kicker">MarginMind</div>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <h2 className="text-2xl font-semibold text-ink">Autonomous spend optimization for startups and AI builders</h2>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
                  Locus-native action layer
                </span>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-muted">
                Detect waste, prioritize savings, and show how a governed agent could spend a little money through Locus to save much more.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                className="rounded-full border border-slate-300 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                onClick={() => document.getElementById("csv-upload")?.click()}
              >
                Upload CSV
              </button>
              <button
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                onClick={loadSampleData}
              >
                {transactions.length > 0 ? "Reload sample" : "Load sample"}
              </button>
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                onClick={refreshLocusStatus}
              >
                {isRefreshingLocus ? "Refreshing Locus..." : "Refresh Locus"}
              </button>
              <button
                className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                onClick={() => setTheme(theme === "light" ? "dark" : "light")}
              >
                {theme === "light" ? "Dark mode" : "Light mode"}
              </button>
            </div>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {errorMessage}
          </div>
        ) : null}

        {!analysis || !locusPlan ? (
          <EmptyState
            onLoadSample={loadSampleData}
            onUploadClick={() => document.getElementById("csv-upload")?.click()}
            loading={isLoadingSample}
          />
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
              <MetricCard
                label="Monthly Waste"
                value={formatCurrency(analysis.summary.monthlyWasteEstimate)}
                detail="Ongoing savings available from recurring spend corrections."
                tone="text-emerald-700"
              />
              <MetricCard
                label="Annualized Waste"
                value={formatCurrency(analysis.summary.annualizedWasteEstimate)}
                detail="Projected yearly upside if the recommended actions are taken."
              />
              <MetricCard
                label="Duplicates"
                value={String(analysis.summary.duplicateSubscriptionsFound)}
                detail="Overlapping tools the agent believes can be removed."
              />
              <MetricCard
                label="Overpriced Tools"
                value={String(analysis.summary.overpricedToolsDetected)}
                detail="Charges above explicit or inferred benchmark levels."
              />
              <MetricCard
                label="Actionable"
                value={String(analysis.summary.actionableOpportunities)}
                detail="Opportunities with a clear next step today."
              />
              <MetricCard
                label="Confidence"
                value={String(analysis.summary.confidenceScore) + "/100"}
                detail="Aggregated confidence across the current finding set."
              />
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
              <div className="surface-strong rounded-[32px] p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="kicker">Savings Command Center</div>
                    <h3 className="mt-2 text-3xl font-semibold text-ink">
                      Highest-priority move: {analysis.summary.highestPriorityAction}
                    </h3>
                  </div>
                  <button
                    className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                    onClick={exportReport}
                  >
                    Export report
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  {analysis.findings.map((finding, index) => {
                    const selected = selectedFinding?.id === finding.id;
                    const savingsValue = finding.estimatedOneTimeRecovery > 0 ? finding.estimatedOneTimeRecovery : finding.estimatedAnnualSavings;
                    return (
                      <button
                        key={finding.id}
                        className={
                          "w-full rounded-[26px] border p-5 text-left transition " +
                          (selected
                            ? "border-emerald-400 bg-emerald-50/80 shadow-lg"
                            : "border-slate-200/70 bg-white/72 hover:border-slate-300 hover:bg-white")
                        }
                        style={{ animationDelay: String(index * 80) + "ms" }}
                        onClick={() => setSelectedFindingId(finding.id)}
                      >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={"rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] " + badgeTone(finding.confidence)}>
                                {finding.confidence} confidence
                              </span>
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                                {finding.type.replaceAll("_", " ")}
                              </span>
                            </div>
                            <h4 className="mt-3 text-xl font-semibold text-ink">{finding.title}</h4>
                            <p className="mt-2 text-sm leading-6 text-muted">{finding.summary}</p>
                          </div>

                          <div className="min-w-[180px] rounded-2xl border border-slate-200/80 bg-slate-50/90 p-4">
                            <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Expected upside</div>
                            <div className="mt-2 text-3xl font-semibold text-ink">{formatCurrency(savingsValue)}</div>
                            <div className={"mt-2 text-sm font-semibold capitalize " + actionTone(finding.recommendedAction)}>
                              {finding.recommendedAction.replaceAll("_", " ")}
                            </div>
                            <div className="mt-1 text-xs text-muted">
                              Monthly cost today: {formatCurrency(finding.currentMonthlyCost)}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-6">
                <div className="surface rounded-[32px] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="kicker">Opportunity Detail</div>
                      <h3 className="mt-2 text-2xl font-semibold text-ink">
                        {selectedFinding?.merchant || "No finding selected"}
                      </h3>
                    </div>
                    <button
                      className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-white"
                      onClick={explainSelectedFinding}
                    >
                      {isExplaining ? "Explaining..." : "Explain with NIM"}
                    </button>
                  </div>

                  {selectedFinding ? (
                    <div className="mt-5 space-y-5">
                      <div className="rounded-[26px] bg-slate-950 p-5 text-white">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Plain-English readout</div>
                        <p className="mt-3 text-base leading-7 text-slate-100">
                          {(selectedExplanation && selectedExplanation.explanation) || selectedFinding.explanation}
                        </p>
                      </div>

                      <div className="rounded-[26px] border border-slate-200 bg-white/72 p-5">
                        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Action rationale</div>
                        <p className="mt-3 text-sm leading-7 text-muted">
                          {(selectedExplanation && selectedExplanation.action_rationale) ||
                            "Run the Strategy Agent or explanation endpoint to get an AI-generated rationale. The deterministic engine already recommends a " +
                              selectedFinding.recommendedAction.replaceAll("_", " ") +
                              " path based on spend shape, usage, and timing."}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-3">
                          {selectedFinding.reasonCodes.map((reasonCode) => (
                            <span key={reasonCode} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                              {reasonCode.replaceAll("_", " ")}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Monthly savings</div>
                          <div className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(selectedFinding.estimatedMonthlySavings)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Annual savings</div>
                          <div className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(selectedFinding.estimatedAnnualSavings)}</div>
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-white/70 p-4">
                          <div className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">One-time recovery</div>
                          <div className="mt-2 text-2xl font-semibold text-ink">{formatCurrency(selectedFinding.estimatedOneTimeRecovery)}</div>
                        </div>
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="surface rounded-[32px] p-6">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="kicker">Strategy Agent</div>
                      <h3 className="mt-2 text-2xl font-semibold text-ink">Founder-ready savings summary</h3>
                    </div>
                    <button
                      className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      onClick={runStrategyAgent}
                    >
                      {isRunningStrategy ? "Running..." : "Run strategy"}
                    </button>
                  </div>

                  <div className="mt-5 rounded-[26px] border border-slate-200 bg-white/72 p-5">
                    <p className="text-sm leading-7 text-muted">
                      {strategy?.summary ||
                        "Run the Strategy Agent to get a structured NIM summary of the current spend posture, highest-value opportunities, and recommended next actions."}
                    </p>

                    <div className="mt-5 grid gap-4 md:grid-cols-2">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Top opportunities</div>
                        <ul className="mt-3 space-y-3 text-sm text-slate-700">
                          {(strategy?.top_opportunities || analysis.findings.slice(0, 3).map((finding) => finding.title)).map((item) => (
                            <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Recommended actions</div>
                        <ul className="mt-3 space-y-3 text-sm text-slate-700">
                          {(strategy?.recommended_actions ||
                            analysis.findings.slice(0, 3).map((finding) => finding.recommendedAction.replaceAll("_", " ") + " " + finding.merchant)).map((item) => (
                            <li key={item} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 capitalize">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-3">
              <div className="surface rounded-[32px] p-6">
                <div className="kicker">Locus Wallet</div>
                <div className="mt-2 flex items-center gap-3">
                  <h3 className="text-2xl font-semibold text-ink">Governed agent balance</h3>
                  <span
                    className={
                      "rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] " +
                      locusModeTone(locusRuntimeStatus?.mode || "simulation")
                    }
                  >
                    {(locusRuntimeStatus?.mode || "simulation") === "live" ? "Live" : "Simulation"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-muted">
                  {locusRuntimeStatus?.message || "Locus status not checked yet. Use Refresh Locus to verify live connectivity."}
                </p>
                <div className="mt-5 rounded-[26px] bg-slate-950 p-5 text-white">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Available balance</div>
                  <div className="mt-2 text-4xl font-semibold">{formatCurrency(locusPlan.wallet.balanceUsdc)}</div>
                  <div className="mt-4 grid gap-4 md:grid-cols-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Allowance</div>
                      <div className="mt-1 text-lg font-semibold">{formatCurrency(locusPlan.wallet.allowanceUsdc)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Approval threshold</div>
                      <div className="mt-1 text-lg font-semibold">{formatCurrency(locusPlan.wallet.approvalThresholdUsdc)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-[0.14em] text-slate-400">Max transaction</div>
                      <div className="mt-1 text-lg font-semibold">{formatCurrency(locusPlan.wallet.maxTransactionUsdc)}</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-[26px] border border-slate-200 bg-white/72 p-5">
                  <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Wrapped API plan</div>
                  <div className="mt-3 text-lg font-semibold text-ink">
                    {locusPlan.wrappedApiPlan.provider}/{locusPlan.wrappedApiPlan.endpoint}
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted">{locusPlan.wrappedApiPlan.purpose}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="text-muted">Estimated cost</span>
                    <span className="font-semibold text-ink">{formatCurrency(locusPlan.wrappedApiPlan.estimatedCostUsdc)}</span>
                  </div>
                </div>
              </div>

              <div className="surface rounded-[32px] p-6">
                <div className="kicker">Build With Locus</div>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Deploy the renewal guard</h3>
                <div className="mt-5 rounded-[26px] border border-slate-200 bg-white/72 p-5">
                  <div className="text-sm font-semibold text-slate-900">{locusPlan.buildPlan.projectName}</div>
                  <p className="mt-2 text-sm leading-7 text-muted">
                    Draft a GitHub-backed monitor that watches renewal timing and posts alerts before unnecessary charges hit again.
                  </p>

                  <div className="mt-5 space-y-3 text-sm text-slate-700">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Source repo</span>
                      <span className="font-semibold">{locusPlan.buildPlan.sourceRepo}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Estimated deployment cost</span>
                      <span className="font-semibold">{formatCurrency(locusPlan.buildPlan.estimatedCostUsdc)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Projected annual savings capture</span>
                      <span className="font-semibold">{formatCurrency(locusPlan.buildPlan.projectedAnnualSavingsUsdc)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3">
                      <span>Health check</span>
                      <span className="font-semibold">{locusPlan.buildPlan.healthcheckPath}</span>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                    {(locusRuntimeStatus?.mode || "simulation") === "live"
                      ? "Live Locus key detected: this build is wallet-connected, and high-cost actions still stay in guarded/pending mode."
                      : "Simulation mode: action payloads are prepared, but no live Locus key is available in this deployment."}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {locusRuntimeStatus?.buildWithLocusAvailable ? "Build with Locus app detected" : "Build with Locus app not detected"}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      {locusRuntimeStatus?.hireWithLocusAvailable ? "Hire with Locus app detected" : "Hire with Locus app not detected"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="surface rounded-[32px] p-6">
                <div className="kicker">Locus Tasks</div>
                <h3 className="mt-2 text-2xl font-semibold text-ink">ROI-aware human escalation</h3>
                <div className="mt-5 space-y-4">
                  {locusPlan.taskProposals.length > 0 ? (
                    locusPlan.taskProposals.map((task) => (
                      <div key={task.id} className="rounded-[26px] border border-slate-200 bg-white/72 p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-lg font-semibold text-slate-900">{task.title}</div>
                            <div className="mt-1 text-sm text-muted">{task.workProposal}</div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
                            tier {task.priceTier}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Timeline</div>
                            <div className="mt-1 font-semibold text-slate-900">{task.timeline}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Expected ROI</div>
                            <div className="mt-1 font-semibold text-slate-900">{task.roiMultiple}x</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Task cost</div>
                            <div className="mt-1 font-semibold text-slate-900">{formatCurrency(task.estimatedTaskCostUsdc)}</div>
                          </div>
                          <div className="rounded-2xl bg-slate-50 px-4 py-3">
                            <div className="text-xs uppercase tracking-[0.14em] text-slate-500">Expected savings</div>
                            <div className="mt-1 font-semibold text-slate-900">{formatCurrency(task.expectedSavingsUsdc)}</div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[26px] border border-dashed border-slate-300 bg-white/60 p-5 text-sm text-muted">
                      No current task escalations clear the ROI threshold.
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
              <div className="surface rounded-[32px] p-6">
                <div className="kicker">Money Recovered Or Saved</div>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Agent log</h3>
                <div className="mt-5 space-y-4">
                  {locusPlan.auditLog.map((entry) => (
                    <div key={entry.id} className="rounded-[22px] border border-slate-200 bg-white/72 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-slate-900">{entry.title}</div>
                        <div className={"text-xs font-semibold uppercase tracking-[0.14em] " + statusTone(entry.status)}>{entry.status}</div>
                      </div>
                      <div className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{entry.timestamp}</div>
                      <p className="mt-2 text-sm leading-7 text-muted">{entry.detail}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="surface rounded-[32px] p-6">
                <div className="kicker">Recurring Spend Context</div>
                <h3 className="mt-2 text-2xl font-semibold text-ink">Live intake snapshot</h3>
                <div className="mt-5 overflow-hidden rounded-[26px] border border-slate-200">
                  <div className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr] bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">
                    <span>Merchant</span>
                    <span>Cluster</span>
                    <span>Monthly eq.</span>
                    <span>Usage</span>
                  </div>
                  <div className="max-h-[420px] overflow-y-auto bg-white/72 soft-scroll">
                    {analysis.recurringCharges.map((transaction) => {
                      const monthlyEquivalent = transaction.billingPeriod === "annual" ? transaction.amount / 12 : transaction.amount;
                      return (
                        <div
                          key={transaction.id}
                          className="grid grid-cols-[1.5fr_1fr_0.8fr_0.8fr] gap-3 border-t border-slate-200 px-4 py-4 text-sm text-slate-700"
                        >
                          <div>
                            <div className="font-semibold text-slate-900">{transaction.merchant}</div>
                            <div className="mt-1 text-xs text-muted">{transaction.description}</div>
                          </div>
                          <div className="capitalize">{transaction.cluster}</div>
                          <div>{formatCurrency(monthlyEquivalent)}</div>
                          <div>{transaction.usagePct !== null ? Math.round(transaction.usagePct * 100) + "%" : "n/a"}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
