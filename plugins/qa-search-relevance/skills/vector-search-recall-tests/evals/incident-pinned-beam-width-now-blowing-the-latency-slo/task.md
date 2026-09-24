# One number for config/search.json, and something better than "I disagree" for Tom and Nadia

## Problem Description

Six weeks ago an on-call engineer ended a relevance incident by raising the
beam width in `config/search.json` from 24 to 256. It worked, the complaints
stopped inside an hour, and the value has been pinned there ever since with a
comment nobody has revisited. Since the 9th the search tier's p95 has been over
its 40 ms budget and the cost gate has been failing for four days straight, so
nothing ships until somebody produces a number.

Two people have already produced one. Tom ran our sweep this morning, got the
same recall and the same cost at all ten widths in the grid, and concluded that
the width is not what is costing us - his proposal is to leave the config alone
and move the tier onto a bigger instance type, which is roughly 4k a month.
Nadia's proposal is the opposite: put it back to 12, because that is what came
out clean when somebody checked it after the August fix, and take the saving.

I cannot ship either of those on the strength of what is attached. Both of them
are inferences from a run somebody did once, and neither comes with a recall
figure for the configuration that is actually deployed right now.

What I need is a single value to put in the config, the evidence that it clears
both gates, and a paragraph each for Tom and Nadia that engages with what they
measured rather than talking past it. The two gates and the production cost
figure are in the incident report.

`src/graphIndex.js` and `test/graphIndex.test.js` are our model of the vendor's
index, written from their documentation - do not edit either, they describe
someone else's product. Everything else is ours.

## Output Specification

1. The value you are shipping, set in `config/search.json`, and the measured
   evidence behind it.
2. Fix anything else in the repository that needs fixing, within that limit.
3. Add `test/searchBudget.test.js` holding whatever `config/search.json` says
   to the two gates named in the incident report.
4. Write `docs/inc-3904-width.md`: the value, the numbers, and the answers to
   Tom and to Nadia.
5. `npm test` must pass when you are done, including the six tests already in
   `test/graphIndex.test.js`.

## Input Files

Extract the following files before beginning.

=============== FILE: package.json ===============

{
  "name": "vector-search-tier",
  "version": "5.4.1",
  "private": true,
  "scripts": {
    "test": "node --test",
    "sweep": "node bench/sweep.js"
  }
}

=============== FILE: config/search.json ===============

{
  "index": { "M": 4 },
  "query": { "k": 10, "ef": 256 }
}

=============== FILE: data/corpus.json ===============

