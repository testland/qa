# regression-all.jmx — census, generated 2026-09-11

Single test plan, single thread group (`all`), 140 HTTP samplers, run serially
per iteration. 200 threads, 90-minute schedule, nightly.

| Product area | Samplers | Share of run time | Wall clock last night |
|--------------|----------|-------------------|-----------------------|
| checkout     | 31       | 19%               | 18 min                |
| search       | 24       | 11%               | 11 min                |
| auth         | 12       |  4%               |  4 min                |
| admin        | 38       | 22%               | 21 min                |
| reporting    | 35       | 44%               | 42 min                |
| **total**    | **140**  | **100%**          | **96 min**            |

Ownership, from CODEOWNERS:

| Product area | Team            |
|--------------|-----------------|
| checkout     | @payments       |
| search       | @discovery      |
| auth         | @identity       |
| admin        | @internal-tools |
| reporting    | @data-platform  |
