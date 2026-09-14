# Engine bake-off memo is due Thursday and the only numbers we have are the two the vendors published

## Problem Description

We are moving the archive - 41M vectors - off the in-house index onto a managed
service, and it comes down to two finalists. Dana wants the memo in writing
before the decision meeting on Thursday 2026-09-17 and she has four questions
she wants answered one by one. They are in the slide notes.

Where it stands: the vendors' own pages put Engine A at 0.991 and Engine B at
0.968, both measured on the same 1M-vector public benchmark corpus, and A is
11% cheaper per month. On the published material this is not a close call and
half the room has already decided.

The only thing we have run ourselves is `npm run bakeoff`, which puts both
engines over the 180-vector sample we pulled out of the archive in August with
the twenty golden queries, each at the settings its vendor recommends. It comes
back 0.935 for A and 0.940 for B, which is a good deal closer than the
published gap and which nobody has been able to explain.

Platform have given us two hard numbers for the migration: recall@10 at or
above 0.95 on the golden queries, and at or under 100 distance comparisons per
query at projected QPS. Neither of those appears anywhere in what we have run.

Engine A is a managed service. Our tenant is provisioned with the eight-cell
layout in `data/engine-a-cells.json` and that layout is not a customer setting,
so do not treat it as one - `nProbe` is what we can move. Engine B we build
ourselves, so its build settings are ours.

`src/engineA.js` and `src/engineB.js` are our models of the two engines,
written from the vendors' documentation, and `test/engines.test.js` pins them.
Do not edit any of those three files or the provisioned cell layout.

## Output Specification

1. Rewrite `bench/bakeoff.js` so `npm run bakeoff` prints something Dana could
   act on: for each engine, a row per candidate query-time setting, each row
   carrying recall@10 over `data/queries.json` and comparisons per query.
2. Write `bench/bakeoff.md` with that table and the operating point you would
   pick for each engine.
3. Add `test/engine-choice.test.js` which, for the engine and setting you
   recommend, asserts recall@10 >= 0.95 and comparisons per query <= 100 over
   the golden queries. It must pass.
4. Write `docs/engine-decision.md` answering Dana's four questions in order,
   each one separately, with the evidence for each answer or the reason there
   is none.
5. `npm test` must pass with the six tests in `test/engines.test.js` unchanged.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "archive-search-migration",
  "version": "0.9.0",
  "private": true,
  "scripts": {
    "test": "node --test",
    "bakeoff": "node bench/bakeoff.js"
  }
}

=============== FILE: data/vectors.json ===============

