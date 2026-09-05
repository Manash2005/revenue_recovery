# Evaluation Results

## Summary

**Total events evaluated:** 130

## Confusion Matrix

| Metric | Count |
|---|---:|
| True Positives | 85 |
| True Negatives | 24 |
| False Positives | 1 |
| False Negatives | 20 |

## Classification Metrics

| Metric | Value |
|---|---:|
| Precision | 98.84% |
| Recall | 80.95% |
| F1 Score | 89.01% |

## Error Cost

| Error Type | Cost |
|---|---:|
| False Positive Cost | 360.54 |
| False Negative Cost | 11091.70 |

## Interpretation

The metrics above compare the agent's final actions against the
ground-truth labels generated for the synthetic evaluation dataset.

False positives represent cases where the agent classified a payment
as recoverable when the ground truth considered it non-recoverable.

False negatives represent cases where the agent classified a payment
as non-recoverable when the ground truth considered it recoverable.

False-negative cost is particularly important because failing to recover
an eligible payment can result in lost revenue. False-positive cost is
also tracked because pursuing a non-recoverable payment can create
customer, operational, or financial risk.
