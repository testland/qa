from scipy.stats import chi2_contingency, ttest_ind
import json


def compare_proportions(canary_success, canary_total, baseline_success, baseline_total):
    """Chi-square test for two proportions. Returns p-value."""
    table = [[canary_success, canary_total - canary_success],
             [baseline_success, baseline_total - baseline_success]]
    chi2, p, dof, _ = chi2_contingency(table)
    return p


def compare_latencies(canary_p95s, baseline_p95s):
    """Welch's t-test for two latency samples. Returns p-value."""
    t, p = ttest_ind(canary_p95s, baseline_p95s, equal_var=False)
    return p


def verdict(canary_metrics, baseline_metrics, thresholds, alpha=0.05):
    failures = []
    for metric, t in thresholds.items():
        c = canary_metrics[metric]
        b = baseline_metrics[metric]

        # Absolute check
        if 'max' in t.get('absolute', {}) and c.value > t['absolute']['max']:
            failures.append(f"{metric}: {c.value} > absolute max {t['absolute']['max']}")
        if 'min' in t.get('absolute', {}) and c.value < t['absolute']['min']:
            failures.append(f"{metric}: {c.value} < absolute min {t['absolute']['min']}")

        # Relative check (only if statistically significant)
        if metric in ('error_rate',):
            p = compare_proportions(c.success, c.total, b.success, b.total)
        else:
            p = compare_latencies(c.samples, b.samples)

        ratio = c.value / b.value if b.value else float('inf')
        if 'max' in t.get('relative', {}) and ratio > t['relative']['max'] and p < alpha:
            failures.append(f"{metric}: ratio {ratio:.2f} > relative max {t['relative']['max']} (p={p:.3f})")

    if failures:
        return ('rollback' if any('error_rate' in f or 'completion' in f for f in failures) else 'pause', failures)
    return ('promote', [])
