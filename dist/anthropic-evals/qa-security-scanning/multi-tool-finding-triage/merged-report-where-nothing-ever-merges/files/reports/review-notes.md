# Notes from the 2026-09-11 review of build 4471

- Priya (frontend): "next@14.2.3 is in the trivy artifact at critical,
  CVE-2025-29927. It is not in the merged report. The gate said PASS. Someone
  said the renderer is dropping the row, which is what happened in June."
- Marco (eng manager): "Four of the six findings on 4471 were caught by more
  than one tool. Three renewals for one list. Pick one and drop the other two in
  November." Renewal date is 2026-11-30; sastpro alone is 40k a year.
- Dan (platform) proposed this one-liner and says the CVE rows stop collapsing
  with it, so the next row would come back:

  ```js
  export function keyFor(f) {
    return `${f.file}::${f.line}::${f.cwe}::${f.package}`;
  }
  ```

  His reasoning: "the tuple is already right for code findings, it just needs
  the package appended so dependency rows are distinguishable. Adding the rule
  id as well would make it exact, since the SARIF spec calls `ruleId` a stable
  value a tool associates with a rule."

- Build 4471 ran semgrep 1.96.0, sastpro 9.4.1 and trivy 0.58.1 against commit
  `3b91c07`. All three produced output. The thirteen-record slice attached is a
  verbatim extract of the normalized input the merge received.