[
  [0.048,-0.091,-0.778,-0.064,-0.393,-0.015,-0.381,-0.284],
  [-0.226,0.292,0.011,0.474,-0.336,0.158,0.608,-0.362],
  [-0.281,0.609,0.506,-0.486,0.174,-0.062,-0.145,0.057],
  [0.177,-0.507,0.05,0.296,-0.476,0.298,0.309,0.459],
  [0.583,-0.775,0.058,-0.105,0.043,-0.082,-0.032,-0.189],
  [-0.391,0.309,0.112,-0.236,-0.322,0.084,0.662,-0.366],
  [0.128,-0.257,0.285,0.48,0.069,0.649,0.36,-0.226],
  [-0.298,-0.373,0.03,-0.195,-0.069,-0.407,-0.724,-0.198],
  [-0.17,-0.322,0.162,-0.284,0.239,0.161,0.557,0.607],
  [0.497,0.311,-0.496,0.13,0.09,0.318,0.02,0.532],
  [-0.328,0.152,-0.3,-0.315,0.044,-0.521,0.624,-0.13],
  [0.074,0.354,0.297,-0.361,0.203,-0.05,-0.766,0.142],
  [-0.515,-0.308,0.182,-0.072,-0.531,0.431,-0.362,-0.058],
  [0.595,-0.117,-0.114,-0.095,0.389,-0.359,-0.51,0.265],
  [-0.119,0.152,0.211,-0.31,-0.069,-0.778,0.359,0.288],
  [-0.367,-0.32,-0.373,-0.404,-0.164,0.108,0.59,-0.269],
  [-0.716,0.035,-0.061,0.387,-0.25,-0.111,-0.425,0.278],
  [-0.37,-0.158,-0.195,-0.263,0.481,0.535,0.461,-0.02],
  [0.2,0.837,0.152,-0.183,-0.05,-0.052,-0.296,-0.334],
  [-0.367,-0.428,0.354,-0.089,-0.59,0.141,0.423,0.038],
  [0.26,-0.162,-0.343,0.138,-0.284,-0.056,-0.768,0.31],
  [-0.168,-0.195,0.735,0.019,-0.388,0.262,0.375,0.182],
  [-0.421,-0.412,-0.03,-0.007,-0.522,0.276,-0.429,-0.344],
  [-0.087,0.235,0.549,-0.37,-0.055,0.54,0.447,-0.066],
  [0.594,-0.324,0.174,0.282,0.21,0.292,0.485,-0.259],
  [-0.51,0.469,0.011,0.217,-0.292,-0.307,-0.497,0.215],
  [0.071,0.078,-0.24,-0.029,0.505,-0.003,0.721,-0.394],
  [0.549,0.141,0.079,-0.383,-0.168,0.295,-0.641,0.024],
  [-0.609,0.065,-0.124,-0.055,0.062,0.682,0.367,-0.057],
  [0.404,0.475,-0.049,-0.221,0.409,0.168,-0.51,0.323],
  [-0.158,-0.016,0.269,-0.363,-0.101,0.725,0.427,0.23],
  [-0.014,-0.627,-0.393,0.36,-0.171,-0.312,0.197,0.396],
  [-0.134,-0.013,0.198,-0.179,-0.471,0.543,0.532,-0.333],
  [0.63,-0.297,0.126,-0.114,0.388,0.268,0.514,0.001],
  [-0.207,0.334,0.189,0.4,0.153,0.14,-0.29,0.723],
  [0.112,-0.411,-0.105,-0.442,-0.048,0.771,-0.12,0.029],
  [0.511,0.161,-0.461,-0.173,-0.228,0.533,0.318,-0.18],
  [-0.062,0.071,0.406,0.753,-0.098,-0.207,0.255,-0.377],
  [0.798,0.283,-0.08,-0.163,0.362,-0.131,-0.313,0.054],
  [0.414,-0.156,-0.113,-0.068,-0.689,0.439,0.18,-0.295],
  [0.352,-0.454,0.083,-0.026,0.74,-0.221,0.1,-0.236],
  [-0.02,-0.484,0.503,-0.398,0.438,0.398,-0.013,0.058],
  [0.646,0.358,-0.219,-0.207,-0.285,0.255,-0.001,0.465],
  [0.06,0.64,0.399,-0.259,0.473,0.209,0.291,0.094],
  [-0.372,-0.209,-0.268,-0.284,0.733,0.348,0.042,-0.079],
  [0.187,-0.362,-0.725,0.09,0.317,-0.302,0.236,-0.231],
  [-0.527,0.442,0.416,0.556,-0.053,-0.079,-0.086,0.166],
  [-0.063,0.012,0.332,-0.464,0.447,0.028,-0.577,0.369],
  [-0.147,-0.02,-0.044,-0.701,-0.43,0.294,-0.357,0.293],
  [0.124,-0.635,0.153,0.365,0.128,-0.414,0.345,-0.343],
  [-0.225,0.171,0.277,-0.2,-0.391,-0.639,0.491,0.041],
  [0.421,0.38,-0.054,-0.096,0.126,-0.251,0.26,-0.721],
  [-0.695,0.065,0.2,0.336,0.113,0.486,-0.318,0.101],
  [-0.234,-0.154,-0.726,-0.503,-0.042,0.098,0.268,-0.241],
  [0.465,-0.093,0.269,0.007,0.454,-0.23,-0.621,0.241],
  [-0.302,0.246,0.063,0.531,-0.178,-0.262,0.679,-0.007],
  [-0.134,0.222,0.47,-0.068,0.377,0.021,-0.388,0.643],
  [-0.155,-0.473,0.457,0.046,-0.568,0.133,0.289,-0.342],
  [0.57,-0.479,0.502,0.036,-0.099,-0.146,0.352,0.196],
  [-0.123,-0.136,-0.181,0.108,0.168,-0.269,0.897,0.125],
  [0.217,-0.375,0.779,0.01,0.205,-0.206,-0.037,-0.347],
  [-0.422,0.358,0.176,0.504,0.042,-0.458,-0.444,-0.002],
  [-0.099,-0.398,-0.632,0.061,0.408,0.002,0.321,-0.398],
  [0.848,-0.224,-0.116,0.157,0.228,0.002,0.346,0.142],
  [-0.345,0.426,0.578,0.51,-0.264,0.035,-0.1,-0.154],
  [-0.007,0.038,0.483,-0.328,-0.063,-0.023,-0.751,0.299],
  [0.117,0.119,0.5,-0.175,-0.526,0.099,-0.545,0.329],
  [0.31,0.356,0.222,0.028,0.122,-0.173,0.26,-0.784],
  [-0.226,0.294,0.415,0.491,-0.365,0.128,0.537,0.107],
  [0.162,-0.124,0.444,0.32,0.076,-0.026,0.558,-0.584],
  [-0.254,0.075,-0.571,0.071,0.26,0.235,-0.627,0.287],
  [0.081,-0.225,-0.013,-0.417,0.138,0.254,0.823,-0.093],
  [0.149,0.001,-0.023,0,-0.394,0.866,0.027,-0.268],
  [0.66,0.06,0.421,0.32,-0.417,-0.279,-0.13,0.111],
  [0.168,0.351,0.575,-0.491,-0.411,-0.183,-0.266,-0.049],
  [0.104,0.159,0.48,-0.425,-0.59,0.124,0.422,0.103],
  [0.754,-0.11,0.293,-0.167,0.357,0.022,0.386,0.17],
  [0.142,0.659,-0.336,0.275,0.489,0.26,0.053,0.22],
  [-0.116,-0.202,0.398,0.304,0.556,0.014,0.086,-0.615],
  [-0.117,0.377,-0.425,0.085,-0.158,-0.417,-0.654,-0.172],
  [-0.856,-0.371,-0.146,-0.111,0.05,-0.136,0.208,0.18],
  [0.027,0.241,0.134,0.042,-0.382,0.763,-0.05,-0.437],
  [-0.687,-0.168,0.365,0.081,0.401,0.09,0.203,-0.387],
  [-0.102,-0.275,-0.551,-0.381,0.391,-0.134,-0.443,0.312],
  [0.107,-0.084,0.595,0.612,-0.101,0.142,0.452,-0.139],
  [-0.378,-0.751,0.144,-0.021,0.247,0.021,0.244,-0.388],
  [-0.578,-0.157,-0.076,-0.228,-0.079,-0.057,0.758,0.009],
  [-0.07,-0.508,-0.096,0.215,0.233,0.677,0.398,-0.1],
  [0.12,0.418,0.462,0.65,0.201,-0.359,-0.037,-0.053],
  [0.41,-0.729,0.165,-0.326,0.283,0.212,-0.189,-0.077],
  [0.455,-0.223,-0.116,-0.182,0.508,0.026,-0.604,-0.27],
  [0.189,0.352,-0.241,0.171,-0.079,0.822,0.256,0.072],
  [-0.418,0.158,0.083,-0.119,-0.437,0.534,-0.113,0.538],
  [0.058,-0.349,0.076,-0.287,-0.623,0.403,0.359,0.327],
  [0.448,-0.827,-0.127,0.038,0.167,0.04,-0.168,0.199],
  [-0.244,0.178,0.448,-0.146,0.059,0.062,0.696,0.441],
  [0.28,0.136,0.084,0.343,0.472,0.333,0.579,-0.332],
  [-0.322,0.632,-0.187,0.123,-0.315,-0.113,-0.521,-0.25],
  [0.493,-0.186,0.128,0.095,0.473,0.363,0.455,0.366],
  [0.63,-0.056,-0.286,0.065,-0.025,0.571,-0.201,-0.383],
  [-0.043,-0.082,-0.144,-0.127,-0.339,0.255,0.836,0.275],
  [0.198,0.694,-0.271,-0.248,-0.016,0.339,-0.197,0.437],
  [-0.405,-0.491,0.613,-0.034,-0.004,-0.062,0.457,0.077],
  [0.403,-0.586,0.407,0.02,0.267,-0.447,0.225,-0.078],
  [-0.194,0.255,0.49,-0.016,-0.073,0.363,0.675,-0.256],
  [0.454,-0.081,0.347,0.37,0.144,-0.053,0.642,-0.307],
  [-0.475,0.099,0.343,0.198,-0.221,0.24,-0.017,-0.707],
  [-0.112,0.053,0.028,-0.767,0.081,0.35,-0.402,-0.324],
  [0.63,0.075,-0.518,0.279,-0.07,-0.156,0.206,-0.424],
  [-0.457,0.184,0.642,-0.234,0.489,0.178,-0.023,-0.137],
  [0.323,0.001,0.451,0.111,0.412,-0.309,-0.214,0.608],
  [-0.573,0.285,0.684,-0.136,0.128,0.101,0.11,0.255],
  [-0.146,-0.243,-0.335,0.218,0.605,0.401,-0.407,-0.261],
  [0.212,0.163,0.48,-0.53,0.06,-0.369,0.526,-0.016],
  [0.205,0.012,0.587,-0.24,0.156,0.256,0.407,-0.547],
  [-0.814,0.218,0.286,0.185,-0.255,0.021,-0.238,-0.227],
  [-0.271,-0.244,-0.068,-0.336,0.403,0.286,0.526,0.478],
  [0.369,-0.683,-0.326,0.113,-0.169,0.293,-0.354,-0.195],
  [-0.088,0.151,0.228,-0.173,0.035,-0.685,0.642,0.069],
  [-0.032,-0.225,0.038,-0.485,-0.031,0.009,-0.838,0.09],
  [0.291,-0.641,-0.185,-0.383,-0.09,0.109,0.47,-0.287],
  [0.124,-0.702,-0.264,0.39,-0.116,-0.132,0.416,-0.26],
  [-0.321,0.046,0.594,-0.258,-0.429,-0.355,0.392,-0.107],
  [-0.101,-0.44,0.432,0.527,0.186,0.166,0.513,0.084],
  [0.16,0.2,0.131,0.88,0.14,-0.07,-0.099,0.329],
  [-0.405,-0.007,-0.124,-0.324,-0.14,0.457,0.696,0.046],
  [0.541,0.177,0.073,-0.614,0.112,-0.501,-0.164,0.055],
  [-0.175,0.346,0.479,0.233,-0.408,0.177,0.586,-0.155],
  [0.322,0.206,0.065,-0.494,0.353,-0.042,-0.222,0.655],
  [-0.076,0.032,0.868,-0.128,-0.3,0.073,0.073,0.349],
  [-0.054,-0.625,0.627,-0.02,0.218,-0.136,-0.189,0.333],
  [-0.142,-0.277,0.404,-0.43,-0.34,0.492,0.048,-0.442],
  [0.012,-0.696,-0.024,0.02,0.092,-0.243,0.668,-0.028],
  [0.184,-0.154,-0.078,-0.214,-0.152,0.858,-0.285,0.223],
  [-0.566,-0.609,0.179,-0.451,-0.017,0.269,-0.013,-0.024],
  [0.15,-0.402,-0.577,0.191,-0.384,-0.02,0.068,-0.542],
  [0.659,-0.008,-0.115,-0.234,0.021,0.244,0.497,0.437],
  [0.058,-0.47,0.285,0.55,-0.342,-0.488,0.188,0.032],
  [-0.112,-0.091,0.719,0.146,-0.36,-0.412,-0.357,0.119],
  [-0.345,-0.286,-0.046,0.01,0.176,0.391,0.3,-0.723],
  [0.36,0.029,0.173,-0.368,0.462,0.229,0.271,0.603],
  [0.74,-0.32,0.327,0.179,-0.188,-0.023,-0.023,0.418],
  [-0.204,-0.331,-0.272,-0.107,-0.142,-0.228,-0.013,0.831],
  [-0.538,-0.315,-0.599,-0.391,0.154,-0.119,0.25,-0.01],
  [0.369,0.468,-0.249,0.178,0.103,0.139,0.365,-0.623],
  [-0.36,0.074,0.401,0.34,-0.439,0.203,0.501,-0.322],
  [0.207,0.254,0.376,-0.402,0.383,-0.334,-0.574,-0.036],
  [-0.365,-0.183,0.119,0.144,-0.58,0.512,0.446,-0.026],
  [0.329,-0.768,0.027,-0.088,-0.11,-0.403,0.325,0.113],
  [-0.417,-0.041,0.466,-0.541,0.363,-0.314,0.271,0.1],
  [0.609,-0.284,0.264,0.01,0.39,0.159,0.254,-0.486],
  [-0.755,0.224,0.134,0.233,-0.165,-0.356,-0.389,-0.039],
  [0.024,-0.059,-0.06,-0.157,0.185,0.939,0.004,0.229],
  [0.375,-0.222,-0.173,0.295,-0.197,-0.355,-0.197,-0.7],
  [-0.147,0.007,-0.12,0.573,-0.189,0.623,0.416,-0.198],
  [0.738,-0.368,0.084,-0.155,-0.173,0.2,-0.351,0.308],
  [-0.116,-0.027,0.707,0.243,0.104,0.475,0.401,-0.175],
  [0.281,-0.59,0.139,-0.224,0.304,-0.131,-0.489,-0.395],
  [-0.093,-0.098,0.229,-0.375,0.112,0.329,0.812,-0.09],
  [0.446,-0.452,-0.38,0.549,-0.063,-0.085,0.351,0.13],
  [-0.268,-0.196,-0.352,0.233,-0.179,0.164,-0.657,0.469],
  [-0.003,-0.786,-0.106,-0.337,0.328,0.007,0.38,0.069],
  [0.362,-0.239,-0.182,-0.28,-0.485,0.674,-0.082,-0.064],
  [-0.444,-0.021,0.209,0.165,-0.164,0.142,0.824,-0.075],
  [-0.229,-0.025,0.048,-0.558,-0.109,0.189,-0.708,0.29],
  [0.073,0.313,0.459,-0.536,-0.048,-0.031,0.247,0.578],
  [0.228,-0.694,0.243,-0.166,0.568,-0.137,-0.187,0.062],
  [-0.321,0.255,-0.073,-0.088,-0.472,0.078,0.751,-0.163],
  [0.303,0.373,0.039,0.516,-0.289,-0.076,0.332,-0.55],
  [-0.04,0.302,-0.645,0.226,0.007,-0.614,-0.213,-0.136],
  [-0.028,-0.103,-0.267,-0.218,0.04,0.778,0.471,-0.202],
  [0.169,0.159,0.747,-0.23,-0.159,-0.006,0.109,-0.545],
  [-0.543,-0.42,0.439,0.458,0.223,0.218,0.057,0.161],
  [0.417,0.689,0.129,-0.495,0.161,-0.032,-0.241,0.072],
  [0.047,-0.217,0.553,0.159,-0.135,0.69,0.353,-0.023],
  [-0.213,-0.567,0.418,-0.092,-0.015,0.058,0.604,0.286],
  [-0.196,0.22,0.314,0.245,-0.519,-0.109,0.667,0.171],
  [0.048,-0.395,0.406,0.247,0.286,0.471,0.352,-0.434],
  [-0.896,0.183,0.112,-0.007,-0.109,-0.283,-0.195,-0.146],
  [0.103,-0.111,0.011,0.029,0.892,0.345,0.105,0.227]
]