[
  {"id":"v-001","vec":[0.1651,-0.6105,0.1949,-0.3674,0.1392,-0.416,-0.4784,0.0765]},
  {"id":"v-002","vec":[-0.1388,-0.7924,-0.0574,0.1404,0.0165,-0.2268,-0.392,0.3529]},
  {"id":"v-003","vec":[0.0211,0.0734,-0.0193,-0.8813,0.0206,-0.1257,-0.1743,-0.4129]},
  {"id":"v-004","vec":[-0.2171,-0.5666,-0.3773,0.1374,-0.3012,0.2312,-0.2492,0.5141]},
  {"id":"v-005","vec":[0.2623,-0.0089,0.1344,-0.1668,-0.4003,-0.593,-0.611,0.0028]},
  {"id":"v-006","vec":[0.0184,-0.6988,-0.3129,-0.3575,0.2327,0.341,-0.3162,-0.1231]},
  {"id":"v-007","vec":[0.3668,0.0845,-0.6085,-0.1405,0.1322,-0.5867,-0.0378,-0.3243]},
  {"id":"v-008","vec":[0.4423,-0.0474,0.0849,-0.8473,0.1997,-0.0335,-0.1556,-0.1082]},
  {"id":"v-009","vec":[0.4887,-0.4451,0.0787,-0.6223,0.2229,-0.3398,0.0527,-0.0416]},
  {"id":"v-010","vec":[0.0239,-0.1472,0.0438,-0.5443,-0.3291,-0.5422,-0.5234,-0.0579]},
  {"id":"v-011","vec":[-0.2289,-0.0912,-0.3971,-0.7268,0.3898,-0.177,0.1766,-0.1975]},
  {"id":"v-012","vec":[-0.0693,0.109,-0.3576,-0.6631,0.3021,-0.3047,-0.3835,0.2907]},
  {"id":"v-013","vec":[0.1532,-0.3299,-0.525,-0.5326,-0.0307,-0.2121,0.0626,0.5085]},
  {"id":"v-014","vec":[0.3707,0.0009,-0.0338,0.1675,0.3804,0.3082,-0.7701,-0.0265]},
  {"id":"v-015","vec":[-0.0005,-0.5552,-0.3259,-0.2424,0.1103,-0.4587,-0.5493,-0.0502]},
  {"id":"v-016","vec":[0.2344,-0.8365,0.0045,-0.1817,0.1327,0.2951,-0.1423,0.2956]},
  {"id":"v-017","vec":[-0.0044,-0.7589,-0.3683,-0.1486,0.0441,0.096,0.0052,0.5052]},
  {"id":"v-018","vec":[0.1624,-0.8436,-0.1073,0.0544,-0.4103,-0.0588,0.1139,-0.2504]},
  {"id":"v-019","vec":[0.4984,-0.2858,-0.5153,-0.1454,0.2992,-0.4116,-0.3483,0.0537]},
  {"id":"v-020","vec":[0.0844,-0.3736,-0.5513,-0.385,-0.0717,0.28,-0.3607,0.4332]},
  {"id":"v-021","vec":[0.3326,0.4337,0.32,0.6122,0.0111,0.3394,-0.3239,-0.0621]},
  {"id":"v-022","vec":[0.34,-0.2154,0.4274,0.5838,0.1138,0.2946,-0.253,0.3883]},
  {"id":"v-023","vec":[0.4839,-0.0465,0.1869,0.5714,-0.1048,0.1972,0.3213,0.499]},
  {"id":"v-024","vec":[0.376,0.3417,0.4438,0.4216,-0.4269,0.1409,0.185,0.3618]},
  {"id":"v-025","vec":[0.2282,-0.1154,-0.1672,0.4673,0.0767,0.3107,0.4065,0.6485]},
  {"id":"v-026","vec":[0.5144,0.4789,-0.1151,0.2414,-0.524,-0.2029,0.3281,0.1049]},
  {"id":"v-027","vec":[-0.3975,-0.2953,-0.3116,-0.0474,-0.8007,0.0245,-0.0327,0.113]},
  {"id":"v-028","vec":[-0.1398,0.5958,0.1052,0.6274,-0.3379,0.2113,0.2006,-0.1474]},
  {"id":"v-029","vec":[0.2693,0.489,0.4445,-0.0497,0.0308,0.3595,0.3645,0.4746]},
  {"id":"v-030","vec":[0.2638,0.2013,0.1249,0.2412,-0.5825,-0.2315,-0.2402,0.6046]},
  {"id":"v-031","vec":[-0.3011,-0.1138,0.3807,-0.2462,-0.7777,0.206,-0.0558,-0.2011]},
  {"id":"v-032","vec":[-0.1627,-0.2769,-0.0117,0.7044,-0.3188,0.2999,-0.442,-0.1168]},
  {"id":"v-033","vec":[0.2654,-0.217,-0.0107,0.5886,-0.4518,0.4492,0.3343,0.1347]},
  {"id":"v-034","vec":[-0.2887,0.2874,0.6141,0.4373,-0.1672,0.4493,-0.1883,-0.0192]},
  {"id":"v-035","vec":[0.3221,-0.1915,0.5629,0.5549,-0.2884,-0.206,-0.3079,0.1197]},
  {"id":"v-036","vec":[0.1665,-0.0757,0.7372,0.5635,0.1439,0.0755,-0.2767,-0.0507]},
  {"id":"v-037","vec":[0.0992,0.7104,0.154,0.3969,-0.0764,0.1174,0.0406,0.5319]},
  {"id":"v-038","vec":[0.3422,-0.2082,-0.0491,0.4805,-0.2343,0.3639,0.1986,0.616]},
  {"id":"v-039","vec":[-0.1531,0.1777,0.3816,0.2742,-0.6759,0.0775,0.3599,0.363]},
  {"id":"v-040","vec":[-0.2149,0.4457,-0.1697,0.1996,-0.2995,0.4266,0.4096,0.4971]},
  {"id":"v-041","vec":[0.037,-0.7091,-0.1354,0.5221,0.3709,0.0996,0.0399,-0.2362]},
  {"id":"v-042","vec":[-0.2189,-0.3552,-0.1826,-0.0783,0.6333,-0.6155,0.0807,0.0097]},
  {"id":"v-043","vec":[-0.4081,-0.2889,-0.1213,0.1284,0.1828,-0.7268,-0.2551,-0.3034]},
  {"id":"v-044","vec":[0.4088,-0.5557,-0.1481,0.144,0.1677,-0.628,-0.1016,-0.2203]},
  {"id":"v-045","vec":[-0.1703,-0.001,0.629,0.1638,0.3435,-0.2179,0.0542,-0.6165]},
  {"id":"v-046","vec":[-0.1263,-0.2358,0.4456,0.4918,-0.0265,-0.4637,-0.4515,-0.2617]},
  {"id":"v-047","vec":[0.025,0.1679,0.6092,0.1902,0.1582,-0.0828,-0.5583,-0.4694]},
  {"id":"v-048","vec":[0.2668,-0.0164,-0.1192,0.0058,0.6508,-0.5958,0.3672,0.0305]},
  {"id":"v-049","vec":[-0.4849,-0.464,-0.2541,-0.1026,0.1984,-0.6286,0.0275,0.198]},
  {"id":"v-050","vec":[0.396,-0.2446,0.3477,0.4437,-0.1715,-0.5833,-0.2137,-0.2244]},
  {"id":"v-051","vec":[0.1584,-0.65,0.5509,0.1957,-0.1607,-0.2454,-0.353,-0.0001]},
  {"id":"v-052","vec":[0.1577,-0.1488,-0.1735,-0.2739,0.4284,-0.0907,-0.2398,-0.7737]},
  {"id":"v-053","vec":[-0.3919,-0.1278,0.0781,0.1976,0.665,-0.1005,-0.2141,-0.5355]},
  {"id":"v-054","vec":[-0.5066,0.3221,0.6204,0.0885,0.418,0.2277,-0.0044,0.1424]},
  {"id":"v-055","vec":[-0.0319,-0.4399,0.5846,0.4407,-0.0924,-0.3921,0.3239,0.048]},
  {"id":"v-056","vec":[-0.088,-0.3655,0.0014,0.6162,0.203,-0.3576,-0.2488,-0.498]},
  {"id":"v-057","vec":[-0.1161,-0.4114,0.499,0.2353,0.5482,-0.3098,0.2871,-0.1842]},
  {"id":"v-058","vec":[0.1316,0.0421,-0.1091,0.5341,0.6657,0.3149,-0.3386,-0.1638]},
  {"id":"v-059","vec":[-0.5397,-0.2344,0.4226,-0.1866,0.2518,-0.374,-0.4869,0.0008]},
  {"id":"v-060","vec":[-0.1106,-0.6017,0.3287,0.4898,0.3326,-0.2259,0.3403,-0.019]},
  {"id":"v-061","vec":[0.4524,0.2139,0.3383,0.4769,-0.3438,0.4808,-0.2053,-0.1274]},
  {"id":"v-062","vec":[-0.23,0.4665,-0.3497,-0.2106,-0.5666,-0.3165,-0.2601,-0.272]},
  {"id":"v-063","vec":[0.365,-0.166,0.7932,-0.1136,0.0133,-0.1789,-0.4055,-0.0245]},
  {"id":"v-064","vec":[0.2309,0.3839,0.1884,0.0753,-0.5515,0.2714,-0.592,0.1726]},
  {"id":"v-065","vec":[0.6916,-0.2773,0.5447,-0.2501,0.1606,0.2305,0.03,0.076]},
  {"id":"v-066","vec":[-0.1269,-0.4205,0.2268,0.2113,-0.7086,-0.1577,0.0791,-0.4216]},
  {"id":"v-067","vec":[-0.2382,-0.1904,-0.1581,0.1905,0.0749,-0.4831,-0.6225,-0.4682]},
  {"id":"v-068","vec":[0.2685,0.1894,0.3106,-0.0374,-0.3487,0.3815,-0.6118,-0.3907]},
  {"id":"v-069","vec":[0.1024,0.0536,-0.1626,-0.3259,-0.8419,0.1006,-0.2097,-0.302]},
  {"id":"v-070","vec":[-0.1206,-0.1814,-0.2527,0.13,-0.7314,0.3352,-0.4545,0.1338]},
  {"id":"v-071","vec":[0.5183,0.0581,0.2936,0.1702,0.0288,0.3958,-0.652,0.1739]},
  {"id":"v-072","vec":[0.1639,0.0351,-0.2112,-0.4754,-0.0811,-0.5826,-0.5467,-0.2377]},
  {"id":"v-073","vec":[0.5125,-0.1675,0.0021,-0.2926,-0.6927,0.0969,0.0729,0.3594]},
  {"id":"v-074","vec":[0.1733,0.4068,0.3532,-0.2887,-0.5489,0.4178,-0.2516,0.2391]},
  {"id":"v-075","vec":[0.3483,-0.0716,0.1961,-0.0995,-0.5636,0.0278,-0.505,-0.5018]},
  {"id":"v-076","vec":[0.4244,0.1578,-0.0186,0.5402,-0.5724,-0.262,-0.3253,0.0275]},
  {"id":"v-077","vec":[0.495,-0.2161,0.2916,0.4681,-0.4599,-0.223,-0.2893,0.2433]},
  {"id":"v-078","vec":[0.8502,0.1568,0.3518,-0.2435,-0.2029,0.1366,0.0367,0.0919]},
  {"id":"v-079","vec":[-0.2929,0.3741,0.0121,-0.1633,-0.0198,0.5046,-0.6975,0.0773]},
  {"id":"v-080","vec":[0.431,-0.2001,-0.2701,0.085,-0.3744,0.3275,-0.5048,-0.438]},
  {"id":"v-081","vec":[-0.2741,0.095,-0.4434,-0.2081,-0.1246,-0.4993,0.5043,-0.3959]},
  {"id":"v-082","vec":[0.1144,0.3317,-0.5282,-0.4488,0.3637,0.2445,0.2544,-0.3737]},
  {"id":"v-083","vec":[0.0421,0.4779,-0.7224,-0.0049,-0.13,0.0941,-0.1976,0.4279]},
  {"id":"v-084","vec":[0.5957,0.2278,0.171,0.0032,-0.0215,-0.4145,-0.3571,-0.514]},
  {"id":"v-085","vec":[0.123,-0.0247,-0.5994,-0.6408,0.3567,0.2472,-0.0453,-0.1544]},
  {"id":"v-086","vec":[0.1497,0.2882,-0.1217,-0.5449,0.6425,-0.2008,0.2674,-0.2413]},
  {"id":"v-087","vec":[0.0209,-0.3666,-0.6171,-0.4896,0.4506,0.1969,0.0408,-0.0345]},
  {"id":"v-088","vec":[0.233,-0.4082,-0.488,-0.622,-0.1995,-0.1654,-0.2003,0.2166]},
  {"id":"v-089","vec":[-0.1285,0.2694,-0.4763,-0.5925,-0.245,-0.4799,0.0228,0.2053]},
  {"id":"v-090","vec":[-0.2275,0.2949,-0.0795,-0.5883,0.5545,0.0581,-0.2354,-0.3776]},
  {"id":"v-091","vec":[-0.1117,-0.1266,0.121,-0.4789,0.1471,-0.3772,0.644,-0.3859]},
  {"id":"v-092","vec":[0.4518,0.1734,-0.5764,-0.5297,0.2701,-0.1553,-0.1642,0.1703]},
  {"id":"v-093","vec":[0.0814,-0.4637,-0.2816,-0.3825,-0.1012,0.2091,0.5714,-0.4152]},
  {"id":"v-094","vec":[0.4735,0.3393,0.0089,-0.6311,0.3832,-0.3378,0.0355,-0.0124]},
  {"id":"v-095","vec":[-0.148,-0.2831,-0.6499,-0.4874,-0.0539,-0.3552,0.3297,-0.0152]},
  {"id":"v-096","vec":[0.2574,0.0296,-0.064,-0.7957,0.033,0.2809,0.4465,0.1276]},
  {"id":"v-097","vec":[-0.0552,0.4427,-0.3851,0.0317,-0.2626,-0.3434,0.4927,0.4712]},
  {"id":"v-098","vec":[-0.4208,-0.3411,-0.0762,-0.6192,0.3496,-0.3013,-0.2274,-0.2294]},
  {"id":"v-099","vec":[0.4031,0.2103,-0.346,-0.5563,-0.2285,-0.1688,0.4225,-0.3238]},
  {"id":"v-100","vec":[0.1713,0.0594,-0.482,-0.6309,0.4141,-0.3888,-0.0269,-0.1158]},
  {"id":"v-101","vec":[-0.2442,-0.0519,0.5387,0.0236,0.1742,0.1109,0.6733,0.3887]},
  {"id":"v-102","vec":[0.5153,0.1643,0.6202,0.3017,-0.3483,0.2164,0.0788,-0.2395]},
  {"id":"v-103","vec":[0.5961,-0.114,-0.0422,-0.3608,-0.1296,0.6542,-0.0208,-0.2335]},
  {"id":"v-104","vec":[0.2655,0.2594,0.118,-0.484,0.1864,0.5569,-0.0415,0.5171]},
  {"id":"v-105","vec":[0.3561,0.5518,0.2003,-0.5417,0.4565,-0.0364,0.1164,-0.1086]},
  {"id":"v-106","vec":[-0.1789,0.1252,-0.1717,0.1135,-0.1736,0.6519,0.3553,0.5732]},
  {"id":"v-107","vec":[0.3373,0.4931,0.1197,0.0457,0.5465,0.4556,0.3062,-0.1633]},
  {"id":"v-108","vec":[-0.3277,-0.2014,0.1969,-0.2592,-0.2891,0.4541,0.2529,0.6264]},
  {"id":"v-109","vec":[0.213,-0.1746,0.4017,-0.5348,0.2449,0.4092,-0.1904,0.4617]},
  {"id":"v-110","vec":[0.4616,0.1979,-0.3086,0.208,-0.2555,0.6322,0.3698,-0.0865]},
  {"id":"v-111","vec":[-0.1661,0.4996,0.3022,-0.003,0.4123,0.4938,0.4665,-0.0103]},
  {"id":"v-112","vec":[0.5864,-0.159,-0.5194,-0.3028,-0.3092,-0.2345,0.1969,-0.283]},
  {"id":"v-113","vec":[0.4168,0.1162,0.2163,-0.0161,0.6231,0.319,-0.2739,0.4479]},
  {"id":"v-114","vec":[0.07,-0.0189,0.5702,0.0189,0.6232,0.1073,0.5189,0.0112]},
  {"id":"v-115","vec":[-0.021,-0.0507,0.0666,-0.4153,0.4996,0.5435,0.2078,0.4816]},
  {"id":"v-116","vec":[-0.357,0.5551,0.0135,-0.648,0.3627,0.0813,-0.0125,-0.077]},
  {"id":"v-117","vec":[0.169,0.091,-0.1451,-0.1089,0.3658,0.4212,0.6213,0.4827]},
  {"id":"v-118","vec":[0.3213,0.0114,0.3788,-0.4435,0.4795,0.3824,0.4244,-0.013]},
  {"id":"v-119","vec":[0.1641,0.4969,-0.3673,0.1968,0.0239,-0.2103,0.7118,-0.0319]},
  {"id":"v-120","vec":[0.3343,0.1863,-0.1171,-0.3623,0.3834,0.4019,0.5113,0.3724]}
]

