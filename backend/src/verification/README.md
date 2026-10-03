# FR-55 verification module

The automated evidence checker specified in `docs/verification/fr55-design.md`
(branch `docs/83-fr55-design`). Stages 1–5 of the design's §9 build order are
implemented: fetch + extract (`sources.ts`), decompose + retrieve
(`decompose.ts`, `retrieve.ts`), the NLI verifier (`verifier/nli.ts`), the
LLM verifier (`verifier/llm.ts`), and the hybrid, aggregation, store and
pipeline (`verifier/hybrid.ts`, `aggregate.ts`, `store.ts`, `pipeline.ts`),
with a manual CLI trigger (`npm run verify -- --smoke <key>`).
The module is standalone: no database, no API callers; the migration is
parked in `sql/` and the alias map is an input (`eval/alias-groups.json`).

## Evaluation (design §7.2, smoke set)

Numbers from `eval/nli-eval.ts` against the twenty hand-labelled submissions
in `eval/smoke-set.json` (110 sub-fact expectations: 91 supported,
15 insufficient, 4 contradicted; labelled 2026-10-03, before any tuning).
Twenty items is a smoke test, not an evaluation — these numbers have wide
intervals and exist to catch gross failures and set initial thresholds
(design §7.1).

- **Model:** `Xenova/nli-deberta-v3-base`, the transformers.js ONNX mirror of
  `cross-encoder/nli-deberta-v3-base` (Apache-2.0, 184M parameters, trained
  on SNLI + MultiNLI), int8 weights (~223 MB), scored in-process on CPU.
- **Thresholds** (`SMOKE_SET_THRESHOLDS`): supported ≥ 0.17,
  contradicted ≥ 0.99, chosen by grid sweep for macro-F1. The set is
  indifferent for supported across (0.007, 0.178); the binding example is a
  joint-venture `role_stated` at 0.178. Thresholds are specific to the q8
  weights — re-run the harness after any change to model, dtype, templates
  or labels.
- **Premise construction:** each candidate is scored with the page's lead
  sentence prepended (`VerifierInput.context`, §4.4 amendment). Candidates
  rarely restate the site name ("the mine runs 36 trucks"), so bare
  sentence-level NLI reads site-naming hypotheses as neutral: without
  context the same model and sweep give macro-F1 0.731 and supported recall
  0.74; with it, 0.875 and 0.99. The cited quote is always the candidate
  alone (R1); the context never appears in a span.
- **Precedence:** supported wins when both classes clear threshold, and the
  conflicting candidate is recorded in the note. Contradiction is a
  field-level judgement (D3, stage 5); contradiction-first turned "No
  Caterpillar equipment operates at the site" into false contradictions of
  sub-facts the page actually supports.

**Result: 105/110, macro-F1 0.875.** Overall: supported precision
90/93 = 0.97, recall 90/91 = 0.99; contradicted precision 4/6 = 0.67,
recall 4/4; insufficient precision 11/11, recall 11/15. All sub-facts
resolved on the NLI path (the LLM path is build step 4).

| label \ predicted | supported | contradicted | insufficient |
|---|---|---|---|
| supported (91) | 90 | 1 | 0 |
| contradicted (4) | 0 | 4 | 0 |
| insufficient (15) | 3 | 1 | 11 |

| sub-fact | n | supported P | supported R | contradicted P |
|---|---|---|---|---|
| site.name | 19 | 18/18 = 1.00 | 18/18 = 1.00 | n/a |
| site.country | 19 | 17/17 = 1.00 | 17/17 = 1.00 | n/a |
| site.region | 2 | 2/2 = 1.00 | 2/2 = 1.00 | n/a |
| company_role.company_named | 6 | 6/6 = 1.00 | 6/6 = 1.00 | n/a |
| company_role.role_stated | 6 | 6/6 = 1.00 | 6/6 = 1.00 | n/a |
| machine.manufacturer | 9 | 5/6 = 0.83 | 5/6 = 0.83 | 1/2 = 0.50 |
| machine.machine_type | 9 | 7/9 = 0.78 | 7/7 = 1.00 | n/a |
| machine.model_name | 4 | 3/3 = 1.00 | 3/3 = 1.00 | 1/1 = 1.00 |
| technology.supplier_named | 9 | 7/7 = 1.00 | 7/7 = 1.00 | 0/1 = 0.00 |
| technology.product_name | 6 | 5/5 = 1.00 | 5/5 = 1.00 | n/a |
| quantity.count | 8 | 4/4 = 1.00 | 4/4 = 1.00 | 1/1 = 1.00 |
| quantity.machine_type_matches | 7 | 4/4 = 1.00 | 4/4 = 1.00 | 1/1 = 1.00 |
| commissioning.year | 4 | 4/4 = 1.00 | 4/4 = 1.00 | n/a |
| commissioning.month | 2 | 2/2 = 1.00 | 2/2 = 1.00 | n/a |