=============== FILE: data/queries.json ===============

[
  [-0.092,0.831,-0.226,0.211,-0.169,0.315,0.22,-0.172],
  [-0.08,-0.108,0.738,0.471,-0.314,-0.143,-0.121,0.286],
  [-0.572,0.4,-0.247,0.212,0.187,0.135,-0.582,0.123],
  [-0.365,-0.356,-0.068,-0.31,-0.603,0.387,0.044,-0.35],
  [0.507,0.053,-0.016,0.685,0.35,-0.015,0.208,-0.324],
  [-0.062,0.166,0.353,0.485,0.414,0.013,0.661,-0.023],
  [0.104,-0.287,0.102,0.758,0.091,-0.377,0.413,0.031],
  [-0.589,-0.027,0.237,0.544,-0.209,-0.086,-0.252,0.43],
  [-0.372,-0.349,0.122,-0.55,0.287,-0.179,0.554,-0.016],
  [0.302,0.077,-0.586,-0.121,-0.093,0.314,0.528,-0.398],
  [-0.459,0.031,0.008,0.16,0.209,-0.049,0.389,-0.752],
  [0.134,0.181,0.364,-0.234,0.486,-0.219,-0.493,0.484],
  [0.369,-0.07,0,0.121,-0.367,-0.603,0.341,-0.479],
  [0.116,-0.284,0.175,-0.079,0.302,-0.593,0.498,-0.423],
  [-0.12,-0.191,0.068,0.043,0.047,-0.261,0.847,0.394],
  [-0.479,-0.105,-0.435,0.554,0.101,0.104,0.383,-0.309],
  [-0.408,0.078,-0.334,-0.013,-0.392,-0.357,-0.488,0.443],
  [-0.031,-0.647,0.033,0.34,0.266,0.623,-0.007,-0.077],
  [0.454,0.145,0.013,0.645,-0.462,0.158,-0.035,-0.34],
  [-0.305,0.699,0.364,0.063,-0.309,0.292,0.118,-0.295]
]