=============== FILE: data/queries.json ===============

[
  {"id":"q-01","vec":[0.0002,-0.4883,-0.0132,-0.6553,0.4056,0.0535,0.2558,0.315]},
  {"id":"q-02","vec":[-0.0336,-0.3322,-0.2861,-0.2487,0.4983,-0.2048,-0.6677,0.0937]},
  {"id":"q-03","vec":[0.4075,0.0578,-0.5429,-0.69,-0.1269,0.1751,0.1057,-0.0428]},
  {"id":"q-04","vec":[-0.0901,-0.476,-0.4743,0.2978,0.6578,0.0063,0.1372,-0.0071]},
  {"id":"q-05","vec":[0.4225,0.5468,0.5746,-0.237,0.1822,-0.2933,-0.0272,0.1273]},
  {"id":"q-06","vec":[0.4519,-0.1715,0.4615,-0.0797,0.1303,-0.315,0.3484,0.5563]},
  {"id":"q-07","vec":[0.1113,0.3678,0.1087,0.6091,-0.3476,0.4233,-0.3589,0.2018]},
  {"id":"q-08","vec":[0.3087,-0.2027,-0.0679,0.4711,-0.5359,0.4577,0.0067,0.3745]},
  {"id":"q-09","vec":[-0.1355,-0.3302,0.4904,0.5877,0.3092,-0.3918,0.193,-0.0188]},
  {"id":"q-10","vec":[0.4087,-0.544,0.565,0.1635,-0.0476,0.2176,0.3469,-0.1453]},
  {"id":"q-11","vec":[-0.4786,-0.3185,-0.2112,-0.0679,0.604,0.1881,0.4116,0.2253]},
  {"id":"q-12","vec":[0.2277,0.2389,-0.2102,-0.3421,0.4674,-0.5742,0.2745,-0.326]},
  {"id":"q-13","vec":[0.2732,0.1722,0.3527,0.505,-0.0899,-0.0407,-0.6806,0.208]},
  {"id":"q-14","vec":[-0.2813,-0.2482,-0.5108,0.5551,-0.2808,0.3859,-0.1965,-0.1542]},
  {"id":"q-15","vec":[-0.2968,0.0554,-0.3901,-0.2599,-0.1756,0.2352,-0.4205,-0.6528]},
  {"id":"q-16","vec":[0.0129,0.2383,0.4833,-0.2242,-0.3104,0.5847,-0.4209,0.2093]},
  {"id":"q-17","vec":[0.1352,0.1718,-0.013,-0.6841,0.4701,-0.4182,0.2605,0.1428]},
  {"id":"q-18","vec":[0.3373,-0.2543,-0.4642,-0.5492,0.3196,-0.4269,0.0633,-0.1271]},
  {"id":"q-19","vec":[0.7151,-0.3575,0.0301,-0.0593,-0.3934,0.0137,0.0116,-0.4486]},
  {"id":"q-20","vec":[0.4247,0.3512,-0.5732,0.0552,-0.0822,-0.4372,0.2022,0.3549]},
  {"id":"q-21","vec":[0.2389,0.1866,0.0591,-0.2374,0.1284,0.4632,0.6706,0.4093]},
  {"id":"q-22","vec":[0.2089,0.1381,-0.3314,-0.4646,-0.016,0.1626,0.3804,0.6635]},
  {"id":"q-23","vec":[-0.4541,-0.1779,0.4555,-0.5736,0.1313,0.4551,-0.0126,0.0339]},
  {"id":"q-24","vec":[-0.195,0.0205,0.0315,-0.1286,-0.166,0.6492,0.5923,0.3798]}
]

