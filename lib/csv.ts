import Papa from "papaparse";
import { Transaction, BillingPeriod } from "@/lib/types";

type RawRow = Record<string, string>;
const REQUIRED_COLUMNS = ["date", "merchant", "amount", "billing_period"] as const;

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

function normalizeText(value: string | undefined, fallback: string): string {
  const cleaned = (value || "").trim().replace(/\s+/g, " ");
  return cleaned || fallback;
}

function normalizeMerchant(merchant: string): string {
  const cleaned = merchant
    .replace(/[.,]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  const aliases: Array<{ pattern: RegExp; canonical: string }> = [
    { pattern: /^aws|amazon web services/, canonical: "AWS" },
    { pattern: /^open ai|^openai/, canonical: "OpenAI" },
    { pattern: /^anthropic/, canonical: "Anthropic" },
    { pattern: /^google cloud|^gcp/, canonical: "Google Cloud" },
    { pattern: /^microsoft azure|^azure/, canonical: "Azure" },
    { pattern: /^github/, canonical: "GitHub" },
    { pattern: /^cloudflare/, canonical: "Cloudflare" },
    { pattern: /^datadog/, canonical: "Datadog" },
    { pattern: /^mixpanel/, canonical: "Mixpanel" },
    { pattern: /^posthog/, canonical: "PostHog" },
    { pattern: /^framer/, canonical: "Framer" },
    { pattern: /^figma/, canonical: "Figma" }
  ];

  const hit = aliases.find((alias) => alias.pattern.test(cleaned));
  if (hit) return hit.canonical;

  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasRequiredColumns(parsedRows: RawRow[]): boolean {
  const first = parsedRows[0];
  if (!first) return false;
  const keys = new Set(Object.keys(first).map((key) => key.trim().toLowerCase()));
  return REQUIRED_COLUMNS.every((column) => keys.has(column));
}

export function parseTransactionsCsv(csvText: string): Transaction[] {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true
  });

  if (parsed.errors.length > 0) {
    throw new Error("CSV parsing failed. Please check delimiters and row formatting.");
  }

  if (!hasRequiredColumns(parsed.data)) {
    throw new Error("CSV is missing required columns: date, merchant, amount, billing_period.");
  }

  let invalidRows = 0;
  const transactions: Transaction[] = parsed.data.flatMap((row, index) => {
    const merchantRaw = normalizeText(row.merchant, "");
    const date = normalizeText(row.date, "");
    const amount = toNumber(row.amount);

    if (!merchantRaw || !date || amount === null) {
      invalidRows += 1;
      return [];
    }

    const merchant = normalizeMerchant(merchantRaw);
    const category = normalizeText(row.category, "uncategorized").toLowerCase();

    return [
      {
        id: normalizeText(row.id, "txn-" + String(index + 1)),
        date,
        merchant,
        description: normalizeText(row.description, ""),
        category,
        amount: Math.max(0, amount),
        billingPeriod: toBillingPeriod(row.billing_period),
        cluster: normalizeText(row.cluster, category || "general").toLowerCase(),
        usagePct: toNumber(row.usage_pct),
        lastUsedDays: toNumber(row.last_used_days),
        priceChangePct: toNumber(row.price_change_pct),
        benchmarkMonthly: toNumber(row.benchmark_monthly),
        contractType: normalizeText(row.contract_type, "") || null,
        refundCandidate: (row.refund_candidate || "").toLowerCase() === "true",
        renewalDate: normalizeText(row.renewal_date, "") || null,
        status: normalizeText(row.status, "active")
      }
    ] as Transaction[];
  });

  if (transactions.length === 0) {
    throw new Error("No valid transactions found in CSV.");
  }

  if (invalidRows > 0 && invalidRows / (transactions.length + invalidRows) > 0.4) {
    throw new Error("CSV has too many invalid rows. Please fix required fields and retry.");
  }

  return transactions;
}
