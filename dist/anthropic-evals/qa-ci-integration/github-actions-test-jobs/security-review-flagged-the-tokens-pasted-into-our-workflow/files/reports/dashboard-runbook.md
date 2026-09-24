# Release dashboard - what the report step is for

`scripts/report.sh` posts one row per run to the release dashboard. Release
engineering reads that dashboard, not the Actions tab, when deciding whether a
commit on `main` has been tested.

A missing row and a failing row mean different things to them. A row that never
arrived is read as "not tested" and holds the release train; a row that arrived
with a failure is read as "tested, and it is red". We have had two incidents
(REL-2209, REL-2251) where the step quietly stopped posting for a week and nobody
noticed, because the job around it stayed green the whole time.
