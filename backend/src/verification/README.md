# FR-55 verification module

The automated evidence checker specified in `docs/verification/fr55-design.md`
(branch `docs/83-fr55-design`). Stages 1–3 of the design's §9 build order are
implemented: fetch + extract (`sources.ts`), decompose + retrieve
(`decompose.ts`, `retrieve.ts`) and the NLI verifier (`verifier/nli.ts`).
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

# smoke-set evaluation: scores all pairs, sweeps thresholds, prints this
# README's tables; NLI_EVAL_CACHE caches pair scores between runs
NLI_EVAL_CACHE=/tmp/nli-scores.json npx tsx src/verification/eval/nli-eval.ts

# variants
NLI_EVAL_CONTEXT=0 …   # score candidates without the lead-sentence context
NLI_EVAL_DTYPE=fp32 …  # full-precision weights (739 MB)
```

Wiring the harness into CI is build step 6.
