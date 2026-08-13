# Privacy models - NIST SP 800-188

Deep reference behind [masking-techniques.md](masking-techniques.md). Consult
after per-field operators are chosen, when quasi-identifiers remain and the
whole dataset's disclosure risk must be bounded.

NIST SP 800-188:2023 ("De-Identifying Government Datasets",
[csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final))
formalises statistical privacy models layered above the per-field
techniques.

## k-anonymity

A dataset is **k-anonymous** if every record is indistinguishable
from at least *k - 1* other records when projected on the
quasi-identifiers (Sweeney 2002, cited in NIST 800-188).

- **Achieve via:** Generalisation (age 47 → "40 - 50"), suppression
  (drop the row), and aggregation.
- **Picks `k`:** Typical values are k = 5, k = 10, k = 100
  depending on dataset size + risk tolerance.
- **Weakness:** Vulnerable to homogeneity attack - if all k records
  share the same sensitive value, k-anonymity doesn't protect it.

## l-diversity

Strengthens k-anonymity by requiring **at least l well-represented
values** of the sensitive attribute within each equivalence class
(Machanavajjhala et al. 2007).

- **Achieve via:** Suppression of records that would break l, or
  perturbation of sensitive values.
- **Weakness:** Vulnerable to skewness / similarity attack - the l
  values may be semantically similar.

## t-closeness

Strengthens l-diversity by requiring the distribution of the
sensitive attribute in each equivalence class be **close** (within
t, by Earth Mover's Distance) to the distribution in the overall
dataset (Li et al. 2007).

- **Trade-off:** Higher t = better utility, lower t = stronger
  privacy.

## Differential privacy

A formal mathematical guarantee: the probability of any output
changes by at most a multiplicative factor (e^ε) when a single
record is added/removed. ε (epsilon) is the privacy budget - lower
ε = stronger privacy.

- **Achieve via:** Noise injection (Laplace / Gaussian
  mechanism) on query outputs, not on the raw dataset.
- **Trade-off:** Utility-vs-budget. Apple, Google, US Census 2020
  use differential privacy.
- **Cite:** NIST SP 800-188:2023 §6; original Dwork 2006 "Calibrating
  noise to sensitivity."

## Picking the model

- **k-anonymity** - baseline for quasi-identifier sets; pick k >= 5
  (k = 10+ for high-risk datasets).
- **l-diversity** - add when a homogeneity attack on the sensitive
  attribute is plausible.
- **t-closeness** - add when the sensitive attribute's distribution
  itself leaks (skewness / similarity).
- **Differential privacy** - use for statistical query release, not
  raw-dataset export; keep ε <= 1 for strong privacy, ε <= 10 relaxed.

## References

- NIST SP 800-188:2023 "De-Identifying Government Datasets" -
  [csrc.nist.gov/pubs/sp/800/188/final](https://csrc.nist.gov/pubs/sp/800/188/final).
  Definitions of k-anonymity, l-diversity, t-closeness, differential
  privacy.
- Sweeney 2002 (k-anonymity), Machanavajjhala et al. 2007
  (l-diversity), Li et al. 2007 (t-closeness), Dwork 2006 "Calibrating
  noise to sensitivity" (differential privacy) - all cited in NIST
  800-188.
