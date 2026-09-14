# Branch `feat/house-rules` - M. Fuentes, 2026-09-09

The rule has been a wiki page since launch and nothing has ever checked it.
This is forty lines, runs in milliseconds and costs nothing, which matters
given what else is in Achebe's memo.

Ran it over the eight replies the leads marked:

```
$ python -m eval.house_rules --replies reports/house-rule-replies.md
1 pass
2 pass
3 pass
4 pass
5 fail
6 pass
7 fail
8 pass
score 0.75
```

It lines up with the leads everywhere except #5, and #5 only fails because the
reply contains the word "discount" while refusing to give one. One exclusion
and that is gone. The word list is easy to extend and I will add terms as we
see them.

Waiting on a review.
