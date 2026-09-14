# A throughput number that goes into a signed contract

## Problem Description

Halvorsen's procurement team wants a written performance commitment attached to
the MSA before they sign, and legal needs the final wording from me by
Thursday. Whatever goes into that schedule is contractual - if we miss it in
production there are service credits attached to it.

Marco ran our load configuration against the pre-production cluster on Monday
8 September and drafted `docs/capacity-statement.md` from the result. There are
two sentences in that draft and legal will lift both of them verbatim. The
export from the run is in `runs/`, the script that produced it is in
`tests/load/`, and `data/samples-2026-09-08.csv` is what our post-processor
keeps out of the raw stream - one request roughly every four seconds, each row
carrying the arrival rate the run was configured for at that moment.

Marco's own position is that the run was clean: nothing was refused, both
configured thresholds came back ok, and the 95th percentile in the summary is
690 ms against a one-second budget. If you agree with him, say so - I would
rather be told the draft is fine than have it rewritten for the sake of it. But
I have to defend each sentence separately, because procurement will.

I am not a performance engineer, and I want to stop being in this position
every quarter. Alongside the answer I want something mechanical I can run
against an export and a sample file that tells me whether the run behind a
number can carry that number, instead of me squinting at a threshold that says
ok.

`lib/csv.mjs` already reads the sample file and has a passing test beside it.

## Output Specification

1. `docs/capacity-statement.md` - the version that goes to legal. Each of the
   two sentences either stands as written, stands reworded, or comes out; say
   which, and what the run actually supports in its place.
2. `scripts/check-capacity.mjs` - the mechanical check. It reads
   `runs/2026-09-08-summary.json` and `data/samples-2026-09-08.csv` and reports
   whether that run can carry a capacity sentence and why not where it cannot.
   Run it, leave the result in `reports/capacity-check.json`, and make it exit
   non-zero on this run.
3. `test/check-capacity.test.mjs` - tests for it, running under `npm test` next
   to the existing test. `npm test` must be green.
4. `tests/load/api.js` - changed so that a repeat of Monday's run does not come
   back reporting that everything passed.

Do not edit anything under `runs/` or `data/`, do not change `lib/csv.mjs` or
`test/csv.test.mjs`, and do not add dependencies.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============
{
  "name": "capacity-reporting",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}

=============== FILE: docs/capacity-statement.md ===============
# Performance commitment - draft for Halvorsen MSA schedule C

Prepared by Marco Deniz, 2026-09-09. Measured against pre-production (8 API
nodes, same instance class as production) with the configuration in
`tests/load/api.js`, run of 2026-09-08.

1. **The platform accepts 1,400 requests per second without refusing or
   queueing away any of them.**
2. **At that rate, 95% of requests complete in under 1,000 ms.**

Supporting detail from the run:

- The configured arrival rate reached 1,400 requests/second and nothing was
  dropped.
- 95th percentile response time: 690 ms.
- 90th percentile response time: 672 ms.
- Error rate: 0.09%.
- Both configured thresholds passed.

=============== FILE: tests/load/api.js ===============
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    ramp_to_peak: {
      executor: 'ramping-arrival-rate',
      startRate: 100,
      timeUnit: '1s',
      preAllocatedVUs: 400,
      maxVUs: 2500,
      stages: [
        { target: 1400, duration: '16m' },
        { target: 1400, duration: '4m' },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed:   ['rate<0.005'],
  },
};

const BASE = __ENV.API_BASE_URL;

export default function () {
  const res = http.get(`${BASE}/api/v2/positions?limit=50`);
  check(res, { 'positions returned': (r) => r.status === 200 });
}

