# Evaluation Results

## Summary

**Total events evaluated:** 180

## Confusion Matrix

| Metric | Count |
|---|---:|
| True Positives | 116 |
| True Negatives | 33 |
| False Positives | 1 |
| False Negatives | 30 |

## Classification Metrics

| Metric | Value |
|---|---:|
| Precision | 99.15% |
| Recall | 79.45% |
| F1 Score | 88.21% |

## Error Cost

| Error Type | Cost |
|---|---:|
| False Positive Cost | 360.54 |
| False Negative Cost | 15090.39 |

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