=============== FILE: data/engine-a-cells.json ===============

[
  [0.048,-0.091,-0.778,-0.064,-0.393,-0.015,-0.381,-0.284],
  [-0.244,0.178,0.448,-0.146,0.059,0.062,0.696,0.441],
  [0.207,0.254,0.376,-0.402,0.383,-0.334,-0.574,-0.036],
  [0.124,-0.635,0.153,0.365,0.128,-0.414,0.345,-0.343],
  [-0.372,-0.209,-0.268,-0.284,0.733,0.348,0.042,-0.079],
  [-0.814,0.218,0.286,0.185,-0.255,0.021,-0.238,-0.227],
  [0.16,0.2,0.131,0.88,0.14,-0.07,-0.099,0.329],
  [0.189,0.352,-0.241,0.171,-0.079,0.822,0.256,0.072]
]

=============== FILE: src/engineA.js ===============

'use strict';

// Model of Engine A: an inverted-list index. Written from the vendor's docs.
// Every vector lands in the cell whose centroid is closest; a query scans the
// nProbe closest cells.

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function cosine(a, b) {
  const d = Math.sqrt(dot(a, a)) * Math.sqrt(dot(b, b));
  return d === 0 ? 0 : dot(a, b) / d;
}

function fitCentroids(vectors, n) {
  const picked = [vectors[0]];
  while (picked.length < n) {
    let best = null;
    let bestScore = Infinity;
    for (const v of vectors) {
      const worst = Math.max(...picked.map((p) => cosine(p, v)));
      if (worst < bestScore) { bestScore = worst; best = v; }
    }
    picked.push(best);
  }
  return picked;
}