=============== FILE: runs/2026-09-08-summary.json ===============
{
  "run": {
    "started": "2026-09-08T09:12:00Z",
    "duration_s": 1200,
    "script": "tests/load/api.js"
  },
  "metrics": {
    "http_req_duration": {
      "type": "trend",
      "values": { "avg": 411, "min": 94, "med": 268, "max": 4217, "p(90)": 672, "p(95)": 690 },
      "thresholds": { "p(95)<1000": { "ok": true } }
    },
    "http_req_waiting": {
      "type": "trend",
      "values": { "avg": 405, "min": 89, "med": 262, "max": 4212, "p(90)": 666, "p(95)": 684 }
    },
    "http_req_blocked": {
      "type": "trend",
      "values": { "avg": 1.2, "min": 0.2, "med": 0.9, "max": 41, "p(90)": 2.4, "p(95)": 3.1 }
    },
    "http_req_receiving": {
      "type": "trend",
      "values": { "avg": 4.6, "min": 0.7, "med": 3.9, "max": 58, "p(90)": 7.9, "p(95)": 9.4 }
    },
    "http_req_failed": {
      "type": "rate",
      "values": { "rate": 0.0009, "passes": 951, "fails": 1055461 },
      "thresholds": { "rate<0.005": { "ok": true } }
    },
    "checks": {
      "type": "rate",
      "values": { "rate": 0.9991, "passes": 1055461, "fails": 951 }
    },
    "http_reqs": { "type": "counter", "values": { "count": 1056412, "rate": 880.34 } },
    "iterations": { "type": "counter", "values": { "count": 1056412, "rate": 880.34 } },
    "dropped_iterations": { "type": "counter", "values": { "count": 0, "rate": 0 } },
    "iteration_duration": {
      "type": "trend",
      "values": { "avg": 412, "min": 95, "med": 269, "max": 4219, "p(90)": 673, "p(95)": 691 }
    },
    "vus": { "type": "gauge", "values": { "value": 1148, "min": 12, "max": 1642 } },
    "vus_max": { "type": "gauge", "values": { "value": 2500, "min": 2500, "max": 2500 } }
  }
}

=============== FILE: lib/csv.mjs ===============
export function parseCsv(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const header = lines.shift().split(',');
  return lines.map((line) => {
    const cells = line.split(',');
    const row = {};
    header.forEach((key, i) => {
      const raw = cells[i];
      const num = Number(raw);
      row[key] = raw !== '' && !Number.isNaN(num) ? num : raw;
    });
    return row;
  });
}

=============== FILE: test/csv.test.mjs ===============
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../lib/csv.mjs';

test('parses a header and numeric cells', () => {
  const rows = parseCsv('a,b\n1,x\n2.5,y\n');
  assert.deepEqual(rows, [
    { a: 1, b: 'x' },
    { a: 2.5, b: 'y' },
  ]);
});

test('ignores blank trailing lines', () => {
  assert.equal(parseCsv('a\n1\n\n\n').length, 1);
});

