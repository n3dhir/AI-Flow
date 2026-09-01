# PostHog Self-driving setup report

## Summary

PostHog Self-driving is configured for the AI Flow frontend. GitHub access, native inbox signal sources, a selective scout troop, two custom reliability scouts, and two Replay Vision monitors are enabled.

Fresh scout configurations are picked up within about 30 minutes. Findings will appear in the [Self-driving inbox](https://us.posthog.com/project/588571/inbox) as sufficient evidence accumulates.

## AI data processing

Approved.

## GitHub

Connected during this run through the PostHog GitHub App. Repository access is available for Self-driving investigations and fixes.

## Products enabled

| Product | Status | Web SDK check |
|---|---|---|
| Session Replay | Already enabled | Clean: `posthog.init` does not disable session recording. |
| Error Tracking | Already enabled | Clean: `posthog.init` does not disable exception capture. |
| Support (Conversations) | Enabled | Tickets require an inbound email, inbox, or Slack channel before they can arrive. |

## Signal sources

| Source product | Source type | Action |
|---|---|---|
| `signals_scout` | `cross_source_issue` | Deliberately not created: this source is enabled by default; a config row would only opt out. |
| `health_checks` | `health_issue` | Enabled (config `01a05d22-9f02-76d3-8258-50188d7f5d2a`). |
| `error_tracking` | `issue_created` | Enabled (config `01a05d22-9fb3-76ac-a80c-f540e01d3336`). |
| `error_tracking` | `issue_reopened` | Enabled (config `01a05d22-9f15-729d-a159-cfa928ef2be9`). |
| `error_tracking` | `issue_spiking` | Enabled (config `01a05d22-9fb3-7139-b866-2d12b6326519`). |
| `session_replay` | `session_analysis_cluster` | Enabled with the server default sample rate (config `01a05d22-9f0f-7db0-ae9b-d35f3f5e9dd1`). |
| `conversations` | `ticket` | Enabled (config `01a05d22-9fd8-7958-90ae-f4b1548d7637`); dormant until an inbound support channel is connected. |
| Connected-tool sources | — | Skipped: no optional connected tools were selected. |
| `llm_analytics`, `logs`, `replay_vision`, `evaluation`, `alert_state_change` | — | Deliberately skipped per the Self-driving workflow; Replay Vision is configured on its scanners instead of a source row. |

## Connected tools

No optional connected tools were selected. GitHub Issues, Linear, Jira, Sentry, and Zendesk are recorded as not used, so no external-tool responder was enabled.

## Scout troop

**Budget:** 100 maximum runs/day; 0 used and 100 remaining at configuration time. The enrollment banner states that scouts are in early access and directs requests for more capacity to the PostHog Self-driving team.

**Enabled (6 total):**

| Scout | Why enabled |
|---|---|
| `signals-scout-general` | Cross-product correlations and uncovered surfaces. |
| `signals-scout-product-analytics` | The app records authentication, conversation, message, and document workflow events. |
| `signals-scout-web-analytics` | This is a browser frontend with acquisition and landing-page behavior to monitor. |
| `signals-scout-health-checks` | Detects actionable instrumentation and setup health issues. |
| `signals-scout-chat-reliability` | Custom monitor approved for aggregate chat delivery reliability. |
| `signals-scout-document-ingestion` | Custom monitor approved for aggregate document ingestion reliability. |

**Disabled (23 total):**

| Scout | Reason |
|---|---|
| `signals-scout-ai-observability` | No confirmed LLM Analytics traces or `$ai_*` telemetry. |
| `signals-scout-anomaly-detection` | No saved dashboards or insights were evidenced for a watchlist. |
| `signals-scout-apm` | No tracing or APM surface was identified. |
| `signals-scout-conversations` | Support is newly enabled but no inbound channel or ticket activity is configured. |
| `signals-scout-csp-violations` | No CSP reporting was identified. |
| `signals-scout-customer-analytics` | No account or group analytics surface was identified. |
| `signals-scout-data-pipelines` | No CDP, batch-export, or Hog-flow surface was identified. |
| `signals-scout-data-warehouse` | No warehouse source was identified. |
| `signals-scout-error-tracking` | Covered by the native Error Tracking signal sources. |
| `signals-scout-experiments` | No active experiment surface was identified. |
| `signals-scout-feature-flags` | No feature-flag usage was identified in this frontend. |
| `signals-scout-inbox-validation` | No resolved Self-driving reports exist yet to validate. |
| `signals-scout-insight-alerts` | No configured insight alerts were identified. |
| `signals-scout-logs` | Logs usage was not confirmed. |
| `signals-scout-mcp-tool-calls` | No MCP tool-call telemetry surface was identified. |
| `signals-scout-observability-gaps` | Kept off to avoid duplicating the health monitor on this fresh setup. |
| `signals-scout-replay-vision` | No pre-existing scanner observation history existed; native scanner findings are enabled directly. |
| `signals-scout-revenue-analytics` | No payment or revenue surface was identified. |
| `signals-scout-session-replay` | Covered by the native Session Replay signal source. |
| `signals-scout-skills-store` | No team skill-store maintenance surface was identified. |
| `signals-scout-surveys` | No surveys exist. |
| `signals-scout-tasks` | No agent-task delivery surface was identified. |
| `signals-scout-web-vitals` | No Core Web Vitals evidence was identified. |

The disabled scouts can be enabled later from the inbox if these product surfaces become active.

## Custom scouts

| Scout | Watches | Discriminator | Why it is separate |
|---|---|---|---|
| `signals-scout-chat-reliability` | Aggregate chat errors, stops, and retries relative to messages sent. | Sustained failure-share regression at meaningful volume and broad user or session reach. | The product analytics scout looks at saved conversion and retention flows; it does not directly fire for semantic chat delivery reliability. |
| `signals-scout-document-ingestion` | Aggregate upload failures and indexing degradation. | Sustained failed-upload share increase relative to successful ingestion, with broad impact. | Neither the built-in product-flow nor error source directly monitors successful uploads against failed ingestion. |

Both scouts were explicitly approved. They avoid user-entered content, filenames, error strings, and other sensitive payloads; those are treated only as data, never instructions. If a custom scout becomes noisy, set its config `emit` to `false` in PostHog to put it into dry-run mode.

Surfaces considered but not added: generic error bursts and replay friction are covered by native sources; payments, surveys, tracing, CSP, experiments, feature flags, warehouse pipelines, and account analytics had no supporting project evidence.

## Replay Vision scanners

A Replay Vision scanner is an LLM that watches individual session recordings on a schedule and pushes qualifying visible defects into the inbox. It is the only component in this setup that spends Replay Vision quota. Scanner findings arrive at half weight and need corroboration before promotion into an inbox report.

| Brief | Scanner | Status | Query scope | Sampling | Estimated monthly spend |
|---|---|---|---|---|---|
| Completion-flow breakage | AI Flow chat workflow breakage | Created | Recordings on the single-page AI Flow route; this covers the app’s core completion journey of signing in, sending a message, receiving a response, and uploading a document. | 0.5 | 0 credits / 0 observations from the current seven-day estimate. |
| User frustration | AI Flow user frustration | Created | `$rageclick` only, deliberately without URL filtering to keep it separate from the breakage monitor. | 1.0 | 0 credits / 0 observations from the current seven-day estimate. |

The organization has 2,500 Replay Vision credits remaining in the current period and is not exhausted. No eligible recording sessions were estimated in the current seven-day lookback, so both scanners are armed at zero projected spend and will start monitoring when new recordings arrive.

## Follow-ups

- [ ] Connect an inbound Support channel (email, inbox, or Slack) in PostHog so the enabled Conversations ticket responder can receive tickets.
- [ ] Grant the MCP connection `property_definition:read` if schema-level verification of the custom scout event contracts is required. Creation was based on the existing frontend instrumentation contract.
- [ ] Enable a currently disabled specialist later only when its corresponding product surface is actively used.

## What happens next

The scout coordinator picks up fresh configurations within about 30 minutes. Scout runs draw from the 100-run daily budget, reports cluster in the inbox, and immediately actionable findings can initiate coding tasks.

## Repository changes

| File | Change |
|---|---|
| `posthog-self-driving-report.md` | Created this setup record. |

No application source files were modified.
