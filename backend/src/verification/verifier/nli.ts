import { AutoModelForSequenceClassification, AutoTokenizer, env } from '@huggingface/transformers'

import type { Candidate, Verifier, VerifierInput, VerifierResult } from './types.js'

/**
 * Stage 4, NLI branch (design §4.2): a pretrained NLI cross-encoder scores
 * each (candidate sentence, hypothesis) pair in-process on the CPU via
 * onnxruntime, and thresholds on the class probabilities decide the verdict.
 *
 * Default model: Xenova/nli-deberta-v3-base — the transformers.js ONNX
 * conversion of cross-encoder/nli-deberta-v3-base (Apache-2.0, 184M
 * parameters, trained on SNLI + MultiNLI; 92.4% SNLI-test / 90.0% MNLI-mm).
 * The int8 weights ('q8') are ~223 MB and fit the design's CPU budget
 * (§10 A.4.9). First use downloads the weights into the transformers.js
 * cache under node_modules; after that the scorer is fully offline.
 */

export interface NliScores {
  entailment: number
  contradiction: number
  neutral: number
}

export interface NliScorerOptions {
  modelId?: string
  /** ONNX weight variant. 'q8' is what the smoke-set thresholds were tuned on. */
  dtype?: 'fp32' | 'q8'
  /** Overrides the transformers.js model cache directory. */
  cacheDir?: string
}

export const DEFAULT_NLI_MODEL_ID = 'Xenova/nli-deberta-v3-base'

interface LoadedModel {
  tokenizer: Awaited<ReturnType<typeof AutoTokenizer.from_pretrained>>
  model: Awaited<ReturnType<typeof AutoModelForSequenceClassification.from_pretrained>>
  /** Position of each NLI class in the logits row, from the model config's id2label. */
  classIndex: Record<keyof NliScores, number>
}

function softmax(logits: readonly number[]): number[] {
  const max = Math.max(...logits)
  const exps = logits.map((logit) => Math.exp(logit - max))
  const sum = exps.reduce((total, value) => total + value, 0)
  return exps.map((value) => value / sum)
}

/** Scores premise→hypothesis pairs with the cross-encoder. Loads the model once, lazily. */
export class NliScorer {
  private readonly options: NliScorerOptions
  private loading: Promise<LoadedModel> | null = null

  constructor(options: NliScorerOptions = {}) {
    this.options = options
  }

  private load(): Promise<LoadedModel> {
    this.loading ??= (async () => {
      if (this.options.cacheDir !== undefined) {
        env.cacheDir = this.options.cacheDir
      }
      const modelId = this.options.modelId ?? DEFAULT_NLI_MODEL_ID
      const tokenizer = await AutoTokenizer.from_pretrained(modelId)
      const model = await AutoModelForSequenceClassification.from_pretrained(modelId, {
        dtype: this.options.dtype ?? 'q8',
      })

      const id2label: Record<string, string> = (model.config as { id2label?: Record<string, string> }).id2label ?? {}
      const classIndex: Partial<Record<keyof NliScores, number>> = {}
      for (const [id, label] of Object.entries(id2label)) {
        const key = label.toLowerCase()
        if (key === 'entailment' || key === 'contradiction' || key === 'neutral') {
          classIndex[key] = Number(id)
        }
      }
      const { entailment, contradiction, neutral } = classIndex
      if (entailment === undefined || contradiction === undefined || neutral === undefined) {
        throw new Error(`${modelId} is not a 3-class NLI model: id2label is ${JSON.stringify(id2label)}`)
      }
      return { tokenizer, model, classIndex: { entailment, contradiction, neutral } }
    })()
    return this.loading
  }

  /**
   * One hypothesis against many premises — the §4.2 input shape. Each pair
   * is its own single-row model call: padded batches are numerically unsafe
   * with this ONNX export (an identical, unpadded row flips class when a
   * shorter row is batched next to it — DeBERTa's disentangled attention
   * does not survive the padding), and at a handful of candidates per
   * sub-fact the batch would buy nothing anyway.
   */
  async scoreMany(premises: readonly string[], hypothesis: string): Promise<NliScores[]> {
    if (premises.length === 0) {
      return []
    }
    const { tokenizer, model, classIndex } = await this.load()

    const scores: NliScores[] = []
    for (const premise of premises) {
      const inputs = tokenizer(premise, { text_pair: hypothesis, truncation: true })
      const output = (await model(inputs)) as { logits: { dims: number[]; data: Float32Array } }
      if (output.logits.dims[0] !== 1) {
        throw new Error(`unexpected logits shape [${output.logits.dims.join(', ')}] for one pair`)
      }
      const probabilities = softmax(Array.from(output.logits.data))
      scores.push({
        entailment: probabilities[classIndex.entailment] ?? 0,
        contradiction: probabilities[classIndex.contradiction] ?? 0,
        neutral: probabilities[classIndex.neutral] ?? 0,
      })
    }
    return scores
  }
}

