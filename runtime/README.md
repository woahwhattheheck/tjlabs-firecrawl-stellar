# Bundled Stellar Forge runtime

This directory carries the Stellar Forge seller/buyer runtime components the
product composes, in their original repository layout. `runtime.mjs` resolves
the component root to `runtime/stellar/scf-starforge-20261009/` by default;
`FIRECRAWL_RUNTIME_ROOT` overrides it with an equivalent external tree (the
directory that directly contains `sf30-seller-sdk/`, `sf88-operator-buyer-cli/`
and the other components below).

```text
runtime/
  stellar/scf-starforge-20261009/        runtime root (FIRECRAWL_RUNTIME_ROOT)
    sf30-seller-sdk/                   seller service, upstream bindings,
                                       developer client generator/exporter
    sf31-buyer-client/                 buyer HTTP transport/response handling
    sf36-spend-governor/               spend-governor + finality workers (py)
    sf43-agent-commerce/               Stellar transfer verification
    sf52-buyer-outcomes/               buyer outcome accounting
    sf54-buyer-governor-intent/        governor intent adapter (py)
    sf59-operator-reservation-gate/    operator gate (py)
    sf62-human-approval-cli/           human approval console (py)
    sf81-buyer-operator-bridge/        buyer operator bridge + approve worker
    sf82-chain-transfer-reconcile/     chain transfer records
    sf82-checkout-evidence/            checkout evidence/checkpoint
    sf85-live-402-capture/             live 402 proxy capture
    sf86-rpc-transfer-reconcile/       RPC transfer reconcile + networks.json
    sf88-operator-buyer-cli/           operator buyer CLI, Node+Python workers
    sf89-live-request-admission/       live request admission
    sf100-buyer-dataset-delivery/      dataset delivery
    sf101-merchant-recovery/           workspace recovery crypto worker
    sf103-native-buyer-signer/         native buyer signer adapter
    buyer-runbook/                     customer runbook/intake/recovery lanes
    merchant-fleet-gateway/            state lease
  stellar-forge/payment-auto-catalog/  Bazaar schema validation
```

## Scope decisions

- Only the components this product consumes are included. The merchant
  operations console (`sf30-seller-sdk/operations/`), the SF101 merchant
  receiver/checkout, the seller support bundle (SF93), support console (SF74),
  revenue ops (SF97) and delivery workspace (SF98, except `outbox.mjs`, which
  the SF36 observer imports) are not part of this product.
- `buyer-runbook/workspace-model.mjs` narrows the generic paid-file intake
  lane to a closed refusal (`PAID_FILE_LANE_UNSUPPORTED`): that lane's only
  implementation was the excluded SF101 receiver. All other runbook lanes
  (request, client, handoff, accounting, recovery) are unchanged.
- The SF88 Python bridge keeps its generic command surface; its four
  paid-file-transfer modes lazily import the absent SF101 receiver and refuse
  only if those modes are invoked.
- `sf88-operator-buyer-cli/queue-cli.mjs` is narrowed the same way: its two
  unrelated subcommand lanes (`library`, `review-jobs` — the delivered-resource
  library and customer review-job products) are removed from the copy, so an
  unknown verb fails with `INBOX_COMMAND_REQUIRED` instead of a missing-module
  error. Every inbox verb (`init` through `recover-missing-receipt`) works.
- `sf30-seller-sdk/developer/seller-client.mjs` and `seller-client.d.mts` are
  generated per merchant by the bundled `developer/client-generator.mjs` /
  `client-export.mjs` from the merchant's actual OpenAPI document; the
  generated artifacts are not source files.
- `sf88-operator-buyer-cli/workspace.mjs` generates each workspace's
  `signer.mjs` and `operator-keys.json` at `init`; they are customer-owned
  artifacts, not package source.
- The `stellar_forge_buyer` Python package is **not bundled**. It is the
  separate SF88 Python buyer companion required only when a customer runs an
  exported Python client (`seller_client.py`) through prepare/execute/recover,
  or when an operator configures the optional dataset/object analysis
  workspace launcher (`dataset-workspace/analysis.mjs` boots
  `stellar_forge_buyer.analysis_workspace`; unconfigured, it refuses with
  `DATASET_ANALYSIS_NOT_CONFIGURED`). The product's documented customer path —
  `run.mjs`, the research desk and `sf88-operator-buyer-cli/cli.mjs` —
  does not use it.

## External dependencies

The four npm packages in the top-level `package.json` are used by the runtime
for native payment verification/settlement:

- `@x402/core` 2.28.0 (`/server`, `/client`)
- `@x402/stellar` 2.28.0 (`/exact/server`, `/exact/client`)
- `@x402/extensions` 2.28.0 (`/bazaar`)
- `@stellar/stellar-sdk` 16.3.0

Install them from the package root (`npm install`); the runtime's dynamic
imports resolve them through Node's normal module resolution from this
project. Challenge-only operation needs none of them.

The SF88 configured-workspace purchase path additionally requires Python 3.11+
on `PATH` (stdlib only; `sf62` console, `sf54` intent adapter, `sf59` gate,
`sf36` governor/finality workers are bundled here).
