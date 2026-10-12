# Firecrawl research provider and customer workspace

This package turns an explicitly priced Firecrawl search or page read into a
Stellar Forge seller operation, then carries the customer's exact request and
retained response through research review, collection editions, export and
recovery. It bundles the SF30 seller/upstream adapter, SF88 Buyer and the
original encrypted workspace recovery engine under `runtime/` (see
[Runtime](#runtime)).

The operator interface is a private, neutral research desk. It keeps saved
requests, source groups, provider metadata, working notes, comparison results
and frozen handovers in one workspace. Preparing a customer request retains its
original buyer intent. Execution stays with the existing buyer terminal and its
selected operator.

## Package contents

| File | Role |
| --- | --- |
| `contract.mjs` | Firecrawl v2 request contract, admission input validation and retained-result projection |
| `merchant.mjs` | Product compiler and provider handlers over the original upstream transport and seller payment options |
| `application.mjs` | Standard `--handlers` entry module for the original seller launcher |
| `server.mjs` | Private loopback research-desk HTTP server (token + host/origin checks) |
| `research.mjs` | Customer workflow: preparation, buyer intent, native result intake, provider observation import, recovery selection |
| `store.mjs` | SQLite store: requests, captures, annotations, collections and frozen editions (uses `node:sqlite`) |
| `exports.mjs` | Frozen-edition exports: complete JSON, standalone HTML and CSV |
| `run.mjs` | One CLI for the provider and customer lifecycle (`node run.mjs --help`) |
| `runtime.mjs` | Resolves the installed runtime root (`FIRECRAWL_RUNTIME_ROOT` or `runtime/`) |
| `static/` | Research-desk browser UI (`index.html`, `app.js`, `app.css`) |
| `example-product.json` | Product configuration template with unverified demo placeholders |
| `runtime/` | Bundled Stellar Forge runtime components (see [runtime/README.md](runtime/README.md)) |

## Operations

| Customer operation | Merchant route | Firecrawl source | Retained result |
| --- | --- | --- | --- |
| `firecrawl-search` | `POST /research/search` | `POST /v2/search` | Original web, news and image groups, URLs, descriptions, dates and metadata |
| `firecrawl-search-content` | `POST /research/search-content` | `POST /v2/search` with fixed Markdown/link scraping | Search groups plus exact returned page content |
| `firecrawl-read` | `POST /research/read` | `POST /v2/scrape` | One selected public page, its Markdown, links and metadata |

Search supports query, result limit, web/news/images, mutually exclusive
include/exclude hostname lists, location, two-letter country, time filter and
highlights. The result limit is **per selected source**. Defaults allow ten
results per source, three sources, a 60-second source timeout, a 1 MiB response
and four concurrent requests per upstream binding. The provider can lower those
limits.

The request contract fixes `domainTools:false`. Content operations use
`formats:["markdown","links"]` and `onlyMainContent:true`. A customer cannot
supply arbitrary source credentials, custom backend headers, another upstream
origin or an alternate payment flow through these request bodies. Page reads
accept an ordinary public HTTP(S) URL; IP literals, credential-bearing URLs,
private hostnames, fragments and custom ports are refused by the product
contract.

The exact current parameter meanings come from Firecrawl's
[search reference](https://docs.firecrawl.dev/api-reference/endpoint/search),
[search guide](https://docs.firecrawl.dev/features/search) and
[scrape reference](https://docs.firecrawl.dev/api-reference/endpoint/scrape).

## Requirements

- **Node.js** — Node 24 recommended (the recorded exercise ran on 24.19.0);
  Node 22.13+ is the floor because the customer store uses the built-in
  `node:sqlite` module.
- **Python 3.11+** — used by the original SF88 operator buyer subprocess for
  the configured-workspace purchase path.
- **The bundled runtime's npm packages** — `npm install` in this directory
  installs `@x402/core`, `@x402/extensions`, `@x402/stellar` (2.28.0) and
  `@stellar/stellar-sdk` (16.3.0), declared in `package.json`. They are needed
  only for native payment verification/settlement and Bazaar schema
  validation; challenge-only mode runs without them.
- **A Firecrawl source arrangement** — a provider's own Firecrawl account key,
  or the documented public-starter mode; see
  [Firecrawl for platforms](https://docs.firecrawl.dev/firecrawl-for-platforms)
  for how standard service keys and platform keys differ.
- For live native payments: a provider-selected HTTPS facilitator. Omitting it
  selects the original challenge-only mode.

## Runtime

The Stellar Forge seller/buyer runtime components this product consumes are
bundled in `runtime/` in their original repository layout. `runtime.mjs`
resolves the component root from `FIRECRAWL_RUNTIME_ROOT`, falling back to the
bundled `runtime/stellar/scf-starforge-20261009/` directory.
[runtime/README.md](runtime/README.md) lists the included components and the
product-scope narrowing applied to it. An absent module fails with
`FIRECRAWL_RUNTIME_MISSING` naming the absent path.

In the examples below, `RT` is the runtime root:

```sh
RT="${FIRECRAWL_RUNTIME_ROOT:-./runtime/stellar/scf-starforge-20261009}"
```

## Provider configuration and startup

Copy `example-product.json` to the provider's private configuration directory.
Replace its demo asset, recipient and prices with the provider's reviewed
payment terms. Set `publicOrigin` to the actual merchant's HTTPS origin when
generating customer offers. The three prices are atomic units of the selected
asset; they are separate from Firecrawl credits.

For an existing Firecrawl service account, select:

```json
{
  "mode": "account",
  "apiKeyEnv": "FIRECRAWL_API_KEY"
}
```

The provider's service manager supplies the named environment variable. The
adapter forms the Authorization header in memory; the product JSON contains
only the variable name. The shipped public-starter mode follows the current
documented starter contract.

Compile into a new private output directory:

```sh
node run.mjs compile \
  --product /srv/firecrawl/config/product.json \
  --out /srv/firecrawl/config/compiled-001
```

The command retains the exact product JSON, original seller-service
configuration and original upstream bindings. It does not contact Firecrawl.

A challenge-only preview uses the actual original seller's offers and developer
portal:

```sh
node run.mjs preview \
  --product /srv/firecrawl/config/product.json \
  --port 8423
```

To serve the merchant with settlement, run the bundled seller service directly
with this product's explicit handler exports:

```sh
export FIRECRAWL_PRODUCT_CONFIG=/srv/firecrawl/config/compiled-001/product.json

node "$RT/sf30-seller-sdk/serve.mjs" \
  --config /srv/firecrawl/config/compiled-001/seller-service.json \
  --handlers /absolute/path/to/application.mjs \
  --facilitator https://YOUR-SELECTED-FACILITATOR \
  --availability-dir /srv/firecrawl/availability \
  --port 8423
```

The facilitator URL is selected by the provider. The example token is a
replacement point, not a deployed service. Omitting `--facilitator` selects the
original challenge-only mode. The seller listener binds to loopback; use the
provider's existing HTTPS ingress for the merchant origin.

`application.mjs` is the handler entry point. Launching only the compiled
generic upstream bindings would omit this product's request transformation and
admission contract. The original seller runs admission before authorization and
settlement; invalid requests do not consume a source call.

For embedding in an existing service, `createProduct(product)` returns
`config`, `handlers`, `snapshot()` and `close()`. Pass `config` and `handlers`
to the maintained `startSellerService`. Close the original seller after its
work drains, then close the product. The standalone `preview` command already
performs both steps.

## Retain the merchant's generated customer client

Use the bundled developer portal or `developer/client-export.mjs` to export a
client from the merchant's actual saved OpenAPI document:

```js
import {exportSellerClient} from
  './runtime/stellar/scf-starforge-20261009/sf30-seller-sdk/developer/client-export.mjs';

await exportSellerClient({
  openapi: '/srv/firecrawl/merchant-openapi.json',
  out: '/srv/firecrawl/new-generated-client'
});
```

The original exporter writes its standalone client, TypeScript declarations,
exact OpenAPI source, package metadata and README. Initialization retains the
client bytes and their SHA inside the customer workspace.

## Customer initialization

Create or select the existing SF88 operator workspace for the merchant's actual
network, asset, recipient and payment flow. Its per-request cap and original
total/daily policy still apply. Put that operator below the new canonical
private customer root so complete recovery can retain it.

```sh
node run.mjs init \
  --state-root /srv/firecrawl-customer \
  --operator-directory /srv/firecrawl-customer/operator \
  --seller-client /srv/firecrawl/new-generated-client/seller-client.mjs

node run.mjs serve \
  --settings /srv/firecrawl-customer/settings.json \
  --port 8430
```

Initialization can use a private root that already contains that operator. It
creates customer filenames once and does not replace existing settings,
research, buyer, client or profile files. The retained profile contains
selected original configuration references; operator key custody remains in the
original workspace.

Open the local URL printed by `serve`. Its fragment token selects the private
desk. The browser removes that fragment from the visible URL and retains the
token only in its session storage. API calls require the token and matching
host/origin.

### Request, prepare, execute and collect

The browser supports exact query planning, saving, duplication into a new
request, preparation, inspection and reading an existing outcome. It does not
have a payment-execution endpoint. The original buyer terminal performs
execution using the reviewed saved request.

A request file has this shape:

```json
{
  "title": "Primary Stellar documentation",
  "operation": "firecrawl-search-content",
  "input": {
    "query": "Stellar smart contracts documentation",
    "limit": 1,
    "sources": ["web"],
    "includeDomains": ["developers.stellar.org"]
  }
}
```

CLI equivalents:

```sh
node run.mjs request \
  --settings /srv/firecrawl-customer/settings.json \
  --input /srv/firecrawl-customer/request.json

node run.mjs prepare \
  --settings /srv/firecrawl-customer/settings.json \
  --id QUERY_ID --revision 1 --max-atomic 30000 --accept 0

node run.mjs review \
  --settings /srv/firecrawl-customer/settings.json --id QUERY_ID

node run.mjs execute \
  --settings /srv/firecrawl-customer/settings.json --id QUERY_ID

node run.mjs collect \
  --settings /srv/firecrawl-customer/settings.json --id QUERY_ID
```

Choose the cap and payment-option index against the installed merchant's real
offer. Preparation records the exact body, ordinary headers, endpoint, client
source identity, operator workspace and cap under one stable intent. Once
preparation starts, its inputs are immutable. A retry of interrupted
preparation must match the same selection; it opens an already retained
original intent where appropriate.

`inspect` and `collect` reconcile that original operation. They do not start
another purchase. A native result enters the research store only when the
original buyer reports a saved response and verifies its bytes. Request/body/
config identities and the native delivery/accounting result remain attached.

## Research review and frozen handover

Open a retained request to inspect its web, news and image groups. Returned
images are represented by their source links; the desk does not fetch them
automatically. Markdown and original metadata are displayed as text.

Select sources, write notes and tags, then add the retained responses to a
collection. These are independent records:

| Record | What changes | What remains retained |
| --- | --- | --- |
| Draft request | Title and exact query options under revision control | The current request revision |
| Captured response | A later explicit response may become the request's current capture | Every retained response's exact bytes and SHA |
| Source annotation | Selection, note and tags under revision control | Its current revision in each frozen edition |
| Collection | Title, brief and response membership | Previous frozen editions |
| Frozen edition | Create a new edition for later changes | Exact queries, response bytes, source selection, notes and identities |

Collection freeze checks both the collection revision and a selection digest
that includes source annotations. Concurrent selection changes require a fresh
review; they cannot silently change the accepted handover. Later working notes
do not rewrite an earlier edition.

Exports:

- **JSON** is the complete frozen collection. `responseBase64` retains each
  original response byte-for-byte, beside its SHA, query, provenance and
  annotations.
- **HTML** is a standalone readable handover of selected sources and notes.
  Source text is escaped; it is not executed as HTML.
- **CSV** contains selected source rows and notes with spreadsheet formula
  escaping.

The comparison view matches source occurrences within their result group and
identifies added, removed and changed title, description, date or content. It
compares the two saved provider responses; it makes no fresh search.

### Provider observation intake

An operator may also import its already retained actual Firecrawl source
response. This records `PROVIDER_OBSERVATION` and its source provenance,
independently of buyer accounting.

```sh
node run.mjs import-observation \
  --settings /srv/firecrawl-customer/settings.json --id QUERY_ID \
  --response /srv/firecrawl-customer/intake/response.json \
  --request /srv/firecrawl-customer/intake/source-request.json \
  --provenance /srv/firecrawl-customer/intake/capture.json
```

The source request must equal this product's exact transformed request.
Provenance includes `url`, `status:200`, `capturedAt`, response `sha256` and
`requestSha256`. The importer verifies those hashes and the expected Firecrawl
endpoint. It cannot overwrite a query whose buyer preparation has begun,
including when preparation races with input-file reads.

## Complete original recovery

The recovery selection includes the original operator, buyer records, research
database, actual settings, generated client and profile below the canonical
customer root. The original software/runtime remains an installed dependency.

Stop writers to the customer workspace, then inspect the exact original
selection:

```sh
node run.mjs backup-review \
  --settings /srv/firecrawl-customer/settings.json

node run.mjs backup \
  --settings /srv/firecrawl-customer/settings.json \
  --out /srv/firecrawl-recovery/archive-001 --quiesced \
  --pass-env SF88_BACKUP_PASSPHRASE
```

Supply the passphrase through the original private process environment. The
command checkpoints and closes the research database before invoking the
maintained recovery engine. Retain the returned record SHA separately with the
archive.

```sh
node run.mjs verify \
  --bundle /srv/firecrawl-recovery/archive-001 \
  --record-sha RETURNED_RECORD_SHA --pass-env SF88_BACKUP_PASSPHRASE

node run.mjs restore \
  --bundle /srv/firecrawl-recovery/archive-001 \
  --record-sha RETURNED_RECORD_SHA --pass-env SF88_BACKUP_PASSPHRASE
```

Restore uses the original canonical location and refuses populated receiving
state. It does not substitute another destination into signed records. Reopen
the restored `settings.json`, inspect the original intent and collect its
existing result before deciding on any further acquisition.

## Failure handling and operational limits

Input and mapping changes invalidate their current selection. Stale query,
annotation or collection writes are refused with a conflict. A prepared request
keeps its body and operator binding across process restarts.

Exports are staged, fsynced and published create-only in the selected private
destination. Interrupted writing cannot leave a partial final export that looks
complete. If publication succeeds but the following directory sync fails, the
command reports the already published path, byte count and SHA with
`PUBLISHED_DURABILITY_UNCONFIRMED`.

Source responses are bounded before retention. A frozen collection is bounded
to 64 MiB of encoded content. Page lists are paginated and collection
membership reads metadata instead of reparsing all response bodies. Native
request and service shutdown remain under the original buyer/seller
controllers.

## Payment, payout and provider boundaries

- Firecrawl source credits and Stellar customer payment are separate accounts.
  Firecrawl usage is billed by Firecrawl to the provider under the provider's
  own Firecrawl agreement; customer payment is the merchant's configured
  Stellar x402 terms. This package does not merge, rebate or account between
  them.
- The provider owns the merchant payment terms: network, asset, recipient and
  atomic-unit prices in the product configuration. `example-product.json`
  carries deliberately unverified placeholders and cannot produce a payable
  offer as shipped.
- This package never holds a Firecrawl key, a Stellar secret, a facilitator
  credential or a wallet. Account mode names an environment variable; operator
  key custody stays inside the original SF88 workspace; the browser desk
  receives no API key or signer.
- `example-product.json` and generated offers are configuration inputs, not a
  deployed service, a partnership or an accepted customer.

## Current state

This is a source package, not a deployed service or running pilot. The product
code is frozen from its original in-repository integration, whose private
validation record is retained separately by the maintainer; this standalone
tree has not been separately executed. The bundled runtime closure is complete
— every required local module resolves inside this package — but the package
itself has not been run; first `npm install` for the declared payment packages,
then follow the sections above.

## License and third-party notices

This package is MIT licensed; see [LICENSE](LICENSE). It references the
documented public Firecrawl v2 API — Firecrawl is a separate third-party
service with its own terms and account pricing. The bundled Stellar Forge
runtime components carry their own MIT notices. The declared npm packages
(`@x402/*`, `@stellar/stellar-sdk`) are third-party packages under their own
licenses, installed by `npm install` rather than vendored.
