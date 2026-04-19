import Papa from "papaparse";
import { Transaction, BillingPeriod } from "@/lib/types";

type RawRow = Record<string, string>;

function toNumber(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toBillingPeriod(value: string | undefined): BillingPeriod {
  const normalized = (value || "").trim().toLowerCase();
  if (normalized === "annual") return "annual";
  if (normalized === "usage") return "usage";
  if (normalized === "one-time") return "one-time";
  return "monthly";
}

export function parseTransactionsCsv(csvText: string): Transaction[] {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true
  });

  return parsed.data.map((row, index) => ({
    id: row.id || "txn-" + String(index + 1),
    date: row.date || "",
    merchant: row.merchant || "Unknown merchant",
    description: row.description || "",
    category: row.category || "uncategorized",
    amount: toNumber(row.amount) || 0,
    billingPeriod: toBillingPeriod(row.billing_period),
    cluster: row.cluster || row.category || "general",
    usagePct: toNumber(row.usage_pct),
    lastUsedDays: toNumber(row.last_used_days),
    priceChangePct: toNumber(row.price_change_pct),
    benchmarkMonthly: toNumber(row.benchmark_monthly),
    contractType: row.contract_type || null,
    refundCandidate: (row.refund_candidate || "").toLowerCase() === "true",
    renewalDate: row.renewal_date || null,
    status: row.status || "active"
  }));
}
