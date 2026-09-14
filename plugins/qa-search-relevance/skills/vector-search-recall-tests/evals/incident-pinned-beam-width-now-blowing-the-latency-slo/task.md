# Somebody typed 256 into the search config during an incident in July and it is still there

## Problem Description

Back in July a regulator-lookup query came back missing filings that are
definitely in our corpus, we had nine customer-visible days of it, and the fix
at 18:40 that evening was @dpeters raising the beam setting in
`src/searchConfig.js` from 16 to 256. That closed the incident and nobody has
touched it since.

Platform have now come back at us: search p99 is 340 ms against a 180 ms
objective, and their capacity model says we need to be at or under 90 distance
comparisons per query. We are at 179. The postmortem also left us a floor we
have never enforced anywhere - recall@10 at or above 0.95 on the twenty golden
queries in `data/queries.json`.

Two suggestions on the table and I do not trust either of them.

Ops want it back at 16, on the grounds that 16 was the setting for two years
and the July incident was probably something else. That is the same reasoning
that had us at 16 in July.

Tom ran a sweep last week and published `bench/results.md`. Twelve through
three hundred and eighty-four, a thirty-two fold range, and every row comes
back with the same recall and the same cost to one decimal place. His reading
is that the setting is inert and we should take it to 12, hand the latency back
and close the incident action out. A parameter that does nothing across a 32x
range is not something I have seen before and I would like it explained before
we act on it.

Give me a number I can defend to both of them, and the evidence behind it.

`src/graphIndex.js` is our model of the vendor's index and
`test/graphIndex.test.js` is what pins it. Treat the index as the appliance: do
not edit either file.

## Output Specification

1. `npm run sweep` must print a table you would put your name on - one row per
   candidate setting, each row carrying recall@10 over `data/queries.json` and
   comparisons per query. You may rewrite `bench/sweep.js`.
2. Replace `bench/results.md` with the table your sweep produces and the
   reading of it.
3. Set `src/searchConfig.js` to the setting you recommend.
4. Add `test/search.test.js` which, at whatever `src/searchConfig.js` says,
   asserts recall@10 over the golden queries is at least 0.95 **and**
   comparisons per query is at most 90. It must pass.
5. Write `docs/inc-882-followup.md`: the recommended setting and why that one,
   why Tom's table came out flat, and where that leaves his proposal and ops'.