function createIndex({ centroids, nProbe = 2 }) {
  const cells = centroids.map(() => []);
  let comparisons = 0;

  const cellOrder = (v) =>
    centroids
      .map((c, i) => [i, cosine(v, c)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .map(([i]) => i);

  return {
    size: () => cells.reduce((n, c) => n + c.length, 0),
    cellSizes: () => cells.map((c) => c.length),
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },

    add(id, vec) {
      cells[cellOrder(vec)[0]].push({ id, vec });
      return true;
    },

    search(queryVec, { k = 10, nProbe: probe = nProbe } = {}) {
      const scored = [];
      for (const ci of cellOrder(queryVec).slice(0, probe)) {
        for (const p of cells[ci]) {
          comparisons += 1;
          scored.push([p.id, cosine(queryVec, p.vec)]);
        }
      }
      scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      return scored.slice(0, k).map(([id]) => id);
    },
  };
}

module.exports = { createIndex, fitCentroids, cosine };

=============== FILE: src/engineB.js ===============

'use strict';

// Model of Engine B: a proximity graph. Written from the vendor's docs.
//
// createIndex({ M, efConstruct }) builds the graph. search(vec, { k, ef }) walks it.

function dot(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}

function norm(v) {
  return Math.sqrt(dot(v, v));
}

function cosine(a, b) {
  const d = norm(a) * norm(b);
  return d === 0 ? 0 : dot(a, b) / d;
}

function createIndex({ M = 6, efConstruct = 24 } = {}) {
  const points = [];
  const links = [];
  let comparisons = 0;

  function beam(target, width, limit) {
    const cap = limit === undefined ? points.length : limit;
    if (cap === 0) return [];
    const seen = new Set([0]);
    comparisons += 1;
    let frontier = [[0, cosine(target, points[0].vec)]];
    const found = [...frontier];
    let guard = 0;
    while (frontier.length && guard++ < 4000) {
      frontier.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      const [node] = frontier.shift();
      if (found.length >= width && cosine(target, points[node].vec) < found[found.length - 1][1]) break;
      for (const n of links[node]) {
        if (n >= cap || seen.has(n)) continue;
        seen.add(n);
        comparisons += 1;
        const s = cosine(target, points[n].vec);
        found.push([n, s]);
        frontier.push([n, s]);
      }
      found.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
      found.length = Math.min(found.length, width);
      if (frontier.length > width) {
        frontier.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
        frontier.length = width;
      }
    }
    return found;
  }

  function prune(node) {
    const scored = links[node].map((n) => [n, cosine(points[node].vec, points[n].vec)]);
    scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    links[node] = scored.slice(0, M).map(([n]) => n);
  }

  return {
    size: () => points.length,
    degree: (i) => links[i].length,
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },
    params: () => ({ M, efConstruct }),

    add(id, vec) {
      const i = points.length;
      points.push({ id, vec });
      links.push([]);
      if (i === 0) return true;
      const chosen = beam(vec, efConstruct, i).slice(0, M);
      links[i] = chosen.map(([n]) => n);
      for (const [n] of chosen) {
        if (!links[n].includes(i)) { links[n].push(i); prune(n); }
      }
      return true;
    },

    search(queryVec, { k = 10, ef = 24 } = {}) {
      return beam(queryVec, Math.max(ef, k)).slice(0, k).map(([n]) => points[n].id);
    },
  };
}