The five errors are confident model mistakes (every one scores ≥ 0.98), not
threshold artifacts — input for the stage-4 hybrid's routing design:

- `gunung-instruction-injection` machine_type: "declined to comment on its
  haulage fleet" is read as entailing a haulage fleet (presupposition
  treated as assertion).
- `kurogane-hitachi-ja-alias` manufacturer: 日立建機 is treated as a
  different supplier than "Hitachi Construction Machinery" → false
  contradiction across scripts.
- `jarnvik-fleetwide-ambiguity` manufacturer and machine_type: the lead
  sentence lets a company-fleet-wide claim entail the site-level
  hypothesis — the cost of context (two errors added against the
  twenty-two it fixes).
- `teralba-irrelevant-page` supplier_named: an entirely unrelated page is
  read as contradicting (0.998) rather than neutral.

One label was changed after the §6.1 amendment that removed the
manufacturer from the machine_type hypothesis:
`cerro-contradiction-manufacturer` machine_type contradicted → supported
(the source confirms haul trucks; the manufacturer sub-fact alone carries
the contradiction, and the field still lands contradicted in stage 5).

## LLM verifier (stage 4)

`verifier/llm.ts` judges the sub-facts routed off the NLI path (S1:
context-only support; S2: every contradicted verdict; plus the residual
supported band) and writes the reviewer note. Model: `claude-haiku-4-5` via
the Anthropic API, temperature 0, prompt versioned at
`prompts/verify-claim.v1.md`. Per the amended D3 it answers only
"explicitly different value?" — date comparison belongs to aggregation.
The model returns a candidate index plus character offsets, never free
text, and a structural check inside the class rejects any span that does
not land inside a real candidate, so an invented span becomes
*insufficient* by construction (R1). Without `ANTHROPIC_API_KEY` the
verifier reports itself unavailable and never throws (D6 then applies: a
`verify` recommendation requires no required sub-fact be context-only
supported).

**Live result (2026-10-03, real API calls): 6/6.** The five NLI errors
above, routed through S1/S2, all came back with the hand-labelled verdict —
including kurogane's cross-script manufacturer (日立建機 → supported) —
and the live injection probe (page text ordering the model to cite a
non-existent candidate) returned insufficient.

## Hybrid, aggregation and pipeline (stage 5)

`verifier/hybrid.ts` runs the NLI scorer first and routes structurally
risky claims to the LLM: **S1** when no top-3 candidate clears the
supported threshold on its own (the support exists only through the page
lead's coreference; when a candidate does stand bare, it becomes the
citation and the claim is not routed), **S2** for every contradicted
verdict, and a **residual band** for supports whose cited bare score is
below 0.5. `aggregate.ts` is pure code: the §6 stage 5 field table, D3's
date comparison (a conflicting value in a source published before
commissioning reads "partial, older figure"), the S3 site-anchor cap, D4's
qualifying source classes, and D6. `store.ts` is append-only behind
`ReportStore` (in-memory now; Postgres targets the parked migration) and
refuses any span outside the stored text. `pipeline.ts` runs stages 0–6;
quote offsets are stored absolute into `extracted_text`.