=============== FILE: bench/queries.json ===============

[
  {"id":"q-01","vec":[0.0002,-0.4883,-0.0132,-0.6553,0.4056,0.0535,0.2558,0.315]},
  {"id":"q-03","vec":[0.4075,0.0578,-0.5429,-0.69,-0.1269,0.1751,0.1057,-0.0428]},
  {"id":"q-07","vec":[0.1113,0.3678,0.1087,0.6091,-0.3476,0.4233,-0.3589,0.2018]},
  {"id":"q-08","vec":[0.3087,-0.2027,-0.0679,0.4711,-0.5359,0.4577,0.0067,0.3745]},
  {"id":"q-09","vec":[-0.1355,-0.3302,0.4904,0.5877,0.3092,-0.3918,0.193,-0.0188]},
  {"id":"q-12","vec":[0.2277,0.2389,-0.2102,-0.3421,0.4674,-0.5742,0.2745,-0.326]},
  {"id":"q-13","vec":[0.2732,0.1722,0.3527,0.505,-0.0899,-0.0407,-0.6806,0.208]},
  {"id":"q-14","vec":[-0.2813,-0.2482,-0.5108,0.5551,-0.2808,0.3859,-0.1965,-0.1542]}
]

=============== FILE: src/graphIndex.js ===============

