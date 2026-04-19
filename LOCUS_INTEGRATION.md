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

This keeps the product grounded in machine-economy execution rather than passive analytics.

## Wrapped APIs In The Design

Wrapped APIs fit MarginMind in two places:
- vendor and alternative research
- policy-aware enrichment before escalating to human tasks

The app treats these as pay-per-use decisions funded from the Locus wallet, avoiding another recurring SaaS subscription just to do research.

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

The app only escalates when expected upside meaningfully exceeds task spend.

## Build With Locus In The Design

Build with Locus is used as the machine-economy deployment layer for always-on monitoring. MarginMind can propose a GitHub-backed renewal monitor service so users keep catching waste after the initial review.

## What Is Live Now

### Live
- Locus wallet connectivity check via `GET /api/pay/balance`
- environment-aware Locus mode (beta or production)
- x402 catalog reachability check via `GET /api/x402/endpoints/md`
- apps catalog reachability check via `GET /api/apps/md`
- wrapped API catalog reachability check via `/wapi/index.md`
- real-time status rendered in the dashboard and carried into the action plan

### Simulated (guarded in MVP)
- direct Locus Tasks submission
- direct Build with Locus deployment creation
- live wrapped API spend execution from UI buttons

These remain intentionally guarded to prevent accidental spending during demos while still showing end-to-end payload and ROI logic.

## Source Basis

The integration design follows current Locus docs and skill references for:
- API base/environment mapping
- wallet balance/auth checks
- wrapped API endpoint structure
- x402 catalog discovery
- app catalog discovery
- policy guardrails and approval thresholds
