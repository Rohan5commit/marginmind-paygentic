import { LocusRuntimeStatus } from "@/lib/types";
import { enforceRateLimit } from "@/lib/security";

const DEFAULT_LOCUS_API_BASE = "https://beta-api.paywithlocus.com/api";

function inferEnvironment(apiBase: string): LocusRuntimeStatus["environment"] {
  if (apiBase.includes("stage-api.paywithlocus.com")) return "stage";
  if (apiBase.includes("beta-api.paywithlocus.com")) return "beta";
  if (apiBase.includes("api.paywithlocus.com")) return "production";
  return "unknown";
}

function docsBaseFromApi(apiBase: string): string {
  if (apiBase.includes("stage-api.paywithlocus.com")) return "https://stage.paywithlocus.com";
  if (apiBase.includes("beta-api.paywithlocus.com")) return "https://beta.paywithlocus.com";
  if (apiBase.includes("api.paywithlocus.com")) return "https://paywithlocus.com";
  return "https://paywithlocus.com";
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function getPath(payload: unknown, path: string): unknown {
  if (!payload || typeof payload !== "object") return null;
  const parts = path.split(".");
  let current: unknown = payload;
  for (const part of parts) {
    if (!current || typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function extractBalance(payload: unknown): number | null {
  const paths = [
    "data.balance_usdc",
    "data.balanceUsdc",
    "data.balance",
    "data.usdc_balance",
    "data.available_balance",
    "data.wallet.balance_usdc",
    "data.wallet.balance",
    "data.wallet.usdc_balance",
    "balance_usdc",
    "balance"
  ];

  for (const path of paths) {
    const maybe = readNumber(getPath(payload, path));
    if (maybe !== null) return maybe;
  }

  return null;
}

function extractAddress(payload: unknown): string | null {
  const paths = ["data.wallet_address", "data.walletAddress", "data.address", "wallet_address", "address"];
  for (const path of paths) {
    const maybe = getPath(payload, path);
    if (typeof maybe === "string" && maybe.trim().length > 0) return maybe;
  }
  return null;
}

function detectAppAvailability(markdown: string): { buildWithLocusAvailable: boolean; hireWithLocusAvailable: boolean } {
  const lower = markdown.toLowerCase();
  return {
    buildWithLocusAvailable: lower.includes("build with locus") || lower.includes("buildwithlocus"),
    hireWithLocusAvailable: lower.includes("hire with locus") || lower.includes("hirewithlocus")
  };
}

function shouldExposeSensitiveWalletData(): boolean {
  return process.env.EXPOSE_LOCUS_BALANCE === "true";
}

function simulationStatus(message: string, apiBase: string): LocusRuntimeStatus {
  return {
    connected: false,
    mode: "simulation",
    environment: inferEnvironment(apiBase),
    balanceUsdc: null,
    walletAddress: null,
    wrappedApiCatalogReachable: false,
    x402CatalogReachable: false,
    appsMarkdownReachable: false,
    buildWithLocusAvailable: false,
    hireWithLocusAvailable: false,
    message,
    lastCheckedAt: new Date().toISOString()
  };
}

export async function GET(request: Request) {
  const rateLimitError = enforceRateLimit(request, "locus-status");
  if (rateLimitError) return rateLimitError;

  const apiBase = process.env.LOCUS_API_BASE || DEFAULT_LOCUS_API_BASE;
  const apiKey = process.env.LOCUS_API_KEY;
  const environment = inferEnvironment(apiBase);

  if (!apiKey) {
    return Response.json(simulationStatus("LOCUS_API_KEY is not configured in this deployment.", apiBase));
  }

  const authHeaders = {
    Authorization: "Bearer " + apiKey
  };

  const [balanceRes, x402Res, appsRes, wrappedCatalogRes] = await Promise.all([
    fetch(apiBase + "/pay/balance", { headers: authHeaders, cache: "no-store" }),
    fetch(apiBase + "/x402/endpoints/md", { headers: authHeaders, cache: "no-store" }),
    fetch(apiBase + "/apps/md", { headers: authHeaders, cache: "no-store" }),
    fetch(docsBaseFromApi(apiBase) + "/wapi/index.md", { cache: "no-store" })
  ]);

  if (!balanceRes.ok) {
    const reason =
      balanceRes.status === 401 || balanceRes.status === 403
        ? "Locus API key is invalid for this environment or lacks permission."
        : "Unable to reach Locus wallet endpoint.";
    return Response.json(simulationStatus(reason, apiBase));
  }

  const balancePayload = (await balanceRes.json()) as unknown;
  const rawBalanceUsdc = extractBalance(balancePayload);
  const rawWalletAddress = extractAddress(balancePayload);

  const appsMarkdown = appsRes.ok ? await appsRes.text() : "";
  const appAvailability = detectAppAvailability(appsMarkdown);

  const exposeSensitive = shouldExposeSensitiveWalletData();

  const status: LocusRuntimeStatus = {
    connected: true,
    mode: "live",
    environment,
    balanceUsdc: exposeSensitive ? rawBalanceUsdc : null,
    walletAddress: exposeSensitive ? rawWalletAddress : null,
    wrappedApiCatalogReachable: wrappedCatalogRes.ok,
    x402CatalogReachable: x402Res.ok,
    appsMarkdownReachable: appsRes.ok,
    buildWithLocusAvailable: appAvailability.buildWithLocusAvailable,
    hireWithLocusAvailable: appAvailability.hireWithLocusAvailable,
    message: exposeSensitive
      ? "Live Locus wallet connection is healthy."
      : "Live Locus wallet connected. Sensitive wallet details are redacted on public status route.",
    lastCheckedAt: new Date().toISOString()
  };

  return Response.json(status);
}