'use strict';

// Model of the vendor's graph index, written from their documentation.
// createIndex({ M }) fixes how many neighbours each node keeps when the graph
// is built. search(vec, { k, ef }) walks the graph from a fixed entry point,
// keeping a working set of ef candidates and scoring each node it reaches.
function dot(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s; }
function norm(v) { return Math.sqrt(dot(v, v)); }
function cosine(a, b) { const d = norm(a) * norm(b); return d === 0 ? 0 : dot(a, b) / d; }

function createIndex({ M = 16 } = {}) {
  const points = [];
  const links = [];
  let comparisons = 0;
  const maxDegree = M * 2;

  function connect(i) {
    const scored = [];
    for (let j = 0; j < i; j++) scored.push([j, cosine(points[i].vec, points[j].vec)]);
    scored.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const chosen = scored.slice(0, M).map(([j]) => j);
    links[i] = chosen.slice();
    for (const j of chosen) {
      if (!links[j].includes(i)) links[j].push(i);
      if (links[j].length > maxDegree) {
        const re = links[j]
          .map((x) => [x, cosine(points[j].vec, points[x].vec)])
          .sort((a, b) => b[1] - a[1] || a[0] - b[0])
          .slice(0, maxDegree)
          .map(([x]) => x);
        links[j] = re;
      }
    }
  }

  return {
    degree: () => M,
    size: () => points.length,
    comparisons: () => comparisons,
    resetCounters: () => { comparisons = 0; },
    add(id, vec) {
      points.push({ id, vec });
      links.push([]);
      const i = points.length - 1;
      if (i > 0) connect(i);
      return true;
    },
    search(queryVec, { k = 10, ef = 24 } = {}) {
      if (points.length === 0) return [];
      const visited = new Set([0]);
      comparisons += 1;
      const seen = [[0, cosine(queryVec, points[0].vec)]];
      const frontier = [[0, seen[0][1]]];
      while (frontier.length) {
        frontier.sort((a, b) => b[1] - a[1]);
        const [cur, curScore] = frontier.shift();
        seen.sort((a, b) => b[1] - a[1]);
        const worst = seen.length >= ef ? seen[Math.min(ef, seen.length) - 1][1] : -Infinity;
        if (curScore < worst) break;
        for (const nb of links[cur]) {
          if (visited.has(nb)) continue;
          visited.add(nb);
          comparisons += 1;
          const s = cosine(queryVec, points[nb].vec);
          seen.push([nb, s]);
          seen.sort((a, b) => b[1] - a[1]);
          if (seen.length > ef) seen.length = ef;
          if (s > worst || seen.length < ef) frontier.push([nb, s]);
        }
      }
      seen.sort((a, b) => b[1] - a[1]);
      return seen.slice(0, k).map(([i]) => points[i].id);
    },
  };
}

