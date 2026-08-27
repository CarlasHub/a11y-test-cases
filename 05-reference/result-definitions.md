# Result definitions

## Execution status and criterion outcome are different

Execution status describes progress. Criterion outcome describes the observed WCAG result for a target or completed sample.

| Situation | Execution status | Criterion outcome |
| --- | --- | --- |
| Nothing run | `not_started` | Empty |
| Some applicable targets run | `in_progress` | Empty at sample level; preserve completed target evidence |
| Every required target and state run | `completed` | `pass`, `fail` or `not_applicable` |
| Account or environment unavailable | `blocked` | Empty |
| Evidence needs expert review | `needs_specialist_review` | Empty until resolved |

## Aggregation

For one success criterion across the declared sample:

1. Any failed applicable target makes the sampled criterion result fail.
2. If material uncertainty remains, set execution to `needs_specialist_review` and do not assign a criterion outcome.
3. If an applicable target or required state was not completed, keep execution incomplete and do not assign a criterion outcome.
4. Use not applicable only when the completed inventory contains no applicable target.
5. Use pass only when every applicable target and state in the sample passed.

Do not average results. Do not allow one passing page to cancel a failure on another page.
