# Archive search - engine bakeoff, week 2

Our current store is end-of-life in Q1 and the 41M-vector document archive has
to move. Two candidates got through procurement. Both are modelled in `src/`
from their own documentation and both are wired into `npm run bakeoff` over a
96-item sample with 18 saved queries.

## What the vendors publish

| Engine | Published claim (vendor's own benchmark page)                    |
|--------|-------------------------------------------------------------------|
| A      | recall@10 0.97 at 1,900 QPS on GIST-1M, single node, 16 vCPU       |
| B      | recall@10 0.99 at 2,800 QPS on GIST-1M, single node, 16 vCPU       |

Neither publishes the parameter settings behind those rows, and neither
benchmark is on anything resembling our archive.

## What our harness printed this morning

    engine A   setting 12   recall@10 0.928
    engine A   setting 16   recall@10 0.961
    engine A   setting 20   recall@10 0.989
    engine A   setting 24   recall@10 0.989
    engine A   setting 32   recall@10 1.000
    engine B   setting 1    recall@10 1.000
    engine B   setting 2    recall@10 1.000
    engine B   setting 3    recall@10 1.000
    engine B   setting 4    recall@10 1.000
    engine B   setting 5    recall@10 1.000

Ravi's draft conclusion, which is what I have been asked to sign:

> B is at ceiling from its lowest setting and stays there. A only reaches
> ceiling at the top of its range and is below B everywhere else. That is the
> same ordering the published benchmarks give, so the sample agrees with the
> vendors. Recommend B, launch on its lowest setting, take the headroom.

## Dana's questions

1. Which engine, and what setting do we launch on?
2. Can the published figures in the table above go in the board pack as our
   basis for the decision?
3. Can we size the production cluster for the 41M archive off this?