6. `npm test` must pass with the six tests in `test/graphIndex.test.js`
   unchanged.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "contract-search",
  "version": "6.1.2",
  "private": true,
  "scripts": {
    "test": "node --test",
    "sweep": "node bench/sweep.js"
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

=============== FILE: src/graphIndex.js ===============

'use strict';

// Model of the vendor's proximity-graph index, written from their docs.
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

=============== FILE: src/searchConfig.js ===============

'use strict';

// INC-882 (2026-07-09): ef raised 16 -> 256 after the regulator-lookup misses.
// Do not lower without sign-off from search.
const SEARCH = {
  M: 6,
  efConstruct: 24,
  ef: 256,
};

module.exports = { SEARCH };

=============== FILE: src/search.js ===============

'use strict';

const { createIndex } = require('./graphIndex');
const { SEARCH } = require('./searchConfig');

function buildIndex(vectors) {
  const index = createIndex({ M: SEARCH.M, efConstruct: SEARCH.efConstruct });
  vectors.forEach((vec, i) => index.add(i, vec));
  return index;
}

function search(index, queryVec, k = 10) {
  return index.search(queryVec, { k, ef: SEARCH.ef });
}

module.exports = { buildIndex, search };

=============== FILE: bench/sweep.js ===============

'use strict';

const { createIndex, cosine } = require('../src/graphIndex');
const { SEARCH } = require('../src/searchConfig');
const vectors = require('../data/vectors.json');
const queries = require('../data/queries.json');

const K = 10;
const GRID = [12, 24, 48, 96, 192, 384];

function groundTruth(k = K) {
  return queries.map((q) =>
    vectors
      .map((v, i) => [i, cosine(q, v)])
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

function run() {
  const index = createIndex({ M: SEARCH.M, efConstruct: SEARCH.efConstruct });
  vectors.forEach((v, i) => index.add(i, v));
  const truth = groundTruth();

  const rows = [];
  for (const value of GRID) {
    index.resetCounters();
    const retrieved = queries.map((q) => index.search(q, { k: K, efConstruct: value }));
    rows.push({
      efConstruct: value,
      recall: Number(recallAtK(retrieved, truth).toFixed(3)),
      comparisonsPerQuery: Number((index.comparisons() / queries.length).toFixed(1)),
    });
  }
  return rows;
}

if (require.main === module) {
  console.table(run());
}

module.exports = { run, groundTruth, recallAtK, K };

=============== FILE: bench/results.md ===============

# Beam sweep - 2026-09-09, Tom

`npm run sweep`, 180 vectors, 20 golden queries, k=10, exact reference computed
over the whole file.

| value | recall@10 | comparisons/query |
|-------|-----------|-------------------|
| 12    | 0.940     | 72.3              |
| 24    | 0.940     | 72.3              |
| 48    | 0.940     | 72.3              |
| 96    | 0.940     | 72.3              |
| 192   | 0.940     | 72.3              |
| 384   | 0.940     | 72.3              |

Thirty-two fold range, same recall, same cost, to the decimal. The parameter
does nothing for us. Proposal: take it to 12, hand the latency back to
platform and close INC-882 out.

=============== FILE: test/graphIndex.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/graphIndex');

// A ring of 24 points, so a narrow beam started at point 0 cannot see all of it.
const ring = Array.from({ length: 24 }, (_, i) => {
  const a = (i / 24) * 2 * Math.PI;
  return [Math.cos(a), Math.sin(a), 0.1 * Math.cos(3 * a), 0.1 * Math.sin(3 * a)];
});

const build = (opts) => {
  const index = createIndex(opts);
  ring.forEach((v, i) => index.add(i, v));
  return index;
};

test('every added point is stored', () => {
  assert.equal(build({ M: 4, efConstruct: 16 }).size(), 24);
});

test('a node keeps at most M links', () => {
  const index = build({ M: 4, efConstruct: 16 });
  for (let i = 0; i < 24; i++) assert.ok(index.degree(i) <= 4, `node ${i} has ${index.degree(i)} links`);
});

test('M is fixed when the index is built', () => {
  assert.deepEqual(build({ M: 4, efConstruct: 16 }).params(), { M: 4, efConstruct: 16 });
  assert.ok(build({ M: 8, efConstruct: 16 }).degree(3) > build({ M: 2, efConstruct: 16 }).degree(3));
});

test('a search returns k ids', () => {
  assert.equal(build({ M: 4, efConstruct: 16 }).search(ring[11], { k: 5, ef: 16 }).length, 5);
});

test('a wider beam costs more comparisons', () => {
  const index = build({ M: 4, efConstruct: 16 });
  index.resetCounters();
  index.search(ring[11], { k: 5, ef: 2 });
  const narrow = index.comparisons();
  index.resetCounters();
  index.search(ring[11], { k: 5, ef: 24 });
  assert.ok(index.comparisons() > narrow, `${index.comparisons()} should exceed ${narrow}`);
});

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});

=============== FILE: reports/inc-882.md ===============

# INC-882 - regulator lookup returned incomplete results

2026-07-09. Three regulator-lookup queries came back missing filings that are
in the corpus. Customer-visible for nine days.

Immediate action: `ef` in `src/searchConfig.js` raised 16 -> 256 by @dpeters
at 18:40. Incident closed the same evening.

Actions from the postmortem:

1. Golden query set (`data/queries.json`, 20 queries) and an exact reference
   computed over the whole corpus. **Done.**
2. Retrieval floor: **recall@10 >= 0.95** on the golden set. Below that we are
   back in INC-882. **Agreed, not yet enforced anywhere.**
3. Work out what `ef` should actually be rather than leaving it at the number
   somebody typed during an incident. **Open.**

## Platform capacity note, 2026-09-01

Search p99 is 340 ms against a 180 ms objective. The service's cost is close to
linear in distance comparisons, and the capacity model gives us **90 distance
comparisons per query** at current QPS to land inside the objective. We are
running at 179.