module.exports = { createIndex, cosine, dot, norm };

=============== FILE: bench/bakeoff.js ===============

'use strict';

const engineA = require('../src/engineA');
const engineB = require('../src/engineB');
const cells = require('../data/engine-a-cells.json');
const vectors = require('../data/vectors.json');
const queries = require('../data/queries.json');

const K = 10;

// Vendor-recommended defaults for a corpus this size.
const A_DEFAULT_NPROBE = 4;
const B_DEFAULT_EF = 24;

function groundTruth(k = K) {
  return queries.map((q) =>
    vectors
      .map((v, i) => [i, engineA.cosine(q, v)])
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, k)
      .map(([i]) => i),
  );
}

function recallAtK(retrieved, truth) {
  let total = 0;
  for (let i = 0; i < truth.length; i++) {
    const expected = new Set(truth[i]);
    total += retrieved[i].filter((id) => expected.has(id)).length / truth[i].length;
  }
  return total / truth.length;
}

function buildA() {
  const index = engineA.createIndex({ centroids: cells, nProbe: A_DEFAULT_NPROBE });
  vectors.forEach((v, i) => index.add(i, v));
  return index;
}

function buildB() {
  const index = engineB.createIndex({ M: 6, efConstruct: 24 });
  vectors.forEach((v, i) => index.add(i, v));
  return index;
}

