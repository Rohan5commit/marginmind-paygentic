# Solution Overview

## Product Design

MarginMind is a fintech operations dashboard built around an agent loop:
1. ingest spend data
2. detect savings opportunities
3. decide the right action
4. route the action through Locus
5. track saved or recovered money

The interface is desktop-first for demo clarity, with a strong top-line savings narrative and a visible action center.

## Main Workflows

### Spend Intake
The user loads a realistic startup CSV or uploads their own expense file. The Intake Agent normalizes merchants, billing cadence, dates, and optional enrichment signals such as usage percentage or recent price increases.

### Opportunity Detection
The Detection Agent identifies:
- duplicate subscriptions
- underused tools
- pricing outliers
- rising infrastructure costs
- suspicious renewals
- refund candidates
- negotiation candidates

### Decisioning
The Decision Agent combines deterministic heuristics and AI explanation to select the best next move:
- cancel
- downgrade
- request refund
- negotiate
- replace with cheaper alternative
- monitor for now

### Action Planning
The Action Agent translates the decision into a Locus-native path:
- use a wrapped API for targeted research
- reserve wallet budget for profitable operations
- prepare a Build with Locus deployment for ongoing monitoring
- escalate to Locus Tasks when human effort is worth the spend

## How Opportunities Are Detected

The MVP uses structured heuristics that are easy to explain:
- recurring charges are grouped by normalized merchant and billing period
- duplicate tools are found by spend cluster
- underused tools are flagged when spend is meaningful and usage is low
- pricing outliers rely on explicit benchmark or vendor-specific heuristics
- rising costs compare current price to prior charges or supplied deltas
- refund windows rely on recent renewal timing plus low utilization
- negotiation candidates are high-dollar annual commitments

## Why This MVP Is Sufficient

This MVP is enough to win because it proves the core thesis:
- the agent identifies real savings
- the agent decides what to do next
- the agent uses Locus concepts as the execution layer
- the output is useful to a founder in under three minutes

That is enough for a strong hackathon demo, while leaving clear room for live billing integrations and live Locus execution after the event.