=============== FILE: data/samples-2026-09-08.csv ===============
t_s,target_rate,duration_ms,waiting_ms
4,105,152,144
8,111,150,144
12,116,137,134
16,122,140,136
20,127,106,97
24,133,152,147
28,138,120,117
32,143,126,120
36,149,141,134
40,154,123,120
44,160,116,112
48,165,121,116
52,170,146,141
56,176,103,95
60,181,138,133
64,187,138,134
68,192,123,119
72,198,96,92
76,203,131,124
80,208,131,123
84,214,101,93
88,219,128,122
92,225,147,140
96,230,121,118
100,235,132,129
104,241,134,126
108,246,97,91
112,252,142,135
116,257,106,100
120,263,119,115
124,268,107,101
128,273,144,136
132,279,143,134
136,284,156,151
140,290,94,86
144,295,105,102
148,300,128,123
152,306,163,157
156,311,94,92
160,317,117,114
164,322,101,93
168,328,108,101
172,333,123,120
176,338,126,118
180,344,106,98
184,349,165,161
188,355,164,155
192,360,160,156
196,365,150,145
200,371,156,147
204,376,149,140
208,382,105,98
212,387,105,99
216,393,116,110
220,398,110,106
224,403,129,123
228,409,127,118
232,414,120,111
236,420,158,153
240,425,158,156
244,430,153,148
248,436,152,144
252,441,151,147
256,447,141,132
260,452,142,136
264,458,173,168
268,463,164,155
272,468,138,131
276,474,127,124
280,479,173,166
284,485,120,117
288,490,113,110
292,495,166,163
296,501,163,157
300,506,156,151
304,512,145,140
308,517,165,156
312,523,152,144
316,528,136,129
320,533,143,139
324,539,146,138
328,544,124,116
332,550,165,159
336,555,149,147
340,560,166,162
344,566,179,175
348,571,153,147
352,577,185,177
356,582,192,188
360,588,149,140
364,593,133,128
368,598,174,166
372,604,186,182
376,609,183,181
380,615,193,185
384,620,181,178
388,625,142,136
392,631,184,180
396,636,157,154
400,642,148,140
404,647,149,141
408,653,147,140
412,658,173,170
416,663,159,151
420,669,193,188
424,674,165,163
428,680,169,164
432,685,181,178
436,690,156,153
440,696,191,183
444,701,169,165
448,707,222,218
452,712,226,223
456,718,186,181
460,723,194,187
464,728,202,196
468,734,228,220
472,739,193,190
476,745,208,203
480,750,228,223
484,755,230,225
488,761,202,194
492,766,216,207
496,772,246,240
500,777,230,225
504,783,192,188
508,788,189,181
512,793,198,191
516,799,210,207
520,804,258,254
524,810,223,218
528,815,245,238
532,820,243,235
536,826,253,246
540,831,208,204
544,837,235,226
548,842,242,234
552,848,240,234
556,853,213,210
560,858,213,208
564,864,223,218
568,869,257,251
572,875,221,219
576,880,264,259
580,885,248,245
584,891,250,244
588,896,292,284
592,902,238,233
596,907,266,258
600,913,302,296
604,918,254,249
608,923,282,278
612,929,268,264
616,934,261,253
620,940,310,302
624,945,265,262
628,950,304,301
632,956,300,292
636,961,306,298
640,967,286,279
644,972,329,327
648,978,335,328
652,983,296,293
656,988,292,284
660,994,307,303
664,999,304,298
668,1005,317,312
672,1010,310,301
676,1015,345,342
680,1021,345,340
684,1026,351,347
688,1032,340,332
692,1037,365,358
696,1043,345,336
700,1048,383,381
704,1053,385,378
708,1059,377,370
712,1064,350,341
716,1070,374,367
720,1075,347,340
724,1080,403,398
728,1086,371,363
732,1091,396,393
736,1097,417,412
740,1102,387,380
744,1108,420,416
748,1113,415,413
752,1118,383,377
756,1124,398,392
760,1129,403,400
764,1135,414,412
768,1140,429,426
772,1145,429,422
776,1151,443,439
780,1156,420,415
784,1162,456,448
788,1167,418,411
792,1173,445,439
796,1178,478,473
800,1183,431,428
804,1189,429,425
808,1194,474,467
812,1200,448,442
816,1205,499,493
820,1210,471,469
824,1216,511,503
828,1221,476,468
832,1227,514,508
836,1232,519,512
840,1238,525,523
844,1243,500,498
848,1248,510,507
852,1254,533,525
856,1259,489,484
860,1265,499,492
864,1270,494,489
868,1275,515,508
872,1281,541,537
876,1286,549,544
880,1292,535,531
884,1297,560,557
888,1303,566,560
892,1308,569,563
896,1313,537,534
900,1319,560,552
904,1324,547,540
908,1330,556,549
912,1335,569,561
916,1340,570,564
920,1346,571,565
924,1351,633,630
928,1357,584,576
932,1362,599,592
936,1368,640,633
940,1373,661,659
944,1378,642,640
948,1384,618,615
952,1389,2184,2182
956,1395,629,624
960,1400,681,676
964,1400,677,675
968,1400,681,677
972,1400,637,629
976,1400,2191,2187
980,1400,692,689
984,1400,659,651
988,1400,658,653
992,1400,668,665
996,1400,660,658
1000,1400,676,672
1004,1400,669,664
1008,1400,650,647
1012,1400,670,663
1016,1400,643,635
1020,1400,643,641
1024,1400,661,652
1028,1400,685,681
1032,1400,643,636
1036,1400,696,689
1040,1400,645,640
1044,1400,681,679
1048,1400,671,665
1052,1400,659,655
1056,1400,650,648
1060,1400,684,677
1064,1400,676,670
1068,1400,2308,2305
1072,1400,642,636
1076,1400,658,651
1080,1400,649,643
1084,1400,2697,2691
1088,1400,635,631
1092,1400,2208,2200
1096,1400,675,671
1100,1400,699,690
1104,1400,696,688
1108,1400,681,673
1112,1400,633,629
1116,1400,3851,3847
1120,1400,695,689
1124,1400,673,664
1128,1400,692,687
1132,1400,656,650
1136,1400,697,692
1140,1400,642,636
1144,1400,632,629
1148,1400,697,691
1152,1400,634,625
1156,1400,636,629
1160,1400,670,665
1164,1400,664,662
1168,1400,644,641
1172,1400,673,666
1176,1400,673,666
1180,1400,4217,4210
1184,1400,660,652
1188,1400,674,667
1192,1400,633,628
1196,1400,687,685
1200,1400,3785,3777