function run() {
  const truth = groundTruth();
  const a = buildA();
  const b = buildB();
  return [
    {
      engine: 'A',
      recall: Number(recallAtK(queries.map((q) => a.search(q, { k: K })), truth).toFixed(3)),
    },
    {
      engine: 'B',
      recall: Number(recallAtK(queries.map((q) => b.search(q, { k: K, ef: B_DEFAULT_EF })), truth).toFixed(3)),
    },
  ];
}

if (require.main === module) console.table(run());

module.exports = { run, groundTruth, recallAtK, buildA, buildB, K };

=============== FILE: test/engines.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const engineA = require('../src/engineA');
const engineB = require('../src/engineB');

const CELLS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
];

const ring = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  return [Math.cos(a), Math.sin(a), 0.1 * Math.cos(3 * a)];
});

test('engine A stores every added vector', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 2 });
  ring.forEach((v, i) => index.add(i, v));
  assert.equal(index.size(), 24);
});

test('engine A only scores the cells it probes', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 1 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), index.cellSizes()[0]);
});

test('engine A probing every cell scores every vector', () => {
  const index = engineA.createIndex({ centroids: CELLS, nProbe: 3 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search([1, 0, 0], { k: 10 });
  assert.equal(index.comparisons(), 24);
});

test('engine B stores every added vector', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  assert.equal(index.size(), 24);
});

test('engine B keeps at most M links per node', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  for (let i = 0; i < 24; i++) assert.ok(index.degree(i) <= 4);
});