**Documented degradation (D6, narrowed 2026-10-03): without
`ANTHROPIC_API_KEY`, no submission can be recommended `verify`.** D6
withholds `verify` while any required non-site sub-fact is supported only
through page-lead context and unreviewed; site sub-facts are exempt (the
lead names the site directly, and S3 anchors the site independently). On
the smoke set, NLI-only mode reaches verify on **0/20** items: eighteen
fail the verify rule's own field conditions or the gate, and the two that
pass them all — `wandarra-full-clean` and `witvlakte-underground-lhd` —
are blocked by D6 on machine.manufacturer, machine.machine_type,
quantity.count and commissioning.year, whose evidence sentences never
re-name the site ("the haul fleet consists of 36 Caterpillar 793F
trucks"). That is the intended conservatism: an LLM key is operationally
required for `verify` recommendations (§10 A.4.10); the reviewer sees the
D6 basis on the report and decides as always (R3). The end-to-end
expectations live in `eval/smoke-pipeline.test.ts`.

### A real page through the CLI (Gudai-Darri, 2026-10-03)

`eval/examples/gudai-darri.json` runs Rio Tinto's Gudai-Darri opening
release through the full pipeline with a live fetch
(`npm run verify -- --file src/verification/eval/examples/gudai-darri.json`;
the CLI loads the repo-root `.env`, so the LLM path runs when
`ANTHROPIC_API_KEY` is set there — `ANTHROPIC_API_KEY=` on the command
line suppresses it). Both panels, as run:

Without the LLM (D6):

```
report: gudai-darri.json
spam gate: passed
recommendation: request_more_evidence
basis: the site is only partially supported by this source
models: nli:Xenova/nli-deberta-v3-base — LLM unavailable, D6 degradation

field verdicts:
  site           partially supported
  company_role   partially supported
  machine        supported
  technology     supported

claims:
  site.name                                  supported     "Gudai-Darri has 23 CAT 793F autonomous haul trucks and three CAT MD63…"
  site.country                               supported     "Gudai-Darri has 23 CAT 793F autonomous haul trucks and three CAT MD63…"
                                             note: s1_context_only_support routed; unreviewed (LLM verifier unavailable: no API key); NLI verdict stands (D6)
  site.region                                insufficient  —
  company_role.company_named (rio tinto:owner)    supported  "Bill Johnston MLA, today joined Rio Tinto employees as well as valued…"
  company_role.company_named (rio tinto:operator) supported  "Bill Johnston MLA, today joined Rio Tinto employees as well as valued…"
  company_role.role_stated (rio tinto:owner)      insufficient  —
  company_role.role_stated (rio tinto:operator)   insufficient  —
  machine.manufacturer                       supported     "Once development is complete, it is anticipated the world's first ope…"
  machine.machine_type                       supported     "Once development is complete, it is anticipated the world's first ope…"
  technology.supplier_named                  supported     "Once development is complete, it is anticipated the world's first ope…"

source: https://www.riotinto.com/en/news/releases/2022/rio-tinto-opens-gudai-darri-its-most-technologically-advanced-mine [company_release]
```

With the LLM (`claude-haiku-4-5`, real calls): identical except
`site.country`, where the LLM **overturned** the routed context-only
support to insufficient with the reviewer note "The page lead indicates
the article is from Perth, Australia, but no candidate explicitly states
that the Gudai-Darri mine site itself is located in Australia" — S1 doing
its job, stricter than a human reviewer would be, and erring safe. The
recommendation is request_more_evidence either way: the optional region
sub-fact finds nothing, site reads partially supported, and the verify
rule requires site fully supported.

Two findings from this page, for later stages:

1. **Forecast sentences pass bare (hedge screen — stage 6 candidate).**
   machine.* and technology.supplier_named are supported by "Once
   development is complete, it is anticipated the world's first…" — a
   forecast that names Caterpillar and trucks, so it clears S1's bare
   threshold and never reaches the LLM, whose prompt is the only place the
   hedge rule lives. A lexical hedge screen ("anticipated", "planned",
   "expected to") that forces routing would close the gap.
2. **role_stated scores near zero on an implied role (§6.1 — client
   question).** The page plainly implies Rio Tinto operates Gudai-Darri
   but never writes "Rio Tinto is the operator", and the sub-fact's
   hypothesis demands exactly that (entailment 0.006–0.017). Same shape as
   the berrigan JV case in the smoke set: whether an implied role should
   count as role_stated is a definition question for the client, not a
   model fix.

## Batching warning

Padded batches are numerically unsafe with this DeBERTa-v3 ONNX export: an
identical, unpadded row flips class when a shorter, padded row is batched
next to it (observed: contradiction 0.995 → entailment 0.968 for the same
token ids). `NliScorer.scoreMany` therefore scores one pair per model call.
Do not reintroduce batching without first checking batch-invariance on
identical rows.

## Running the harness and tests

```sh
# deterministic suite (no network, no model)
npm test

# model-dependent verifier tests (downloads ~223 MB on first run)
LIVE_NLI=1 npm test -- src/verification/verifier/nli.live.test.ts

# LLM verifier against the routed smoke-set errors (needs ANTHROPIC_API_KEY)
LIVE_LLM=1 npm test -- src/verification/verifier/llm.live.test.ts

# pipeline end-to-end over all twenty smoke items (D6 mode, no key needed)
LIVE_NLI=1 npm test -- src/verification/eval/smoke-pipeline.test.ts

# one smoke item through the pipeline, printed as the review panel shows it
npm run verify -- --smoke wandarra-quantity-growth

# smoke-set evaluation: scores all pairs, sweeps thresholds, prints this
# README's tables; NLI_EVAL_CACHE caches pair scores between runs
NLI_EVAL_CACHE=/tmp/nli-scores.json npx tsx src/verification/eval/nli-eval.ts

# variants
NLI_EVAL_CONTEXT=0 …   # score candidates without the lead-sentence context
NLI_EVAL_DTYPE=fp32 …  # full-precision weights (739 MB)
```

Wiring the harness into CI is build step 6.
