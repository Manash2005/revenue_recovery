# Evaluation Results

## Summary

**Total events evaluated:** 15

## Confusion Matrix

| Metric | Count |
|---|---:|
| True Positives | 9 |
| True Negatives | 3 |
| False Positives | 0 |
| False Negatives | 3 |

## Classification Metrics

| Metric | Value |
|---|---:|
| Precision | 100.00% |
| Recall | 75.00% |
| F1 Score | 85.71% |

## Error Cost

| Error Type | Cost |
|---|---:|
| False Positive Cost | 0.00 |
| False Negative Cost | 1667.90 |

## Interpretation

The metrics above compare the agent's final actions against the
ground-truth labels generated for the synthetic evaluation dataset.

False positives represent cases where the agent classified a payment
as recoverable when the ground truth considered it non-recoverable.

False negatives represent cases where the agent classified a payment
as non-recoverable when the ground truth considered it recoverable.

False-positive cost is particularly important because allowing an
incorrect recovery action can create greater financial or operational
risk than unnecessarily stopping or escalating a payment.