module.exports = { createIndex, cosine, dot, norm };

=============== FILE: src/recall.js ===============

'use strict';

const { cosine } = require('./graphIndex');

// Reference answer for each query: every point in the corpus, exactly scored.
function referenceTopK(corpus, queries, k = 10) {
  return queries.map((q) =>
    corpus
      .map((p) => [p.id, cosine(q.vec, p.vec)])
      .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
      .slice(0, k)
      .map(([id]) => id)
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

module.exports = { referenceTopK, recallAtK };

=============== FILE: src/search.js ===============

'use strict';

const { createIndex } = require('./graphIndex');
const config = require('../config/search.json');

function buildIndex(corpus) {
  const index = createIndex({ M: config.index.M });
  for (const point of corpus) index.add(point.id, point.vec);
  return index;
}

function runQueries(index, queries) {
  return queries.map((q) => index.search(q.vec, { k: config.query.k, ef: config.query.ef }));
}

module.exports = { buildIndex, runQueries, config };

=============== FILE: bench/sweep.js ===============

'use strict';

const corpus = require('../data/corpus.json');
const queries = require('./queries.json');
const { createIndex } = require('../src/graphIndex');
const { referenceTopK, recallAtK } = require('../src/recall');
const config = require('../config/search.json');

const GRID = [12, 16, 24, 32, 48, 64, 96, 128, 192, 256];

function build() {
  const index = createIndex({ M: config.index.M });
  for (const point of corpus) index.add(point.id, point.vec);
  return index;
}

const truth = referenceTopK(corpus, queries, config.query.k);

console.log('ef\trecall@10\tcomparisons/query');
for (const ef of GRID) {
  const index = build();
  index.resetCounters();
  const retrieved = queries.map((q) => index.search(q.vec, { k: config.query.k, efSearch: ef }));
  const recall = recallAtK(retrieved, truth);
  console.log(`${ef}\t${recall.toFixed(3)}\t\t${(index.comparisons() / queries.length).toFixed(1)}`);
}

=============== FILE: test/graphIndex.test.js ===============

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { createIndex, cosine } = require('../src/graphIndex');

const points = [
  ['p1', [1, 0, 0, 0]],
  ['p2', [0.98, 0.2, 0, 0]],
  ['p3', [0.9, 0.44, 0, 0]],
  ['p4', [0, 1, 0, 0]],
  ['p5', [0, 0, 1, 0]],
  ['p6', [0, 0, 0, 1]],
];
const build = (M = 4) => {
  const index = createIndex({ M });
  for (const [id, vec] of points) index.add(id, vec);
  return index;
};

test('every added point is stored', () => {
  assert.equal(build().size(), 6);
});

test('a wide walk finds the exact nearest neighbour', () => {
  assert.equal(build().search([1, 0, 0, 0], { k: 1, ef: 32 })[0], 'p1');
});

test('k bounds the number of results', () => {
  assert.equal(build().search([1, 0, 0, 0], { k: 3, ef: 32 }).length, 3);
});

test('a narrower walk scores fewer points than a wider one', () => {
  const ring = createIndex({ M: 3 });
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    ring.add(`r${i}`, [Math.cos(a), Math.sin(a), 0, 0]);
  }
  ring.resetCounters();
  ring.search([1, 0, 0, 0], { k: 5, ef: 4 });
  const narrow = ring.comparisons();
  ring.resetCounters();
  ring.search([1, 0, 0, 0], { k: 5, ef: 40 });
  assert.ok(narrow < ring.comparisons(), 'ef should change how much work a query does');
});

test('M is fixed when the index is created', () => {
  assert.equal(build(4).degree(), 4);
  assert.equal(build(8).degree(), 8);
});

test('cosine ignores magnitude', () => {
  assert.ok(Math.abs(cosine([3, 0], [0.5, 0]) - 1) < 1e-12);
});

=============== FILE: reports/inc-3904.md ===============

# INC-3904 and the cost gate that is now failing

## How we got here

| When       | What                                                                    |
|------------|-------------------------------------------------------------------------|
| 2026-08-02 | Relevance complaints from two enterprise accounts. On-call raised `query.ef` from 24 to 256 in `config/search.json`, complaints stopped within the hour, value pinned. |
| 2026-08-02 | Eight of the searches from those tickets were saved so the fix could be replayed. |
| 2026-09-09 | Search tier p95 crossed its 40 ms budget for the first time.             |
| 2026-09-12 | The cost gate has been failing for four days. Release is blocked.        |

## The two gates a shipped config has to clear

- **Quality:** recall@10 at or above **0.96** over the saved query set.
- **Cost:** at or below **60 comparisons per query**. Profiling shows p95 is
  very nearly linear in comparisons, so ops made comparisons the gate because
  it is deterministic in CI and wall-clock is not.

Production, at the pinned `ef` of 256, is measuring **120.0 comparisons per
query**. Double the gate. Nobody has produced a recall figure for production.

## Tom's sweep

`npm run sweep`, run this morning:

    ef      recall@10       comparisons/query
    12      1.000           61.0
    16      1.000           61.0
    24      1.000           61.0
    32      1.000           61.0
    48      1.000           61.0
    64      1.000           61.0
    96      1.000           61.0
    128     1.000           61.0
    192     1.000           61.0
    256     1.000           61.0

> Ten widths, same recall, same cost. `ef` does nothing on our data. That means
> 256 is not what is costing us and changing it will not help - we should leave
> the config alone and move the tier onto the larger instance type.

## Nadia's counter-proposal

> Before the August incident we ran at 24 and nobody complained, and during the
> replay 12 was already clean. Put `ef` back to 12, take the win on cost, and
> if anyone complains we will hear about it.

## What is needed

One value, shipped, with the evidence that it clears both gates - and an answer
to Tom and Nadia that is better than "I disagree".