export interface NliThresholds {
  /** Minimum entailment probability for *supported*. */
  supported: number
  /** Minimum contradiction probability for *contradicted*. */
  contradicted: number
}

/**
 * Set from the labelled smoke set by eval/nli-eval.ts (design §9 step 3)
 * against the default model's q8 weights; re-run that harness after any
 * change to the model, dtype, templates or labels, and update these to its
 * chosen values. The smoke set is indifferent across supported ∈
 * (0.007, 0.178) — the sweep's tie-break takes the top of the band; the
 * binding example is a joint-venture role_stated at 0.178.
 */
export const SMOKE_SET_THRESHOLDS: NliThresholds = { supported: 0.17, contradicted: 0.99 }

export interface NliDecision {
  verdict: VerifierResult['verdict']
  /** Index of the cited candidate; null for insufficient. */
  index: number | null
  /** Probability of the verdict's class; best entailment when insufficient. */
  score: number
  note: string | null
}

/**
 * The threshold rule, shared by NliVerifier and the evaluation sweep so the
 * measured rule is the shipped rule. Supported wins when both classes clear
 * their thresholds: the verifier's product is a citable supporting span
 * (R1), a false "contradicted" bounces a good submission in stage 5, and a
 * real conflict between candidates is D3's field-level call — so it is
 * surfaced in the note, not decided here. On the smoke set, contradiction-
 * first turned both cerro machine sub-facts and a commissioning year into
 * false contradictions off sentences like "No Caterpillar equipment
 * operates at the site".
 */
export function decideVerdict(scores: readonly NliScores[], thresholds: NliThresholds): NliDecision {
  let entailIndex = 0
  let contraIndex = 0
  for (const [index, score] of scores.entries()) {
    if (score.entailment > (scores[entailIndex]?.entailment ?? 0)) {
      entailIndex = index
    }
    if (score.contradiction > (scores[contraIndex]?.contradiction ?? 0)) {
      contraIndex = index
    }
  }
  const bestEntailment = scores[entailIndex]?.entailment ?? 0
  const bestContradiction = scores[contraIndex]?.contradiction ?? 0

  if (bestEntailment >= thresholds.supported) {
    return {
      verdict: 'supported',
      index: entailIndex,
      score: bestEntailment,
      note:
        bestContradiction >= thresholds.contradicted
          ? `candidate ${contraIndex} also contradicts (probability ${bestContradiction.toFixed(3)}); conflict is field-level (D3)`
          : null,
    }
  }
  if (bestContradiction >= thresholds.contradicted) {
    return {
      verdict: 'contradicted',
      index: contraIndex,
      score: bestContradiction,
      note: `contradiction probability ${bestContradiction.toFixed(3)}`,
    }
  }
  return {
    verdict: 'insufficient',
    index: null,
    score: bestEntailment,
    note: `best entailment ${bestEntailment.toFixed(3)} below threshold ${thresholds.supported}; best contradiction ${bestContradiction.toFixed(3)}`,
  }
}

/**
 * The premise the scorer sees: the candidate in the context of the page it
 * came from (VerifierInput.context). Exported so the evaluation harness
 * scores exactly what NliVerifier scores.
 */
export function buildPremise(context: string | null | undefined, candidate: string): string {
  if (context == null || context === candidate) {
    return candidate
  }
  return `${context} ${candidate}`
}

/** A §4.4 row from a threshold decision: the cited span is the whole best-scoring candidate sentence. */
export function nliResult(decision: NliDecision, candidates: readonly Candidate[]): VerifierResult {
  const cited = decision.index === null ? null : (candidates[decision.index] ?? null)
  return {
    verdict: decision.verdict,
    candidate_index: decision.index,
    start: cited === null ? null : 0,
    end: cited === null ? null : cited.text.length,
    score: decision.score,
    note: decision.note,
    path: 'nli',
  }
}

/** The §4.4 NLI implementation. */
export class NliVerifier implements Verifier {
  constructor(
    private readonly scorer: NliScorer,
    private readonly thresholds: NliThresholds = SMOKE_SET_THRESHOLDS,
  ) {}

  async verify({ hypothesis, candidates, context }: VerifierInput): Promise<VerifierResult> {
    if (candidates.length === 0) {
      return {
        verdict: 'insufficient',
        candidate_index: null,
        start: null,
        end: null,
        score: null,
        note: 'no candidate sentences to score',
        path: 'nli',
      }
    }

    const scores = await this.scorer.scoreMany(
      candidates.map((candidate) => buildPremise(context, candidate.text)),
      hypothesis,
    )
    return nliResult(decideVerdict(scores, this.thresholds), candidates)
  }
}
