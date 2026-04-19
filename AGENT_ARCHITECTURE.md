# Agent Architecture

## Agents

### 1. Intake Agent
Responsibilities:
- parse CSV input
- normalize merchants, dates, amounts, and categories
- infer recurring billing cadence
- attach optional enrichment fields when present

Output:
- normalized transaction records
- recurring merchant summaries

### 2. Detection Agent
Responsibilities:
- find duplicate tools by spend cluster
- flag underused subscriptions
- detect pricing outliers
- detect sudden price increases
- identify refund-worthy renewals
- identify negotiation-worthy annual contracts

Output:
- structured findings with type, severity, confidence, and estimated savings

### 3. Decision Agent
Responsibilities:
- choose the best next action for each finding
- combine deterministic heuristics with concise explanation
- distinguish between likely savings and guaranteed savings

Possible actions:
- cancel
- downgrade
- request refund
- negotiate
- replace
- monitor

### 4. Action Agent
Responsibilities:
- translate findings into Locus-native execution paths
- estimate required spend from the wallet
- model approval thresholds and ROI
- prepare wrapped API and Build with Locus operations

### 5. Task Escalation Agent
Responsibilities:
- determine whether human help is worth paying for
- choose category, timeline, and price tier
- create a proposal with expected ROI
- avoid escalation when task cost erodes savings

### 6. Strategy Agent
Responsibilities:
- summarize the overall spend posture
- prioritize the highest-value actions
- return strict JSON with monthly savings, annual savings, confidence, and action list
- use NVIDIA NIM with a retry-on-parse-failure policy

## Data Flow

1. CSV input enters the Intake Agent.
2. The Detection Agent produces structured findings.
3. The Decision Agent assigns actions and confidence.
4. The Action Agent generates a Locus plan.
5. The Task Escalation Agent proposes human work only when justified.
6. The Strategy Agent produces a founder-ready top-line summary.

## Decision Logic

MarginMind uses deterministic rules first:
- duplicates depend on overlapping clusters
- underused tools depend on low usage and meaningful spend
- refund opportunities depend on recent renewals and low utilization
- negotiation depends on high-dollar contracts
- rising infra depends on upward spend movement

AI reasoning is used for:
- concise plain-language explanation
- opportunity prioritization
- executive summary and report narrative

## Action Execution Path

For each finding, the action path includes:
- recommended move
- estimated savings
- estimated Locus spend
- approval requirement
- current status
- rationale

The action center groups these into:
- immediate actions
- Locus Tasks escalations
- Build with Locus deployment options
- monitor-only items

## Savings Estimation Logic

Monthly savings:
- sum of ongoing savings opportunities with strong actionability

Annual savings:
- monthly savings times twelve
- plus contract savings where the negotiated delta is annualized

One-time recoverable amount:
- recent charges that may be refundable are tracked separately and clearly labeled as likely, not guaranteed

## Confidence Logic

Confidence is based on signal quality:
- **high**: multiple confirming signals such as duplicate cluster plus low usage plus benchmark gap
- **medium**: one or two strong signals, but some uncertainty remains
- **low**: weak or incomplete evidence, so the recommendation is monitor-first

The product never presents low-confidence opportunities as guaranteed savings.
