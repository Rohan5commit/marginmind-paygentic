# Locus Integration

## Why Locus Is Central

MarginMind is built around the idea that an autonomous savings agent should be able to spend a little money to save much more money. Locus makes that practical by giving the agent a governed USDC wallet, pay-per-use API access, task execution, and deployable infrastructure.

## Wallet Concepts Used In The MVP

MarginMind models every agent action as a wallet-funded operation with explicit guardrails:
- allowance
- max transaction size
- approval threshold
- vendor allowlist
- auditable justification

That design follows Locus documentation for governed agent spending and keeps the product grounded in the machine-economy framing rather than generic SaaS analytics.

## Wrapped APIs In The Design

Wrapped APIs fit MarginMind in two places:
- vendor and alternative research
- policy-aware lightweight enrichment before spending more on a task or deployment

The app shows wrapped API actions as pay-per-use decisions funded from the Locus wallet. This matters because a savings agent should not require yet another monthly subscription to do research.

## Locus Tasks In The Design

Some high-value savings opportunities still need human work:
- drafting a refund request
- writing a vendor negotiation message
- collecting replacement options
- preparing a cancellation or migration script

MarginMind uses Locus Tasks selection logic based on:
- category
- timeline
- price tier
- estimated savings
- expected ROI

The app only escalates when the expected upside meaningfully exceeds the task spend.

## Build With Locus In The Design

Build with Locus is used as the machine-economy deployment layer for always-on monitoring. In MarginMind, the Action Agent can propose deploying a lightweight renewal monitor from GitHub so the user keeps catching waste after the initial review.

This is important for Week 2 because it shows a full loop:
- detect waste
- decide an action
- fund the action
- deploy supporting automation from GitHub

## What Is Real In This MVP

### Real
- GitHub-hosted Next.js application
- deployable Vercel build
- NVIDIA NIM integration for structured reasoning
- Locus-native wallet, task, wrapped API, and Build with Locus planning surfaces
- transparent action logs and ROI logic

### Simulated
- direct Locus task submission
- live Build with Locus deployment creation
- live wrapped API spending from a Locus wallet

These are simulated because no Locus API key was provided for this build.

### Future-expandable
The Locus surfaces are intentionally shaped so they can be wired to live credentials later:
- wrapped API discovery and provider calls
- task creation and polling
- Build with Locus project, environment, service, and deployment APIs

## Source Basis

The product design follows current Locus documentation for:
- single USDC wallet model
- approval-threshold and allowance guardrails
- wrapped API authentication and approval flow
- task category, timeline, and price tier workflow
- Build with Locus GitHub deployment and health-check model
