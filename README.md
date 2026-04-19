# MarginMind

MarginMind is an autonomous spend-optimization agent that detects SaaS waste, duplicate subscriptions, inflated vendor costs, and recoverable charges, then uses a Locus-native action layer to take profitable next steps.

## Why This Matters

Small teams leak money every month through forgotten renewals, duplicate SaaS tools, rising infra bills, and contracts nobody renegotiates. The real problem is not spotting waste. It is turning a messy expense ledger into action fast enough to save money before the next billing cycle.

MarginMind is built for that exact gap:
- it ingests startup spend data in seconds
- it estimates real monthly and annual savings
- it recommends the highest-ROI next move
- it shows how an agent can spend a little money through Locus to save much more

## Features

- CSV upload plus one-click demo data
- recurring charge detection with strict CSV validation and merchant-name normalization
- duplicate-tool detection across analytics, design, collaboration, and infra spend
- underused subscription, refund-window, pricing outlier, rising-cost, and negotiation detection
- six clearly labeled agents:
  - Intake Agent
  - Detection Agent
  - Decision Agent
  - Action Agent
  - Task Escalation Agent
  - Strategy Agent
- NVIDIA NIM powered business-language explanations and top-action summaries
- Locus wallet, wrapped API, Build with Locus, and Locus Tasks action planning
- founder-ready report export
- crisp demo dashboard with savings timeline and transparent agent logs

## Stack

- Next.js + TypeScript + Tailwind CSS
- NVIDIA NIM for structured reasoning
- Locus-native action design for wallet-funded agent operations
- GitHub-first deployment flow to Vercel

## Quick Start

### 1. Install

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

### 2. Environment Variables

Create a `.env.local` file:

```bash
NVIDIA_NIM_API_KEY=your_nim_key
NVIDIA_NIM_MODEL=meta/llama-3.1-70b-instruct
LOCUS_API_KEY=your_locus_key
LOCUS_API_BASE=https://beta-api.paywithlocus.com/api
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

NVIDIA NIM and Locus can both run live. If `LOCUS_API_KEY` is missing, MarginMind automatically falls back to simulation mode for the Locus action layer.

### 3. Demo Flow

1. Open the homepage.
2. Click **Load sample startup spend**.
3. Review duplicates, overpriced tools, and refund opportunities.
4. Open an opportunity card.
5. Run the Strategy Agent.
6. Review the Locus action path.
7. Export the founder report.

## Deployment

### Deploy To Vercel From GitHub

1. Push this repository to a public GitHub repo.
2. Import the repo into Vercel.
3. Add the environment variables:
   - `NVIDIA_NIM_API_KEY`
   - `NVIDIA_NIM_MODEL` (optional override)
   - `LOCUS_API_KEY`
   - `LOCUS_API_BASE` (use `https://beta-api.paywithlocus.com/api` for Paygentic)
   - `NEXT_PUBLIC_APP_URL`
4. Deploy.

The app is designed to build even if Locus keys are absent. In that case, MarginMind runs the Locus layer in an explicitly labeled simulation mode for judges. With a valid key, the dashboard uses live Locus wallet connectivity and capability checks.

This repository also includes a GitHub Actions workflow at `.github/workflows/deploy-vercel.yml` so future pushes to `main` can redeploy the app to Vercel from GitHub.

## NVIDIA NIM Setup

MarginMind uses NVIDIA NIM for:
- structured spend posture summaries
- action prioritization
- concise business-language explanations
- report-ready executive narrative

The integration uses the OpenAI-compatible `POST /v1/chat/completions` endpoint at `https://integrate.api.nvidia.com`. If the model returns invalid JSON, the app retries once with stricter instructions before falling back to deterministic heuristics.

## Locus Integration Overview

MarginMind uses Locus as a central execution layer, not as a cosmetic add-on.

- **Wallet model**: the app frames agent actions as wallet-funded operations with allowance, max-transaction, and approval-threshold guardrails.
- **Wrapped APIs**: the Action Agent can justify low-cost research calls as pay-per-use operations instead of subscription tooling.
- **Locus Tasks**: the Task Escalation Agent only proposes human work when expected savings exceed task cost.
- **Build with Locus**: the app shows how the agent can deploy a renewal-monitor service from GitHub as a wallet-funded machine-economy action.
- **Audit logs**: every proposed action includes rationale, expected savings, estimated Locus spend, and status.

MarginMind now supports both modes:
- Live mode with `LOCUS_API_KEY`: wallet balance and Locus capability checks are fetched in real time.
- Simulation mode without key: action planning remains available for demo continuity.

High-cost commercial actions still remain in guarded/pending mode in this MVP to avoid accidental spends during judging.

## Screenshots / Demo Assets

- Live app: https://marginmind-paygentic.vercel.app
- Demo walkthrough: [DEMO_SCRIPT.md](DEMO_SCRIPT.md)
- Business framing: [BUSINESS_PLAN.md](BUSINESS_PLAN.md)
- Judges can follow the script live in-app with zero setup beyond opening the URL.

## Why This Fits Paygentic Week 2

MarginMind matches the brief directly:
- it helps the user save money, not just analyze spend
- the agent recommends and prepares profitable actions
- Locus is the execution and machine-economy layer
- the demo is fast, visual, and founder-friendly
- the product clearly answers “Hack an Agent to Make You Money!”

## Repository Guide

- `PROJECT_OVERVIEW.md`
- `PROBLEM_STATEMENT.md`
- `SOLUTION_OVERVIEW.md`
- `LOCUS_INTEGRATION.md`
- `AGENT_ARCHITECTURE.md`
- `DEMO_SCRIPT.md`
- `TEAM_INFO.md`
- `public/data/seed-startup-spend.csv`

## Future Roadmap

- live Locus wrapped API execution with provider-level approvals
- live Locus task submission and task status polling
- live Build with Locus deployment execution once public Build app write endpoints are available
- Gmail or email agent connectors for refund and negotiation outreach
- spend anomaly detection over linked bank, card, and billing feeds
- policy-aware autonomous approvals based on confidence and ROI
