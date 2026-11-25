# Margin

Open Margin.html in a recent browser. Enter your English notes and one English quiz claim. The result shows the original lines or asks you to check a mismatch. Multiple similar passages are labeled as ambiguous. An unsupported or low-overlap query can produce no result. Every search runs in this tab. The app has no runtime network calls, credentials, uploads, model dependency or analytics.

## How the search works

The retriever breaks the text into short, overlapping windows bounded by blank lines. It compares normalized terms and a limited English synonym dictionary, weighting terms that occur in fewer passages more heavily. It selects an anchor sentence to check known unit conversions, quantity mismatches, direction, universal wording, negation and median/mean differences. If multiple distinguishing claim terms occur nowhere in the notes and the best candidate has weak coverage, the retriever abstains. A line citation points to a place to reread. The software does not establish whether a scientific statement is true.

## Reproduce the checks

1. Run `python3 build.py` to regenerate the standalone HTML from the JavaScript, template and sample.
2. Run `node evaluate.js` to run nine behavioral assertions and regenerate evaluation.json.
3. The application itself requires only a browser. The checks use Node and Python standard libraries. No dependencies need installation.

## What the evaluation shows

We authored two short synthetic English texts and 21 labeled claims during development. All 13 claims with a relevant passage placed the expected passage first. The literal word-overlap baseline also found 13/13. Five changed or overstrong claims triggered a wording warning. An initial build returned a false citation for one of eight unsupported claims: a claim about electricity prices matched a passage about voltage. A source-wide vocabulary coverage check now rejects all eight, including that example. The always-return baseline cited a passage for all eight. Two fresh internal checks were subsequently run: an unsupported traffic claim abstained and a time-unit paraphrase matched line 4. Strong paraphrases remain a limitation. In a separate stress example, “The lamp photodetector experienced reduced response lag” produced no candidate despite a relevant lamp-sensor passage. Increasing the rejection threshold trades recall for fewer weak citations. The abstention comparison reflects the baseline's lack of a rejection threshold. All fixtures and expected labels are in evaluate.js. These examples were used in development. They have no independent human annotations or classroom validity estimate.

## Development disclosure

Prepared for the Global AI Builder’s Challenge. Codex implemented the prototype and automated checks. Claude Fable 5.2 reviewed candidate ideas and suggested tests for missing evidence, changed wording, and line offsets. The released app uses deterministic retrieval. The included notes and claims are synthetic. This repository records the prototype at this stage of development.