test('engine B walks further with a wider beam', () => {
  const index = engineB.createIndex({ M: 4, efConstruct: 16 });
  ring.forEach((v, i) => index.add(i, v));
  index.resetCounters();
  index.search(ring[7], { k: 5, ef: 2 });
  const narrow = index.comparisons();
  index.resetCounters();
  index.search(ring[7], { k: 5, ef: 24 });
  assert.ok(index.comparisons() > narrow);
});

=============== FILE: reports/bakeoff-deck.md ===============

# Archive search migration - engine bake-off, slide notes

Decision meeting Thursday 2026-09-17. We are moving 41M vectors off the
in-house index onto a managed service. Two finalists.

## Published numbers (vendor material, both on the same public benchmark set)

| Engine | recall@10 | Notes from the vendor page                        |
|--------|-----------|---------------------------------------------------|
| A      | 0.991     | "measured on a 1M-vector public benchmark corpus"  |
| B      | 0.968     | "measured on a 1M-vector public benchmark corpus"  |

Two and a half points in A's favour, and A is 11% cheaper per month.

## What we have run ourselves

`npm run bakeoff` on `data/vectors.json`, a 180-vector sample pulled out of the
archive in August, against the 20 golden queries in `data/queries.json`. Both
engines at the settings their vendors recommend for a corpus this size.

Engine A is a managed service: our tenant is provisioned with the eight-cell
layout in `data/engine-a-cells.json` and the cell layout is not a customer
setting. `nProbe` is.

## Platform constraints for the migration

- Retrieval floor: recall@10 >= 0.95 on the golden queries.
- Capacity: at or under 100 distance comparisons per query at projected QPS.

## What Dana wants answered in writing before Thursday

1. Which engine do we migrate to, and at what settings?
2. The vendor numbers put A ahead by two and a half points and A is cheaper.
   Do we need to run anything more ourselves, or can we sign off on those?
3. Does the answer hold at the full 41M-vector archive, or is it only true of
   the sample?
4. What recall figure do we put in the contract as the service level?
